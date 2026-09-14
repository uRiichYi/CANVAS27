from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import shutil
import os

from database import engine, Base, get_db
from models import Artist

# Crea las tablas en MySQL si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Canvas 27 API")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Crear carpeta para guardar imágenes localmente (para desarrollo)
os.makedirs("uploads/avatars", exist_ok=True)

# ---------------------------------------------------------
# ENDPOINT 1: Registro Inicial (Solo temporales y credenciales)
# ---------------------------------------------------------
@app.post("/register")
def register_artist(email: str = Form(...), password: str = Form(...), temp_name: str = Form(None), db: Session = Depends(get_db)):
    
    # Verificar si el correo ya existe
    db_artist = db.query(Artist).filter(Artist.email == email).first()
    if db_artist:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    # Hashear contraseña y guardar
    hashed_password = pwd_context.hash(password)
    new_artist = Artist(
        email=email, 
        password_hash=hashed_password, 
        temp_name=temp_name
    )
    
    db.add(new_artist)
    db.commit()
    db.refresh(new_artist)
    
    return {"message": "Registro inicial exitoso", "artist_id": new_artist.id}

# ---------------------------------------------------------
# ENDPOINT 2: SetupProfile (Guarda la info definitiva y la foto)
# ---------------------------------------------------------
@app.post("/setup-profile")
def setup_profile(
    email: str = Form(...), 
    full_name: str = Form(...), 
    bio: str = Form(""), 
    avatar: UploadFile = File(None), 
    db: Session = Depends(get_db)
):
    
    artist = db.query(Artist).filter(Artist.email == email).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artista no encontrado")

    # Manejo de la subida de imagen
    avatar_path = None
    if avatar:
        file_location = f"uploads/avatars/{email}_{avatar.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
        avatar_path = file_location # En producción, aquí guardarías la URL de S3 o Cloudinary

    # Actualizar el registro en la base de datos
    artist.full_name = full_name
    artist.bio = bio
    if avatar_path:
        artist.avatar_url = avatar_path
        
    db.commit()
    db.refresh(artist)
    
    return {"message": "Perfil configurado exitosamente", "artist_name": artist.full_name}