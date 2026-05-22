# Canvas 27

Proyecto basado en un frontendn hecho por mi con login web, captura por cámara y API Python (FastAPI) + MySQL. (DESARROLLO DE IA con CURSOR)

## Estructura

```
CANVAS27/
├── Archivos/              # Copia de referencia original
├── index.html             # Inicio
├── gallery.html           # Galería
├── register.html          # Registro (nombre + correo + contraseña)
├── login.html             # Inicio de sesión
├── capture.html           # Cámara y subida
├── galleryStyles.css
├── css/styles.css         # style.css de Archivos + estilos login/captura
├── js/
│   ├── app.js             # Login, cámara, API
│   └── Register.js        # Registro en un paso (vanilla JS)
├── backend/
│   ├── main.py            # register, login, photos, galería
│   ├── database.py
│   ├── models.py
│   └── schema.sql
└── uploads/
    ├── avatars/
    └── photos/
```

## Backend (desde Archivos + extensiones)

- `POST /register` — nombre de artista, correo y contraseña
- `POST /api/login` — inicio de sesión
- `POST /api/photos` — subida de capturas
- `GET /api/photos/gallery` — fotos para la galería web

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Frontend

```bash
python -m http.server 5500
```

1. Regístrate en `register.html` (nombre de artista + correo + contraseña).
2. Inicia sesión en `login.html`.
3. Captura y sube en `capture.html`; revisa la galería.

`API_BASE_URL` en `js/app.js` → `http://127.0.0.1:8000`

## MySQL

```bash
mysql -u root -p < backend/schema.sql
```

Credenciales en `backend/database.py` (`URL_BASE_DATOS`).
