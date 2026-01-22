import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
}

@Injectable({
    providedIn: 'root',
})
export class AdminService {
    private http = inject(HttpClient);
    private readonly baseUrl = '/api/market/users/';

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.baseUrl);
    }

    deleteUser(userId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}${userId}/`);
    }
}
