import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Carga las variables desde el archivo .env
load_dotenv()

# Lee la variable de entorno; falla si no existe la variable
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("La variable DATABASE_URL no está configurada en el archivo .env")

# Se agrega prepared_statement_cache_size=0 para evitar conflictos con el Session Pooler de Supabase en port 6543/5432
engine = create_engine(
    DATABASE_URL,
    connect_args={"prepared_statement_cache_size": 0}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Generador de sesiones para las dependencias (Depends) de FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()