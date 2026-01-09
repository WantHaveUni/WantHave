import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProfile } from '../interfaces/user-profile';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/market/profiles/';

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}me/`);
  }

  updateMe(data: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.baseUrl}me/`, data);
  }

  updateMeWithFormData(formData: FormData): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.baseUrl}me/`, formData);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}me/`);
  }
}