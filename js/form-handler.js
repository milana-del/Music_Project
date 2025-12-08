// Form handling with fetch and validation
class FormHandler {
    constructor() {
        this.forms = [];
        this.init();
    }

    init() {
        this.setupForms();
        this.setupPrivacyValidation();
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
            
            // Проверяем чекбокс
            const privacyCheckbox = form.querySelector('input[name="privacy"]');
            if (privacyCheckbox && !privacyCheckbox.checked) {
                this.showPrivacyError(privacyCheckbox);
                return;
            }
            
            await this.handleFormSubmit(form, type);
        });

        // Обработка чекбокса
        form.querySelectorAll('input[name="privacy"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.clearPrivacyError(checkbox);
            });
        });
    }

    setupPrivacyValidation() {
        // Добавляем валидацию при отправке формы
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

    async handleFormSubmit(form, formType) {
        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        const formData = new FormData(form);

        // Show loading state
        submitBtn.disabled = true;
        btnText.classList.add('d-none');
        btnLoading.classList.remove('d-none');

        try {
            const data = Object.fromEntries(formData.entries());
            
            // Здесь должна быть отправка на сервер
            // Для примера просто симулируем успешную отправку
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.handleSuccess(form, formType);
            
        } catch (error) {
            console.error('Ошибка отправки формы:', error);
            this.showErrorMessage(form, 'Ошибка при отправке формы. Попробуйте еще раз.');
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('d-none');
            btnLoading.classList.add('d-none');
        }
    }

    handleSuccess(form, formType) {
        const successMessage = 'Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.';
        
        this.showSuccessMessage(form, successMessage);
        form.reset();
        
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

    showPrivacyError(checkbox) {
        const errorId = checkbox.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.style.display = 'block';
        }
        
        checkbox.closest('.checkbox-label').classList.add('error');
        
        // Прокручиваем к чекбоксу
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

// Добавляем стили для сообщений форм
const formStyles = `
    .field-error {
        color: #ff6b6b;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: none;
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
`;

// Вставляем стили в документ
const styleSheet = document.createElement('style');
styleSheet.textContent = formStyles;
document.head.appendChild(styleSheet);

// Инициализация обработчика форм
document.addEventListener('DOMContentLoaded', () => {
    new FormHandler();
});