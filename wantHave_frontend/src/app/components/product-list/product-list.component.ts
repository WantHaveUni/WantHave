import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Category } from '../../interfaces/category';
import { Product } from '../../interfaces/product';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { CategorySidebarComponent } from '../category-sidebar/category-sidebar.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    RouterLink,
    CategorySidebarComponent,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  loading = true;
  error = '';
  categoryLoading = true;
  categoryError = '';
  selectedCategoryId: number | null = null;
  sortBy: 'newest' | 'price_asc' | 'price_desc' = 'newest';
  searchQuery = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  watchlistIds: Set<number> = new Set();
  currentUserId: number | null = null;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private profileService: ProfileService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.currentUserId = this.authService.getUserId();
    this.fetchCategories();
    this.fetchProducts();
    this.fetchWatchlist();
  }

  fetchWatchlist() {
    this.profileService.getWatchlist().subscribe({
      next: (items) => {
        this.watchlistIds = new Set(items.map(item => item.product.id));
      },
      error: (err) => console.error('Error loading watchlist', err)
    });
  }

  toggleWatchlist(event: Event, product: Product) {
    event.stopPropagation();
    event.preventDefault();

    if (this.watchlistIds.has(product.id)) {
      this.profileService.removeFromWatchlist(product.id).subscribe({
        next: () => this.watchlistIds.delete(product.id),
        error: (err) => console.error('Error removing from watchlist', err)
      });
    } else {
      this.profileService.addToWatchlist(product.id).subscribe({
        next: () => this.watchlistIds.add(product.id),
        error: (err: any) => console.error('Error adding to watchlist', err)
      });
    }
  }

  fetchProducts(categoryId: number | null = this.selectedCategoryId) {
    this.loading = true;
    this.error = '';

    this.productService.list(categoryId).subscribe({
      next: (products) => {
        this.products = products;
        this.sortProducts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.error = 'Could not load products. Please try again later.';
        this.loading = false;
      },
    });
  }

  sortProducts() {
    switch (this.sortBy) {
      case 'newest':
        this.products.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Newest first
        });
        break;
      case 'price_asc':
        this.products.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price_desc':
        this.products.sort((a, b) => Number(b.price) - Number(a.price));
        break;
    }
  }

  onSortChange() {
    this.sortProducts();
  }

  fetchCategories() {
    this.categoryLoading = true;
    this.categoryError = '';

    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoryLoading = false;
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.categoryError = 'Could not load categories.';
        this.categoryLoading = false;
      },
    });
  }

  onCategoryChange(categoryId: number | null) {
    this.selectedCategoryId = categoryId;
    this.fetchProducts(categoryId);
  }

  imageUrl(product: Product): string | null {
    if (!product.image) {
      return null;
    }
    if (product.image.startsWith('http')) {
      return product.image;
    }
    return product.image.startsWith('/') ? product.image : `/${product.image}`;
  }

  get filteredProducts(): Product[] {
    let filtered = this.products;

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }

    // Price filter
    if (this.minPrice !== null && this.minPrice >= 0) {
      filtered = filtered.filter(product => Number(product.price) >= this.minPrice!);
    }
    if (this.maxPrice !== null && this.maxPrice >= 0) {
      filtered = filtered.filter(product => Number(product.price) <= this.maxPrice!);
    }

    return filtered;
  }

  clearSearch() {
    this.searchQuery = '';
  }

  clearPriceFilter() {
    this.minPrice = null;
    this.maxPrice = null;
  }
}
