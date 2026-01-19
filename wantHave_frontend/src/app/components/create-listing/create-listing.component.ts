import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AiService } from '../../services/ai.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../interfaces/category';

@Component({
    selector: 'app-create-listing',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatIconModule,
    ],
    templateUrl: './create-listing.component.html',
    styleUrl: './create-listing.component.scss',
})
export class CreateListingComponent {
    // Dependency injection using inject() pattern from course
    private http = inject(HttpClient);
    private router = inject(Router);
    private snackbar = inject(MatSnackBar);
    private aiService = inject(AiService);
    private categoryService = inject(CategoryService);

    // Reactive state using signals
    isAnalyzing = signal(false);
    previewMode = signal(false);
    selectedFile = signal<File | null>(null);
    imagePreviewUrl = signal<string | null>(null);
    categories = signal<Category[]>([]);

    // Form group following course pattern
    listingFormGroup = new FormGroup({
        title: new FormControl('', Validators.required),
        description: new FormControl('', Validators.required),
        category_id: new FormControl<number | null>(null),
        price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    });

    // Price range from AI suggestion
    priceMin = signal<number | null>(null);
    priceMax = signal<number | null>(null);

    constructor() {
        // Load categories from backend
        this.categoryService.list().subscribe({
            next: (cats) => this.categories.set(cats),
            error: () => this.snackbar.open('Failed to load categories', 'OK', { duration: 3000 }),
        });
    }

    /**
     * Handle file selection from input
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.selectedFile.set(file);

            // Create preview URL
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreviewUrl.set(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    /**
     * Analyze the selected image with AI
     */
    analyzeWithAI(): void {
        const file = this.selectedFile();
        if (!file) {
            this.snackbar.open('Please select an image first', 'OK', { duration: 3000 });
            return;
        }

        this.isAnalyzing.set(true);

        this.aiService.analyzeImage(file).subscribe({
            next: (suggestion) => {
                // Pre-fill the form with AI suggestions
                this.listingFormGroup.patchValue({
                    title: suggestion.title,
                    description: suggestion.description,
                    category_id: suggestion.category_id,
                    price: suggestion.price_min, // Use minimum as default
                });

                // Store price range for display
                this.priceMin.set(suggestion.price_min);
                this.priceMax.set(suggestion.price_max);

                // Reload categories in case a new one was created
                this.categoryService.list().subscribe({
                    next: (cats) => this.categories.set(cats),
                });

                this.snackbar.open('AI analysis complete! Review and edit the suggestions.', 'OK', {
                    duration: 3000,
                });
                this.isAnalyzing.set(false);
            },
            error: (err) => {
                this.snackbar.open(err.error?.error || 'AI analysis failed', 'OK', { duration: 5000 });
                this.isAnalyzing.set(false);
            },
        });
    }

    /**
     * Toggle preview mode
     */
    togglePreview(): void {
        this.previewMode.set(!this.previewMode());
    }

    /**
     * Submit the listing to the backend
     */
    createListing(): void {
        if (!this.listingFormGroup.valid) {
            this.snackbar.open('Please fill all required fields', 'OK', { duration: 3000 });
            return;
        }

        const file = this.selectedFile();
        if (!file) {
            this.snackbar.open('Please select an image', 'OK', { duration: 3000 });
            return;
        }

        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append('title', this.listingFormGroup.value.title || '');
        formData.append('description', this.listingFormGroup.value.description || '');
        formData.append('price', String(this.listingFormGroup.value.price || 0));
        formData.append('image', file);

        if (this.listingFormGroup.value.category_id) {
            formData.append('category_id', String(this.listingFormGroup.value.category_id));
        }

        this.http.post('/api/market/products/', formData).subscribe({
            next: () => {
                this.snackbar.open('Listing created successfully!', 'OK', { duration: 3000 });
                this.router.navigate(['/products']);
            },
            error: (err) => {
                this.snackbar.open(err.error?.detail || 'Failed to create listing', 'OK', {
                    duration: 5000,
                });
            },
        });
    }
}
