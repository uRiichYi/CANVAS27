from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base

class Artist(Base):
    __tablename__ = "artists"

    id = Column(Integer, primary_key=True, index=True)
    temp_name = Column(String(100), nullable=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Datos del SetupProfile
    full_name = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())