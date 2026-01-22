import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);

  loginForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  registerForm = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', Validators.email],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: [this.passwordMatchValidator] }
  );

  loading = false;
  error = '';
  success = false;
  isRegisterMode = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (this.isRegisterMode) {
      this.register();
      return;
    }
    if (this.loginForm.invalid) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = false;

    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Login failed. Please check your credentials.';
      },
    });
  }

  register() {
    if (this.registerForm.invalid) {
      return;
    }

    const { username, password, email } = this.registerForm.getRawValue();
    this.loading = true;
    this.error = '';
    this.success = false;

    this.auth.register({ username, password, email }).subscribe({
      next: () => {
        this.auth.login({ username, password }).subscribe({
          next: () => {
            this.loading = false;
            this.success = true;
            this.router.navigate(['/products']);
          },
          error: () => {
            this.loading = false;
            this.error = 'Registered, but login failed. Please sign in.';
            this.isRegisterMode = false;
          },
        });
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.error?.username?.[0] ||
          err?.error?.email?.[0] ||
          err?.error?.detail ||
          'Registration failed. Please try again.';
      },
    });
  }

  logout() {
    this.auth.logout();
    this.success = false;
  }

  isLoggedIn() {
    return this.auth.isAuthenticated();
  }

  username() {
    return this.auth.username();
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.error = '';
    this.success = false;
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (!password || !confirm) {
      return null;
    }
    return password === confirm ? null : { passwordMismatch: true };
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);

    const valid = hasUpperCase && hasLowerCase && hasNumeric;

    if (!valid) {
      return {
        passwordStrength: {
          hasUpperCase,
          hasLowerCase,
          hasNumeric,
        },
      };
    }

    return null;
  }

  get passwordControl() {
    return this.registerForm.get('password');
  }

  get usernameControl() {
    return this.registerForm.get('username');
  }
}
