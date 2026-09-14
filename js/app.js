/**
 * Canvas 27 — Frontend (JavaScript vanilla)
 */
const API_BASE_URL = 'http://127.0.0.1:8000';
window.API_BASE_URL = API_BASE_URL;

const TOKEN_KEY = 'canvas27_token';
const USER_KEY = 'canvas27_user';

/* —— Utilidades de Sesión —— */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function isAuthenticated() {
    return Boolean(getToken());
}

function parseApiError(data, fallback) {
    const detail = data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg || d).join(', ');
    return fallback;
}

function showAlert(elementId, message, type = 'danger') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.classList.remove('d-none');
}

function hideAlert(elementId) {
    document.getElementById(elementId)?.classList.add('d-none');
}

function setButtonLoading(button, loading, labelIdle, labelLoading) {
    if (!button) return;
    button.disabled = loading;
    const textEl = button.querySelector('.auth-submit__text');
    if (textEl) textEl.textContent = loading ? labelLoading : labelIdle;
    else button.textContent = loading ? labelLoading : labelIdle;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* —— Previsualización de Imagen (Galería / Archivos) —— */
function handleFilePreview(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('preview-container');
    const photoPreview = document.getElementById('photo-preview');

    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (photoPreview) photoPreview.src = e.target.result;
            previewContainer?.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    } else {
        if (photoPreview) photoPreview.src = '';
        previewContainer?.classList.add('d-none');
    }
}

/* —— Login —— */
async function handleLoginSubmit(event) {
    event.preventDefault();
    hideAlert('login-alert');

    const form = event.target;
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const submitBtn = document.getElementById('login-submit');

    if (!email || !password) {
        showAlert('login-alert', 'Completa correo y contraseña.');
        return;
    }

    setButtonLoading(submitBtn, true, 'Entrar a Canvas 27', 'Verificando…');

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(parseApiError(data, 'Credenciales incorrectas.'));
        }

        setSession(data.access_token, data.user);
        window.location.href = 'capture.html';
    } catch (error) {
        showAlert('login-alert', error.message);
    } finally {
        setButtonLoading(submitBtn, false, 'Entrar a Canvas 27', 'Verificando…');
    }
}

function initLoginPage() {
    if (isAuthenticated()) {
        window.location.href = 'capture.html';
        return;
    }
    document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
}

/* —— Registro —— */
function initRegisterPage() {
    if (isAuthenticated()) {
        window.location.href = 'capture.html';
        return;
    }

    const submitBtn = document.getElementById('register-submit');

    if (window.CanvasRegister) {
        CanvasRegister.initRegisterForm(document.getElementById('register-form'), {
            onError: (msg) => showAlert('register-alert', msg),
            onLoading: (loading) => {
                setButtonLoading(submitBtn, loading, 'Crear cuenta', 'Creando cuenta…');
            },
            onSuccess: () => {
                showAlert('register-alert', '¡Cuenta creada! Redirigiendo al inicio de sesión…', 'success');
            },
            loginUrl: 'login.html',
        });
    }
}

/* —— Subida de Foto —— */
async function handlePhotoUpload(event) {
    event.preventDefault();
    hideAlert('capture-alert');

    const fileInput = document.getElementById('photo-file');
    const file = fileInput?.files[0];
    
    if (!file) {
        showAlert('capture-alert', 'Selecciona una imagen de tu dispositivo.');
        return;
    }

    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const uploadBtn = document.getElementById('upload-photo-btn');
    setButtonLoading(uploadBtn, true, 'Guardar en la galería', 'Subiendo…');

    const formData = new FormData();
    formData.append('file', file);
    
    const title = document.getElementById('photo-title')?.value?.trim();
    if (title) formData.append('title', title);

    try {
        const response = await fetch(`${API_BASE_URL}/api/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            clearSession();
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            throw new Error(parseApiError(data, 'No se pudo guardar la obra.'));
        }

        showAlert('capture-alert', data.message || 'Obra guardada exitosamente. Ya está en la galería.', 'success');
        
        // Limpiar el formulario y ocultar la previsualización
        document.getElementById('upload-form')?.reset();
        document.getElementById('preview-container')?.classList.add('d-none');
    } catch (error) {
        showAlert('capture-alert', error.message || 'Error de red. ¿Está el servidor en marcha?');
    } finally {
        setButtonLoading(uploadBtn, false, 'Guardar en la galería', 'Subiendo…');
    }
}

/* —— Galería Dinámica —— */
async function initGalleryPage() {
    initSharedNav();

    const masonry = document.getElementById('gallery-masonry');
    const sectionLabel = document.getElementById('uploaded-section-label');
    if (!masonry) return;

    const firstSample = masonry.querySelector('.art-card--sample');

    try {
        const response = await fetch(`${API_BASE_URL}/api/photos/gallery`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.warn('Galería API:', parseApiError(data, 'No se cargaron fotos'));
            return;
        }

        const photos = data.photos || [];
        if (photos.length === 0) return;

        if (sectionLabel) sectionLabel.style.display = 'block';

        photos.forEach((photo) => {
            const card = document.createElement('div');
            card.className = 'art-card art-card--uploaded';

            const badge = document.createElement('span');
            badge.className = 'art-card__badge';
            badge.textContent = 'Subida';

            const img = document.createElement('img');
            img.src = `${API_BASE_URL}${photo.url}`;
            img.alt = photo.title || 'Obra subida';
            img.loading = 'lazy';
            img.onerror = () => {
                card.style.display = 'none';
            };

            const meta = document.createElement('div');
            meta.className = 'art-card__meta';
            meta.innerHTML = `<strong>${escapeHtml(photo.title)}</strong>${escapeHtml(photo.artist_name || 'Artista')}`;

            card.appendChild(badge);
            card.appendChild(img);
            card.appendChild(meta);
            masonry.insertBefore(card, firstSample);
        });
    } catch (err) {
        console.warn('Error cargando galería:', err);
    }
}

/* —— Inicialización de Páginas —— */
function initCapturePage() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('photo-file')?.addEventListener('change', handleFilePreview);
    document.getElementById('upload-form')?.addEventListener('submit', handlePhotoUpload);
    
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        clearSession();
        window.location.href = 'login.html';
    });
}

function initSharedNav() {
    const navCapture = document.getElementById('nav-capture');
    if (navCapture && isAuthenticated()) navCapture.classList.remove('d-none');

    const menuCheck = document.getElementById('menu-check');
    menuCheck?.addEventListener('change', () => {
        document.body.style.overflow = menuCheck.checked ? 'hidden' : '';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;

    switch (page) {
        case 'register':
            initRegisterPage();
            break;
        case 'login':
            initLoginPage();
            break;
        case 'capture':
            initCapturePage();
            break;
        case 'gallery':
            initGalleryPage();
            break;
        default:
            initSharedNav();
    }
});