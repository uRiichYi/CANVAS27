from database import SessionLocal
from models import Artist

db = SessionLocal()

try:
    # Consulta simple para contar registros en la tabla artists
    count = db.query(Artist).count()
    print(f"¡Conexión exitosa a Supabase! Total de artistas registrados: {count}")
finally:
    db.close()