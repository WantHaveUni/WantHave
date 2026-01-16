import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../interfaces/product';

// service for interacting with product-related backend API endpoints
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/market/products/';

  // fetches the list of all products, optionally filtered by category
  list(categoryId?: number | null): Observable<Product[]> {
    let params = new HttpParams();
    if (categoryId) {
      params = params.set('category', categoryId.toString());
    }
    return this.http.get<Product[]>(this.baseUrl, { params });
  }

  // fetches the details of a single product by its id
  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}${id}/detail/`);
  }
}
