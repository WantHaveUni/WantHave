import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Product } from '../../interfaces/product';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';

interface DetailItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  readonly auth = inject(AuthService);

  product: Product | null = null;
  loading = true;
  error = '';
  details: DetailItem[] = [];

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error = 'Invalid product id.';
      this.loading = false;
      return;
    }

    this.fetchProduct(id);
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

  sellerName(product: Product): string {
    return product.seller?.username || product.seller_username || 'Unknown';
  }

  get isOwner(): boolean {
    if (!this.product) {
      return false;
    }
    const username = this.auth.username();
    const seller = this.product.seller?.username || this.product.seller_username;
    return !!username && !!seller && username === seller;
  }

  get canInteract(): boolean {
    return this.auth.isAuthenticated() && !this.isOwner;
  }

  messageSeller() {
    console.info('Message seller is not implemented yet.');
  }

  startCheckout() {
    console.info('Checkout is not implemented yet.');
  }

  private fetchProduct(id: number) {
    this.loading = true;
    this.error = '';
    this.product = null;
    this.details = [];

    this.productService.get(id).subscribe({
      next: (product) => {
        this.product = product;
        this.details = this.buildDetails(product);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load product', err);
        this.error = 'Could not load the product. Please try again later.';
        this.loading = false;
      },
    });
  }

  private buildDetails(product: Product): DetailItem[] {
    const createdAt = product.created_at ? new Date(product.created_at) : null;
    const listed = createdAt ? createdAt.toLocaleDateString() : 'Unknown';

    return [
      { label: 'Seller', value: this.sellerName(product) },
      { label: 'Status', value: product.status },
      { label: 'Listed', value: listed },
    ];
  }
}
