from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base

class Artist(Base):
    __tablename__ = "artists"

    # BigInteger o Integer para coincidir con bigint generated as identity
    id = Column(BigInteger, primary_key=True, index=True)
    temp_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación uno-a-muchos con la tabla Photos
    photos = relationship("Photo", back_populates="artist", cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(BigInteger, primary_key=True, index=True)
    artist_id = Column(BigInteger, ForeignKey("artists.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=True)
    file_path = Column(String, nullable=False)
    latitude = Column(String, nullable=True)
    longitude = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación inversa
    artist = relationship("Artist", back_populates="photos")