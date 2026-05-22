from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Cambia 'root' y 'password' por tus credenciales de MySQL locales
URL_BASE_DATOS = "mysql+pymysql://root:@localhost:3306/canvas27"

engine = create_engine(URL_BASE_DATOS)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()