import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../interfaces/category';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/market/categories/';

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.baseUrl);
  }
}
