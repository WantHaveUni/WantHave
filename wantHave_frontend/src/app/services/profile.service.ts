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

  updateMe(data: any): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.baseUrl}me/`, data);
  }

  updateMeWithFormData(formData: FormData): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.baseUrl}me/`, formData);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}me/`);
  }

  getPurchases(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}purchases/`);
  }

  getListings(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}${userId}/listings/`);
  }

  getWatchlist(): Observable<any[]> {
    return this.http.get<any[]>('/api/market/watchlist/');
  }

  removeFromWatchlist(productId: number): Observable<void> {
    return this.http.delete<void>(`/api/market/watchlist/${productId}/`);
  }

  addToWatchlist(productId: number): Observable<any> {
    return this.http.post<any>('/api/market/watchlist/', { product_id: productId });
  }

  changePassword(data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}me/password/`, data);
  }

  changeEmail(data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}me/email/`, data);
  }

  changeUsername(data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}me/username/`, data);
  }
}