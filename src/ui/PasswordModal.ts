import { Modal, App, Setting } from 'obsidian';

export interface PasswordPromptResult {
    password: string;
    hint?: string;
    remember?: boolean;
}

export interface PasswordPromptDefaults {
    password?: string;
    confirmPassword?: string;
    hint?: string;
    remember?: boolean;
}

export class PasswordModal extends Modal {
    private password: string = '';
    private confirmPassword: string = '';
    private hint: string = '';
    private remember: boolean = true;
    private isEncrypting: boolean;
    private errorEl: HTMLElement | null = null;
    private resolve: (value: PasswordPromptResult | null) => void;

    constructor(
        app: App,
        isEncrypting: boolean = false,
        existingHint?: string,
        defaults?: PasswordPromptDefaults
    ) {
        super(app);
        this.isEncrypting = isEncrypting;
        this.password = defaults?.password || '';
        this.confirmPassword = defaults?.confirmPassword || '';
        this.hint = defaults?.hint || existingHint || '';
        this.remember = defaults?.remember ?? true;
    }

    async openAndGetPassword(): Promise<PasswordPromptResult | null> {
        return new Promise((resolve) => {
            this.resolve = resolve;
            this.open();
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: this.isEncrypting ? 'Encrypt content' : 'Decrypt content' });

        const showError = (message: string) => {
            if (this.errorEl) {
                this.errorEl.textContent = message;
            } else {
                this.errorEl = contentEl.createEl('p', {
                    text: message,
                    cls: 'age-encrypt-error'
                });
                this.errorEl.style.color = 'var(--text-error)';
                this.errorEl.style.marginTop = '1em';
            }
        };

        const clearError = () => {
            if (this.errorEl) {
                this.errorEl.remove();
                this.errorEl = null;
            }
        };

        const submitHandler = () => {
            clearError();

            if (!this.password) {
                showError('Password is required');
                return;
            }

            if (this.isEncrypting) {
                if (!this.confirmPassword) {
                    showError('Please confirm your password');
                    return;
                }
                if (this.password !== this.confirmPassword) {
                    showError('Passwords do not match');
                    return;
                }
            }

            this.resolve({
                password: this.password,
                hint: this.hint || undefined,
                remember: this.remember
            });
            this.close();
        };

        this.addPasswordField(
            contentEl,
            'Password',
            'Enter your password',
            'Enter password',
            this.password,
            value => this.password = value,
            submitHandler
        );

        if (this.isEncrypting) {
            this.addPasswordField(
                contentEl,
                'Confirm Password',
                'Re-enter your password to confirm',
                'Confirm password',
                this.confirmPassword,
                value => this.confirmPassword = value,
                submitHandler
            );

            new Setting(contentEl)
                .setName('Hint (optional)')
                .setDesc('Add a hint to help remember the password')
                .addText(text => text
                    .setPlaceholder('Enter hint')
                    .setValue(this.hint)
                    .onChange(value => this.hint = value)
                );
        }

        new Setting(contentEl)
            .setName('Remember for this session')
            .setDesc('Keep password in memory until Obsidian is closed')
            .addToggle(toggle => toggle
                .setValue(this.remember)
                .onChange(value => this.remember = value)
            );

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(this.isEncrypting ? 'Encrypt' : 'Decrypt')
                .setCta()
                .onClick(() => submitHandler()))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => {
                    this.resolve(null);
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private addPasswordField(
        contentEl: HTMLElement,
        name: string,
        description: string,
        placeholder: string,
        value: string,
        onChange: (value: string) => void,
        submitHandler: () => void
    ): void {
        let passwordInput: HTMLInputElement;

        const setting = new Setting(contentEl)
            .setName(name)
            .setDesc(description)
            .addText(text => {
                text
                    .setPlaceholder(placeholder)
                    .setValue(value)
                    .onChange(onChange);
                text.inputEl.type = 'password';
                text.inputEl.classList.add('age-encrypt-password-input');
                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitHandler();
                    }
                });
                passwordInput = text.inputEl;
                return text;
            })
            .addExtraButton(button => {
                let passwordVisible = false;

                button
                    .setIcon('eye')
                    .setTooltip('Show password')
                    .onClick(() => {
                        passwordVisible = !passwordVisible;
                        passwordInput.type = passwordVisible ? 'text' : 'password';
                        button.setIcon(passwordVisible ? 'eye-off' : 'eye');
                        button.setTooltip(passwordVisible ? 'Hide password' : 'Show password');
                    });
            });

        setting.settingEl.classList.add('age-encrypt-password-setting');
    }
}
