import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AISuggestion } from '../interfaces/ai-suggestion';

@Injectable({
    providedIn: 'root',
})
export class AiService {
    private http = inject(HttpClient);
    private readonly baseUrl = '/api/market/products/';

    /**
     * Analyze a product image using AI and get suggestions for listing fields.
     * @param file The image file to analyze
     * @returns Observable with AI suggestions for title, description, category, and price
     */
    analyzeImage(file: File): Observable<AISuggestion> {
        const formData = new FormData();
        formData.append('image', file);
        return this.http.post<AISuggestion>(`${this.baseUrl}autofill/`, formData);
    }
}
