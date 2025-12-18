import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  loading = false;
  error = '';
  success = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = false;

    this.auth.login(this.form.getRawValue()).subscribe({
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
}
