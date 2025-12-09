// Form handling with formcarry.com integration
class FormHandler {
    constructor() {
        this.FORMCARRY_ENDPOINT = 'https://formcarry.com/s/AJYK7wadVOb'; 
        this.forms = [];
        this.init();
    }

    init() {
        this.setupForms();
        this.setupPrivacyValidation();
        this.setupFieldValidation();
    }

    setupForms() {
        const mainForm = document.getElementById('main-contact-form');
        const modalForm = document.getElementById('modal-contact-form');

        if (mainForm) {
            this.forms.push({
                element: mainForm,
                type: 'main'
            });
            this.setupFormEventListener(mainForm, 'main');
        }

        if (modalForm) {
            this.forms.push({
                element: modalForm,
                type: 'modal'
            });
            this.setupFormEventListener(modalForm, 'modal');
        }
    }

    setupFormEventListener(form, type) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.validateForm(form)) {
                return;
            }
            
            await this.handleFormSubmit(form, type);
        });

        // Очистка ошибок при изменении полей
        form.querySelectorAll('input, textarea').forEach(field => {
            field.addEventListener('input', () => {
                this.clearFieldError(field);
            });
        });

        // Обработка чекбокса
        form.querySelectorAll('input[name="privacy"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.clearPrivacyError(checkbox);
            });
        });
    }

    setupPrivacyValidation() {
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#main-contact-form, #modal-contact-form')) {
                const form = e.target;
                const checkbox = form.querySelector('input[name="privacy"]');
                if (checkbox && !checkbox.checked) {
                    e.preventDefault();
                    this.showPrivacyError(checkbox);
                }
            }
        });
    }

    setupFieldValidation() {
        // Добавляем валидацию email
        const emailFields = document.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            field.addEventListener('blur', () => {
                if (field.value && !this.validateEmail(field.value)) {
                    this.showFieldError(field, 'Введите корректный email адрес');
                }
            });
        });

        // Добавляем валидацию телефона
        const phoneFields = document.querySelectorAll('input[type="tel"]');
        phoneFields.forEach(field => {
            field.addEventListener('blur', () => {
                if (field.value && !this.validatePhone(field.value)) {
                    this.showFieldError(field, 'Введите корректный номер телефона');
                }
            });
        });
    }

    validateForm(form) {
        let isValid = true;
        
        // Проверка обязательных полей
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'Это поле обязательно для заполнения');
                isValid = false;
            }
        });

        // Проверка email
        const emailField = form.querySelector('input[type="email"]');
        if (emailField && emailField.value && !this.validateEmail(emailField.value)) {
            this.showFieldError(emailField, 'Введите корректный email адрес');
            isValid = false;
        }

        // Проверка чекбокса
        const privacyCheckbox = form.querySelector('input[name="privacy"]');
        if (privacyCheckbox && !privacyCheckbox.checked) {
            this.showPrivacyError(privacyCheckbox);
            isValid = false;
        }

        return isValid;
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePhone(phone) {
        const re = /^[\+]?[0-9\s\-\(\)]+$/;
        return re.test(phone);
    }

    async handleFormSubmit(form, formType) {
        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Подготавливаем данные для отправки
        const formData = new FormData(form);
        const data = {};
        
        // Конвертируем FormData в объект
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Добавляем информацию о типе формы
        data.formType = formType;
        data.pageTitle = document.title;
        data.pageUrl = window.location.href;

        // Show loading state
        submitBtn.disabled = true;
        btnText.classList.add('d-none');
        btnLoading.classList.remove('d-none');

        try {
            // Отправка данных на formcarry.com
            const response = await fetch(this.FORMCARRY_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.code === 200) {
                // Успешная отправка
                this.handleSuccess(form, formType, result.message);
            } else {
                // Ошибка от formcarry
                console.error('Formcarry Error:', result);
                const errorMessage = result.message || 'Ошибка при отправке формы. Попробуйте еще раз.';
                this.showErrorMessage(form, errorMessage);
                
                // Если есть детальные ошибки, показываем их
                if (result.errors) {
                    this.handleFormcarryErrors(form, result.errors);
                }
            }
            
        } catch (error) {
            console.error('Network Error:', error);
            this.showErrorMessage(form, 'Ошибка сети. Проверьте подключение к интернету и попробуйте еще раз.');
        } finally {
            // Reset loading state
            submitBtn.disabled = false;
            btnText.classList.remove('d-none');
            btnLoading.classList.add('d-none');
        }
    }

    handleFormcarryErrors(form, errors) {
        // Обработка специфичных ошибок от formcarry
        Object.keys(errors).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                this.showFieldError(field, errors[fieldName].join(', '));
            }
        });
    }

    handleSuccess(form, formType, message = 'Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.') {
        this.showSuccessMessage(form, message);
        
        // Очищаем форму
        form.reset();
        
        // Прокручиваем к началу формы для отображения сообщения
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        if (formType === 'modal') {
            // Закрываем модальное окно через 3 секунды
            setTimeout(() => {
                const modal = document.getElementById('contactModal');
                if (modal) {
                    modal.classList.remove('active');
                    setTimeout(() => {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    }, 300);
                }
            }, 3000);
        }
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        field.parentNode.insertBefore(errorElement, field.nextSibling);
        field.classList.add('error');
        
        // Если поле в фокусе, прокручиваем к нему
        if (field === document.activeElement) {
            field.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    clearFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.classList.remove('error');
    }

    showPrivacyError(checkbox) {
        const errorId = checkbox.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.style.display = 'block';
        }
        
        checkbox.closest('.checkbox-label').classList.add('error');
        
        checkbox.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    clearPrivacyError(checkbox) {
        const errorId = checkbox.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        checkbox.closest('.checkbox-label').classList.remove('error');
    }

    showSuccessMessage(form, message) {
        this.showMessage(form, message, 'success');
    }

    showErrorMessage(form, message) {
        this.showMessage(form, message, 'error');
    }

    showMessage(form, message, type) {
        // Удаляем предыдущее сообщение
        const existingMessage = form.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Создаем новое сообщение
        const messageElement = document.createElement('div');
        messageElement.className = `form-message ${type}`;
        messageElement.innerHTML = `
            <strong>${type === 'success' ? '✓' : '✗'}</strong> 
            ${message}
        `;
        
        // Вставляем перед кнопкой отправки
        const submitBtn = form.querySelector('.submit-btn');
        form.insertBefore(messageElement, submitBtn);

        // Автоматически скрываем успешные сообщения
        if (type === 'success') {
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.remove();
                }
            }, 5000);
        }
    }
}

