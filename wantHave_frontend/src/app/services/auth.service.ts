import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { Credentials, RegisterPayload, TokenResponse } from '../interfaces/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly tokenKey = 'wanthave_access';
  private readonly refreshKey = 'wanthave_refresh';
  private readonly usernameKey = 'wanthave_username';

  private loggedIn = signal<boolean>(!!localStorage.getItem(this.tokenKey));
  private usernameSignal = signal<string | null>(localStorage.getItem(this.usernameKey));
  private adminSignal = signal<boolean>(false);

  constructor() {
    this.checkAdminStatus();
  }

  login(credentials: Credentials) {
    return this.http.post<TokenResponse>('/api/token/', credentials).pipe(
      tap(({ access, refresh }) => {
        localStorage.setItem(this.tokenKey, access);
        localStorage.setItem(this.refreshKey, refresh);
        localStorage.setItem(this.usernameKey, credentials.username);
        this.loggedIn.set(true);
        this.usernameSignal.set(credentials.username);
        this.checkAdminStatus();
      })
    );
  }

  register(payload: RegisterPayload) {
    return this.http.post('/api/market/register/', payload);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem(this.usernameKey);
    this.loggedIn.set(false);
    this.usernameSignal.set(null);
    this.adminSignal.set(false);
  }

  accessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return this.loggedIn();
  }

  isAdmin(): boolean {
    return this.adminSignal();
  }

  username(): string | null {
    return this.usernameSignal();
  }

  private checkAdminStatus() {
    const token = this.accessToken();
    if (token) {
      const payload = this.getPayload(token);
      // Check if user_id is 1
      if (payload && payload.user_id === 1) {
        this.adminSignal.set(true);
      } else {
        this.adminSignal.set(false);
      }
    } else {
      this.adminSignal.set(false);
    }
  }

  private getPayload(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }
}
