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

  login(credentials: Credentials) {
    return this.http.post<TokenResponse>('/api/token/', credentials).pipe(
      tap(({ access, refresh }) => {
        localStorage.setItem(this.tokenKey, access);
        localStorage.setItem(this.refreshKey, refresh);
        localStorage.setItem(this.usernameKey, credentials.username);
        this.loggedIn.set(true);
        this.usernameSignal.set(credentials.username);
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
  }

  accessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return this.loggedIn();
  }

  username(): string | null {
    return this.usernameSignal();
  }
}
