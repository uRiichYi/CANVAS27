/**
 * Canvas 27 — Frontend (JavaScript vanilla)
 */
const API_BASE_URL = 'http://127.0.0.1:8000';
window.API_BASE_URL = API_BASE_URL;

const TOKEN_KEY = 'canvas27_token';
const USER_KEY = 'canvas27_user';

/* —— Utilidades —— */
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

/* —— Vibration API —— */
const Vibration = {
    pulse(pattern = 200) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    },
    success() {
        this.pulse(1000);
    },
    capture() {
        this.pulse([80, 50, 80]);
    },
    error() {
        this.pulse([100, 80, 100, 80, 100]);
    },
};

/* —— Geolocation API —— */
const GeoModule = (() => {
    let coords = null;
    let watchId = null;

    function setLocationUI(state, text) {
        const chip = document.getElementById('status-location');
        const label = document.getElementById('status-location-label');
        const dot = document.getElementById('status-location-dot');
        const coordsDisplay = document.getElementById('geo-coords-display');
        const hint = document.getElementById('geo-hint');

        if (!chip || !label) return;

        chip.dataset.state = state;
        label.textContent = text;
        dot?.classList.toggle('status-chip__dot--ok', state === 'ok');
        chip.classList.toggle('status-chip--ok', state === 'ok');

        if (state === 'ok' && coords) {
            const txt = `Lat: ${coords.latitude.toFixed(5)} · Lon: ${coords.longitude.toFixed(5)}`;
            if (coordsDisplay) {
                coordsDisplay.textContent = txt;
                coordsDisplay.classList.remove('d-none');
            }
            if (hint) hint.textContent = 'Ubicación lista para adjuntar a la foto.';
        } else if (state === 'loading') {
            if (coordsDisplay) coordsDisplay.classList.add('d-none');
            if (hint) hint.textContent = 'Obteniendo ubicación…';
        } else if (state === 'denied') {
            if (coordsDisplay) coordsDisplay.classList.add('d-none');
            if (hint) hint.textContent = 'Permiso de ubicación denegado.';
        } else {
            if (coordsDisplay) coordsDisplay.classList.add('d-none');
            if (hint) hint.textContent = 'Toca el botón para obtener tu ubicación (GPS).';
        }
    }

    function requestLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                setLocationUI('denied', 'GPS no soportado');
                resolve(null);
                return;
            }

            setLocationUI('loading', 'Buscando GPS…');

            navigator.geolocation.getCurrentPosition(
                function (position) {
                    coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    };

                    console.log('Latitud: ' + coords.latitude);
                    console.log('Longitud: ' + coords.longitude);

                    setLocationUI('ok', 'Ubicación activa');
                    Vibration.success();

                    resolve(coords);
                },
                function (error) {
                    coords = null;
                    const msg =
                        error.code === 1
                            ? 'Permiso denegado'
                            : error.code === 2
                              ? 'Posición no disponible'
                              : 'Tiempo agotado';
                    setLocationUI('denied', msg);
                    Vibration.error();
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        });
    }

    function getCoords() {
        return coords;
    }

    function stopWatch() {
        if (watchId != null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    return { requestLocation, getCoords, setLocationUI, stopWatch };
})();

