import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Category } from '../../interfaces/category';
import { Product } from '../../interfaces/product';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { CategorySidebarComponent } from '../category-sidebar/category-sidebar.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
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

  constructor(private productService: ProductService, private categoryService: CategoryService) {}

  ngOnInit() {
    this.fetchCategories();
    this.fetchProducts();
  }

  fetchProducts(categoryId: number | null = this.selectedCategoryId) {
    this.loading = true;
    this.error = '';

    this.productService.list().subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.error = 'Could not load products. Please try again later.';
        this.loading = false;
      },
    });
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
}
