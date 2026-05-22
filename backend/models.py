from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy.sql import func

class Artist(Base):
    __tablename__ = "artists"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    temp_name = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    # La relación hacia las fotos
    photos = relationship("Photo", back_populates="artist")

class Photo(Base):
    __tablename__ = "photos"
    id = Column(Integer, primary_key=True, index=True)
    
    # ESTA LÍNEA ES LA CLAVE: El ForeignKey que vincula la foto con el artista
    artist_id = Column(Integer, ForeignKey("artists.id"))
    
    title = Column(String, nullable=True)
    file_path = Column(String)
    latitude = Column(String, nullable=True)
    longitude = Column(String, nullable=True)

    # La relación de vuelta al artista
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    artist = relationship("Artist", back_populates="photos")