// Стили для форм и валидации
const formStyles = `
    .field-error {
        color: #ff6b6b;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: none;
        animation: fadeIn 0.3s ease;
    }
    
    input.error,
    textarea.error {
        border-color: #ff6b6b !important;
        background: rgba(255, 107, 107, 0.05);
    }
    
    input.error:focus,
    textarea.error:focus {
        box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2) !important;
    }
    
    .checkbox-label.error .checkmark {
        border-color: #ff6b6b !important;
    }
    
    .checkbox-label.error .checkbox-text {
        color: #ff6b6b;
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
    
    /* Стили для состояния загрузки */
    .submit-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
    }
    
    .btn-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
    
    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid var(--light-text);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

// Вставляем стили в документ
const styleSheet = document.createElement('style');
styleSheet.textContent = formStyles;
document.head.appendChild(styleSheet);



// Инициализация обработчика форм
document.addEventListener('DOMContentLoaded', () => {
    const formHandler = new FormHandler();
    
    // Экспортируем для отладки
    window.formHandler = formHandler;
    
    // Тестовая функция для проверки отправки
    window.testFormSubmit = async (formType = 'main') => {
        const formId = formType === 'main' ? 'main-contact-form' : 'modal-contact-form';
        const form = document.getElementById(formId);
        
        if (!form) {
            console.error(`Форма ${formId} не найдена`);
            return;
        }
        
        // Заполняем тестовыми данными
        const testData = {
            name: 'Тестовый Пользователь',
            email: 'test@example.com',
            subject: 'Тестовое сообщение',
            message: 'Это тестовое сообщение для проверки работы формы.',
            privacy: true
        };
        
        if (formType === 'modal') {
            testData.phone = '+79991234567';
        }
        
        Object.keys(testData).forEach(key => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = testData[key];
                } else {
                    field.value = testData[key];
                }
            }
        });
        
        // Отправляем форму
        console.log(`Тестируем отправку ${formType} формы...`);
        await formHandler.handleFormSubmit(form, formType);
    };
});