/* —— Media Capture and Streams API —— */
const CameraModule = (() => {
    let mediaStream = null;
    let capturedBlob = null;
    let imageCapture = null;
    let previewUrl = null;

    const videoEl = () => document.getElementById('camera-preview');
    const canvasEl = () => document.getElementById('photo-canvas');
    const imgEl = () => document.getElementById('photo-preview');
    const placeholderEl = () => document.getElementById('camera-placeholder');

    let cameraState = 'off';

    function setCameraStatus(text, state = 'off') {
        cameraState = state;
        const chip = document.getElementById('status-camera');
        const label = document.getElementById('status-camera-label');
        const dot = document.getElementById('status-camera-dot');
        if (!chip || !label) return;

        chip.dataset.state = state;
        label.textContent = text;
        const isLive = state === 'on';
        dot?.classList.toggle('status-chip__dot--ok', isLive);
        chip.classList.toggle('status-chip--ok', isLive || state === 'captured');
    }

    function isStreamLive() {
        if (!mediaStream || !mediaStream.active) return false;
        const track = mediaStream.getVideoTracks()[0];
        return track && track.readyState === 'live' && !track.muted;
    }

    function startCameraMonitor() {
        stopCameraMonitor();
        cameraMonitorId = setInterval(() => {
            if (cameraState !== 'on') return;
            if (isStreamLive()) {
                setCameraStatus('Cámara encendida', 'on');
            } else {
                setCameraStatus('Cámara desconectada', 'error');
            }
        }, 500);
    }

    let cameraMonitorId = null;

    function stopCameraMonitor() {
        if (cameraMonitorId) {
            clearInterval(cameraMonitorId);
            cameraMonitorId = null;
        }
    }

    function updateControls({ cameraOn, hasPhoto }) {
        document.getElementById('start-camera-btn').disabled = Boolean(cameraOn);
        document.getElementById('take-photo-btn').disabled = !cameraOn || Boolean(hasPhoto);
        document.getElementById('retake-photo-btn').disabled = !hasPhoto;
        document.getElementById('upload-photo-btn').disabled = !hasPhoto;
    }

    function waitForVideoReady(video) {
        return new Promise((resolve) => {
            if (video.readyState >= 2 && video.videoWidth > 0) {
                resolve();
                return;
            }
            const onReady = () => {
                video.removeEventListener('loadedmetadata', onReady);
                video.removeEventListener('loadeddata', onReady);
                resolve();
            };
            video.addEventListener('loadedmetadata', onReady);
            video.addEventListener('loadeddata', onReady);
            setTimeout(resolve, 3000);
        });
    }

    async function startCamera() {
        hideAlert('capture-alert');

        if (!navigator.mediaDevices?.getUserMedia) {
            showAlert('capture-alert', 'Tu navegador no soporta Media Capture API.');
            return;
        }

        try {
            await stopCamera();

            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            };

            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            const video = videoEl();
            if (!video) return;

            video.srcObject = mediaStream;
            await video.play();
            await waitForVideoReady(video);

            if ('ImageCapture' in window && mediaStream.getVideoTracks().length) {
                imageCapture = new ImageCapture(mediaStream.getVideoTracks()[0]);
            } else {
                imageCapture = null;
            }

            placeholderEl()?.classList.add('d-none');
            video.classList.remove('d-none');
            imgEl()?.classList.add('d-none');
            revokePreviewUrl();
            capturedBlob = null;

            const track = mediaStream.getVideoTracks()[0];
            if (track) {
                track.onended = () => {
                    if (cameraState === 'on') setCameraStatus('Cámara apagada', 'off');
                };
            }

            setCameraStatus('Cámara encendida', 'on');
            startCameraMonitor();
            Vibration.pulse(150);
            updateControls({ cameraOn: true, hasPhoto: false });
        } catch (error) {
            const msg =
                error.name === 'NotAllowedError'
                    ? 'Permiso de cámara denegado.'
                    : error.name === 'NotFoundError'
                      ? 'No se encontró ninguna cámara.'
                      : 'No se pudo iniciar la cámara.';
            showAlert('capture-alert', msg);
            setCameraStatus('Error de cámara', 'error');
            Vibration.error();
        }
    }

    function stopCamera(keepStatus = false) {
        stopCameraMonitor();
        if (mediaStream) {
            mediaStream.getTracks().forEach((t) => t.stop());
            mediaStream = null;
        }
        imageCapture = null;
        const video = videoEl();
        if (video) {
            video.srcObject = null;
            video.classList.add('d-none');
        }
        placeholderEl()?.classList.remove('d-none');
        if (!keepStatus) setCameraStatus('Cámara apagada', 'off');
    }

    function revokePreviewUrl() {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
    }

    function applyCapturedBlob(blob) {
        if (!blob || blob.size === 0) {
            showAlert('capture-alert', 'La captura salió vacía. Intenta de nuevo.');
            return false;
        }

        capturedBlob = blob.type ? blob : new Blob([blob], { type: 'image/jpeg' });
        revokePreviewUrl();
        previewUrl = URL.createObjectURL(capturedBlob);

        const img = imgEl();
        if (img) {
            img.src = previewUrl;
            img.classList.remove('d-none');
        }
        videoEl()?.classList.add('d-none');
        placeholderEl()?.classList.add('d-none');
        stopCamera(true);
        setCameraStatus('Foto capturada', 'captured');
        Vibration.capture();
        updateControls({ cameraOn: false, hasPhoto: true });
        return true;
    }

    async function takePhoto() {
        hideAlert('capture-alert');

        try {
            if (imageCapture?.takePhoto) {
                const blob = await imageCapture.takePhoto();
                if (applyCapturedBlob(blob)) return;
            }
        } catch {
            /* fallback canvas */
        }

        const video = videoEl();
        const canvas = canvasEl();
        if (!video || !canvas || !mediaStream) {
            showAlert('capture-alert', 'Activa la cámara antes de capturar.');
            return;
        }

        await waitForVideoReady(video);
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
            showAlert('capture-alert', 'Espera a que la cámara cargue e intenta otra vez.');
            return;
        }

        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);

        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 0.92);
        });

        applyCapturedBlob(blob);
    }

    async function retakePhoto() {
        capturedBlob = null;
        revokePreviewUrl();
        const img = imgEl();
        if (img) {
            img.src = '';
            img.classList.add('d-none');
        }
        updateControls({ cameraOn: false, hasPhoto: false });
        await startCamera();
    }

    function getCapturedFile() {
        if (!capturedBlob) return null;
        return new File([capturedBlob], `capture_${Date.now()}.jpg`, {
            type: 'image/jpeg',
        });
    }

    function resetAfterUpload() {
        capturedBlob = null;
        revokePreviewUrl();
        imgEl()?.classList.add('d-none');
        setCameraStatus('Cámara apagada', 'off');
        updateControls({ cameraOn: false, hasPhoto: false });
    }

    function bindEvents() {
        document.getElementById('start-camera-btn')?.addEventListener('click', startCamera);
        document.getElementById('take-photo-btn')?.addEventListener('click', takePhoto);
        document.getElementById('retake-photo-btn')?.addEventListener('click', retakePhoto);
    }

    return { bindEvents, getCapturedFile, stopCamera, resetAfterUpload };
})();

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

