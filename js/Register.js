/**
 * Register.js — Registro en un solo paso (JavaScript vanilla)
 */
(function (global) {
    const API_BASE = () => global.API_BASE_URL || 'https://canvas27.onrender.com';

    function validateRegister({ name, email, password, passwordConfirm }) {
        if (!name?.trim()) {
            return 'Indica el nombre con el que aparecerás en Canvas 27.';
        }
        if (!email || !password) {
            return 'Completa correo y contraseña.';
        }
        if (password !== passwordConfirm) {
            return 'Las contraseñas no coinciden.';
        }
        if (password.length < 6) {
            return 'La contraseña debe tener al menos 6 caracteres.';
        }
        return null;
    }

    async function submitRegistration({ name, email, password }) {
        // Estructura JSON que coincide con el esquema RegisterRequest de FastAPI
        const payload = {
            email: email.trim().toLowerCase(),
            password: password,
            full_name: name.trim()
        };

        const response = await fetch(`${API_BASE()}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            let errorMsg = 'No se pudo completar el registro.';
            if (typeof data.detail === 'string') {
                errorMsg = data.detail;
            } else if (Array.isArray(data.detail)) {
                errorMsg = data.detail.map((d) => d.msg || d).join(', ');
            }
            throw new Error(errorMsg);
        }
        return data;
    }

    function initRegisterForm(form, options = {}) {
        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const name = form.full_name?.value?.trim() || '';
            const email = form.email?.value?.trim() || '';
            const password = form.password?.value || '';
            const passwordConfirm = form.password_confirm?.value || '';

            const error = validateRegister({ name, email, password, passwordConfirm });
            if (error) {
                options.onError?.(error);
                return;
            }

            options.onLoading?.(true);
            try {
                await submitRegistration({ name, email, password });
                options.onSuccess?.();
                setTimeout(() => {
                    window.location.href = options.loginUrl || 'login.html';
                }, 1200);
            } catch (err) {
                options.onError?.(err.message || 'Error al registrarse.');
            } finally {
                options.onLoading?.(false);
            }
        });
    }

    global.CanvasRegister = { initRegisterForm, validateRegister, submitRegistration };
})(window);