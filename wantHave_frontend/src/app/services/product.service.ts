import { HttpClient } from '@angular/common/http';
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

  // fetches the list of all products
  list(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl);
  }

  // fetches the details of a single product by its id
  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}${id}/detail/`);
  }
}