/* —— Registro (Register.js) —— */
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
                if (typeof Vibration !== 'undefined') Vibration.success();
            },
            loginUrl: 'login.html',
        });
    }
}

/* —— Subida de foto —— */
async function handlePhotoUpload(event) {
    event.preventDefault();
    hideAlert('capture-alert');

    const file = CameraModule.getCapturedFile();
    if (!file) {
        showAlert('capture-alert', 'Primero toma una foto con la cámara.');
        return;
    }

    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const uploadBtn = document.getElementById('upload-photo-btn');
    setButtonLoading(uploadBtn, true, 'Guardar en servidor', 'Subiendo…');

    const formData = new FormData();
    formData.append('photo', file);
    const title = document.getElementById('photo-title')?.value?.trim();
    if (title) formData.append('title', title);

    const coords = GeoModule.getCoords();
    if (coords) {
        formData.append('latitude', String(coords.latitude));
        formData.append('longitude', String(coords.longitude));
    }

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
            throw new Error(parseApiError(data, 'No se pudo guardar la foto.'));
        }

        showAlert('capture-alert', data.message || 'Foto guardada. Ya está en la galería.', 'success');
        Vibration.success();
        document.getElementById('upload-form')?.reset();
        CameraModule.resetAfterUpload();
        GeoModule.requestLocation();
    } catch (error) {
        showAlert('capture-alert', error.message || 'Error de red. ¿Está el servidor en marcha?');
    } finally {
        setButtonLoading(uploadBtn, false, 'Guardar en servidor', 'Subiendo…');
    }
}

/* —— Galería dinámica —— */
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

            const img = document.createElement('img');
            img.src = `${API_BASE_URL}${photo.url}`;
            img.alt = photo.title || 'Obra subida';
            img.loading = 'lazy';
            img.onerror = () => {
                card.style.display = 'none';
            };

            const meta = document.createElement('div');
            meta.className = 'art-card__meta';
            const loc =
                photo.latitude && photo.longitude
                    ? `<br><span class="art-card__geo">📍 ${Number(photo.latitude).toFixed(4)}, ${Number(photo.longitude).toFixed(4)}</span>`
                    : '';
            meta.innerHTML = `<strong>${escapeHtml(photo.title)}</strong>
                ${escapeHtml()}${loc}`;

            card.appendChild(badge);
            card.appendChild(img);
            card.appendChild(meta);
            masonry.insertBefore(card, firstSample);
        });
    } catch (err) {
        console.warn('Error cargando galería:', err);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initCapturePage() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    CameraModule.bindEvents();
    GeoModule.setLocationUI('pending', 'Ubicación pendiente');

    document.getElementById('geo-request-btn')?.addEventListener('click', () => {
        GeoModule.requestLocation();
    });

    document.getElementById('upload-form')?.addEventListener('submit', handlePhotoUpload);
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        CameraModule.stopCamera();
        GeoModule.stopWatch();
        clearSession();
        window.location.href = 'login.html';
    });

    window.addEventListener('beforeunload', () => {
        CameraModule.stopCamera();
        GeoModule.stopWatch();
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
