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

# Crea las tablas si no existen en PostgreSQL/Supabase
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Canvas 27 API")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de almacenamiento local
UPLOAD_ROOT = Path(__file__).resolve().parent / "uploads"
AVATAR_DIR = UPLOAD_ROOT / "avatars"
PHOTO_DIR = UPLOAD_ROOT / "photos"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
PHOTO_DIR.mkdir(parents=True, exist_ok=True)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servidor de archivos estáticos para previsualizaciones
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


# Schemas Pydantic
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


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


def _is_image_upload(upload: UploadFile) -> bool:
    content_type = (upload.content_type or "").lower()
    if content_type.startswith("image/"):
        return True
    if content_type in ("", "application/octet-stream"):
        name = (upload.filename or "").lower()
        return name.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))
    return False


# ---------------------------------------------------------
# ENDPOINT 1: Registro de Usuarios (Formato JSON)
# ---------------------------------------------------------
@app.post("/api/register")
def register_artist(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    name = payload.full_name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="El nombre de artista es obligatorio")

    db_artist = db.query(Artist).filter(Artist.email == email).first()
    if db_artist:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    hashed_password = pwd_context.hash(payload.password)
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
# ENDPOINT 2: SetupProfile (Opcional para actualizar foto)
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
# ENDPOINT 3: Inicio de sesión
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
# ENDPOINT 4: Subida de fotos de la Galería
# ---------------------------------------------------------
@app.post("/api/photos")
async def upload_photo(
    request: Request,
    file: UploadFile = File(...),
    title: str | None = Form(None),
    db: Session = Depends(get_db),
):
    artist = get_artist_from_token(request.headers.get("Authorization"), db)

    if not _is_image_upload(file):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida")

    extension = Path(file.filename or "artwork.jpg").suffix.lower()
    if extension not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        extension = ".jpg"

    safe_name = f"{artist.id}_{uuid.uuid4().hex}{extension}"
    destination = PHOTO_DIR / safe_name

    file.file.seek(0)
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    if not destination.exists() or destination.stat().st_size == 0:
        raise HTTPException(status_code=400, detail="La imagen llegó vacía al servidor")

    relative_path = f"photos/{safe_name}"
    record = Photo(
        artist_id=artist.id,
        title=title.strip() if title else None,
        file_path=relative_path,
        latitude=None,
        longitude=None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Obra guardada correctamente",
        "photo": {
            "id": record.id,
            "title": record.title,
            "file_path": record.file_path,
            "url": f"/uploads/{record.file_path}",
        },
    }


# ---------------------------------------------------------
# ENDPOINT 5: Galería Dinámica
# ---------------------------------------------------------
@app.get("/api/photos/gallery")
def list_gallery_photos(db: Session = Depends(get_db)):
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
                "url": f"/uploads/{photo.file_path}",
                "created_at": photo.created_at.isoformat() if photo.created_at else None,
                "artist_name": artist.full_name or artist.temp_name or artist.email,
            }
        )
    return {"photos": photos, "count": len(photos)}