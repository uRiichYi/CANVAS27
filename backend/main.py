import shutil
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Artist, Photo

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Canvas 27 API")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
AVATAR_DIR = UPLOAD_ROOT / "avatars"
PHOTO_DIR = UPLOAD_ROOT / "photos"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
PHOTO_DIR.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def get_artist_from_token(authorization: str | None, db: Session) -> Artist:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado")

    token = authorization.split(" ", 1)[1]
    if not token.startswith("artist-"):
        raise HTTPException(status_code=401, detail="Token inválido")

    try:
        artist_id = int(token.replace("artist-", "", 1))
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido") from None

    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=401, detail="Artista no encontrado")
    return artist


# ---------------------------------------------------------
# ENDPOINT 1: Registro Inicial (Solo temporales y credenciales)
# ---------------------------------------------------------
def _is_image_upload(upload: UploadFile) -> bool:
    content_type = (upload.content_type or "").lower()
    if content_type.startswith("image/"):
        return True
    if content_type in ("", "application/octet-stream"):
        name = (upload.filename or "").lower()
        return name.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))
    return False


@app.post("/register")
def register_artist(
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    temp_name: str = Form(None),
    db: Session = Depends(get_db),
):
    email = email.strip().lower()
    name = full_name.strip() or (temp_name.strip() if temp_name else "")
    if not name:
        raise HTTPException(status_code=400, detail="El nombre de artista es obligatorio")

    db_artist = db.query(Artist).filter(Artist.email == email).first()
    if db_artist:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    hashed_password = pwd_context.hash(password)
    new_artist = Artist(
        email=email,
        password_hash=hashed_password,
        full_name=name,
        temp_name=None,
    )

    db.add(new_artist)
    db.commit()
    db.refresh(new_artist)

    return {
        "message": "Cuenta creada correctamente",
        "artist_id": new_artist.id,
        "full_name": new_artist.full_name,
    }


# ---------------------------------------------------------
# ENDPOINT 2: SetupProfile (Guarda la info definitiva y la foto)
# ---------------------------------------------------------
@app.post("/setup-profile")
def setup_profile(
    email: str = Form(...),
    full_name: str = Form(...),
    bio: str = Form(""),
    avatar: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    artist = db.query(Artist).filter(Artist.email == email).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artista no encontrado")

    avatar_path = None
    if avatar:
        file_location = AVATAR_DIR / f"{email}_{avatar.filename}"
        with file_location.open("wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
        avatar_path = f"avatars/{file_location.name}"

    artist.full_name = full_name
    artist.bio = bio
    if avatar_path:
        artist.avatar_url = avatar_path

    db.commit()
    db.refresh(artist)

    return {"message": "Perfil configurado exitosamente", "artist_name": artist.full_name}


# ---------------------------------------------------------
# ENDPOINT 3: Inicio de sesión (validación web)
# ---------------------------------------------------------
@app.post("/api/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.email == payload.email.lower()).first()
    if not artist or not pwd_context.verify(payload.password, artist.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    return {
        "access_token": f"artist-{artist.id}",
        "token_type": "bearer",
        "user": {
            "id": artist.id,
            "email": artist.email,
            "full_name": artist.full_name,
        },
    }


# ---------------------------------------------------------
# ENDPOINT 4: Subida de foto desde la cámara web
# ---------------------------------------------------------
@app.post("/api/photos")
async def upload_photo(
    request: Request,
    photo: UploadFile = File(...),
    title: str | None = Form(None),
    latitude: str | None = Form(None),
    longitude: str | None = Form(None),
    db: Session = Depends(get_db),
):
    artist = get_artist_from_token(request.headers.get("Authorization"), db)

    if not _is_image_upload(photo):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    extension = Path(photo.filename or "capture.jpg").suffix.lower()
    if extension not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        extension = ".jpg"

    safe_name = f"{artist.id}_{uuid.uuid4().hex}{extension}"
    destination = PHOTO_DIR / safe_name

    photo.file.seek(0)
    with destination.open("wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    if not destination.exists() or destination.stat().st_size == 0:
        raise HTTPException(status_code=400, detail="La imagen llegó vacía al servidor")

    relative_path = f"photos/{safe_name}"
    record = Photo(
        artist_id=artist.id,
        title=title.strip() if title else None,
        file_path=relative_path,
        latitude=latitude.strip() if latitude else None,
        longitude=longitude.strip() if longitude else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Foto guardada correctamente",
        "photo": {
            "id": record.id,
            "title": record.title,
            "file_path": record.file_path,
            "latitude": record.latitude,
            "longitude": record.longitude,
            "url": f"/uploads/{record.file_path}",
        },
    }


@app.get("/api/photos/gallery")
def list_gallery_photos(db: Session = Depends(get_db)):
    """Lista todas las fotos subidas para mostrar en la galería web."""
    rows = (
        db.query(Photo, Artist)
        .join(Artist, Photo.artist_id == Artist.id)
        .order_by(Photo.created_at.desc())
        .all()
    )
    photos = []
    for photo, artist in rows:
        photos.append(
            {
                "id": photo.id,
                "title": photo.title or "Sin título",
                "file_path": photo.file_path,
                "latitude": photo.latitude,
                "longitude": photo.longitude,
                "url": f"/uploads/{photo.file_path}",
                "created_at": photo.created_at.isoformat() if photo.created_at else None,
                "artist_name": artist.full_name or artist.temp_name or artist.email,
            }
        )
    return {"photos": photos, "count": len(photos)}
