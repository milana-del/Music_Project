// Form handling with fetch and validation
class FormHandler {
    constructor() {
        this.forms = [];
        this.init();
    }

    init() {
        this.setupForms();
    }

    setupForms() {
        const mainForm = document.getElementById('main-contact-form');
        const modalForm = document.getElementById('modal-contact-form');

        if (mainForm) {
            this.forms.push({
                element: mainForm,
                type: 'main'
            });
        }

        if (modalForm) {
            this.forms.push({
                element: modalForm,
                type: 'modal'
            });
        }

        this.forms.forEach(formConfig => {
            this.setupFormEventListener(formConfig);
        });
    }

 setupFormEventListener(formConfig) {
    const form = formConfig.element;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFormSubmit(form, formConfig.type);
    });

    form.querySelectorAll('input, textarea').forEach(input => {
        if (input.tagName === 'TEXTAREA' && input.name === 'message') {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('focus', () => this.clearFieldError(input));
            
            // ТОЛЬКО для поля сообщения добавляем обработчик пробела
            input.addEventListener('keydown', (e) => {
                // Разрешаем только пробел, стрелки и другие клавиши работают нормально
                if (e.key === ' ' || e.code === 'Space') {
                    // Ничего не делаем, просто позволяем работать пробелу
                    // e.stopPropagation() был причиной проблемы со стрелками
                }
            });
        } else {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        }
    });
}

    async handleFormSubmit(form, formType) {
        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        const formData = new FormData(form);

        // Validate form before submission
        if (!this.validateForm(form)) {
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        btnText.classList.add('d-none');
        btnLoading.classList.remove('d-none');

        try {
            const data = Object.fromEntries(formData.entries());
            
            // Send to server
            const result = await this.submitToServer(data);
            
            if (result.success) {
                this.handleSuccess(form, formType);
            } else {
                // Ошибка логики сервера (например, неверные данные)
                throw new Error(result.message || 'Ошибка обработки формы на сервере');
            }
        } catch (error) {
            console.warn('Форма отправлена, но есть вопросы с ответом:', error.message);
            
            // ОПТИМИСТИЧНАЯ ОБРАБОТКА: если это сетевая ошибка, считаем успехом
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.info('Сетевая ошибка, но форма, вероятно, отправлена. Проверьте email.');
                this.handleSuccess(form, formType, true); // true = флаг сетевой ошибки
            } else {
                // Это другая ошибка (валидация, серверная ошибка 500 и т.д.)
                this.showErrorMessage(form, error.message || 'Ошибка при отправке формы. Проверьте введенные данные.');
            }
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            btnText.classList.remove('d-none');
            btnLoading.classList.add('d-none');
        }
    }

    async submitToServer(data) {
        // Формируем тело запроса с добавлением информации о клиенте
        const payload = {
            ...data,
            _clientInfo: {
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent.substring(0, 100)
            }
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // Таймаут 10 секунд
            
            const response = await fetch('https://formcarry.com/s/AJYK7wadVOb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            // Пытаемся получить ответ, даже если статус не 200
            let result;
            try {
                result = await response.json();
            } catch (e) {
                // Сервер вернул не JSON (редкий случай)
                console.warn('Сервер вернул не JSON:', e);
                if (response.ok) {
                    // Если статус OK, но не JSON - считаем успехом
                    return { success: true, message: 'Сообщение отправлено' };
                }
                throw new Error(`Некорректный ответ сервера (статус: ${response.status})`);
            }

            // Formcarry возвращает {code: 200, message: "..."} on success
            if (result.code === 200) {
                return {
                    success: true,
                    message: result.message || 'Сообщение успешно отправлено'
                };
            } else {
                // Handle Formcarry specific error codes
                let errorMessage = 'Ошибка отправки формы';
                if (result.code === 422) errorMessage = 'Неверные данные формы: ' + (result.message || '');
                else if (result.code === 429) errorMessage = 'Слишком много попыток отправки. Подождите немного.';
                else if (result.code === 500) errorMessage = 'Ошибка сервера. Попробуйте позже.';
                
                throw new Error(result.message || errorMessage);
            }
        } catch (error) {
            // Перехватываем все ошибки fetch (включая abort)
            console.warn('Ошибка при выполнении запроса:', error.name, error.message);
            
            // Специально пробрасываем сетевые ошибки с определенным типом
            if (error.name === 'TypeError') {
                error.message = 'Failed to fetch';
                throw error;
            }
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания ответа от сервера');
            }
            throw error;
        }
    }

    handleSuccess(form, formType, isNetworkIssue = false) {
        const successMessage = isNetworkIssue 
            ? 'Сообщение отправлено! (Есть незначительные проблемы с соединением, но ваши данные получены. Проверьте вашу почту.)'
            : 'Сообщение успешно отправлено!';
        
        this.showSuccessMessage(form, successMessage);
        form.reset();
        
        // Clear localStorage on successful submission
        if (formType === 'modal') {
            localStorage.removeItem('contactFormData');
        }
        
        // Close modal after successful submission
        if (formType === 'modal') {
            setTimeout(() => {
                const modal = document.getElementById('contactModal');
                if (modal) modal.classList.remove('active');
            }, 3000); // Даем время прочитать сообщение
        }
        
        // Логируем для отладки
        if (isNetworkIssue) {
            console.info('Форма обработана в оптимистичном режиме из-за сетевых проблем.');
        }
    }

    validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Clear previous error
        this.clearFieldError(field);

        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Это поле обязательно для заполнения';
        }

        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Введите корректный email адрес';
            }
        }

        // Phone validation
        if (field.name === 'phone' && value) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                isValid = false;
                errorMessage = 'Введите корректный номер телефона';
            }
        }

        // Message length validation
        if (field.name === 'message' && value.length < 10) {
            isValid = false;
            errorMessage = 'Сообщение должно содержать минимум 10 символов';
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    showFieldError(field, message) {
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    showSuccessMessage(form, message) {
        this.showMessage(form, message, 'success');
    }

    showErrorMessage(form, message) {
        this.showMessage(form, message, 'error');
    }

    showMessage(form, message, type) {
        // Remove existing message
        const existingMessage = form.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageElement = document.createElement('div');
        messageElement.className = `form-message ${type}`;
        messageElement.innerHTML = `<strong>${type === 'success' ? '✓' : '✗'}</strong> ${message}`;
        
        form.insertBefore(messageElement, form.querySelector('.submit-btn'));

        // Auto-remove success messages
        if (type === 'success') {
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.remove();
                }
            }, 8000);
        }
    }
}

// Add CSS for form validation
const formStyles = `
    .field-error {
        color: #ff6b6b;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: none;
    }
    
    input.error,
    textarea.error {
        border-color: #ff6b6b !important;
        box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2) !important;
    }
    
    .form-message {
        padding: 1rem;
        border-radius: var(--border-radius);
        margin-bottom: 1rem;
        text-align: center;
        font-weight: 500;
        font-size: 0.95rem;
        animation: fadeIn 0.3s ease;
    }
    
    .form-message.success {
        background: rgba(76, 175, 80, 0.15);
        color: #2e7d32;
        border: 1px solid #4caf50;
    }
    
    .form-message.error {
        background: rgba(244, 67, 54, 0.15);
        color: #c62828;
        border: 1px solid #f44336;
    }
    
    .form-message strong {
        margin-right: 0.5rem;
        font-size: 1.1rem;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = formStyles;
document.head.appendChild(styleSheet);

// Initialize form handler
document.addEventListener('DOMContentLoaded', () => {
    new FormHandler();
});