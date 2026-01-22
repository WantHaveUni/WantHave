import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Product } from '../../interfaces/product';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { PaymentService } from '../../services/payment.service';

interface DetailItem {
  label: string;
  value: string;
}

// this component shows the details of a single product and allows interaction if the user is authenticated
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private paymentService = inject(PaymentService);
  readonly auth = inject(AuthService);

  product: Product | null = null;
  loading = true;
  error = '';
  details: DetailItem[] = [];
  processingCheckout = false;

  // Edit Modal State
  showEditModal = false;
  editLoading = false;
  editError = '';
  editData: Partial<Product> = {};

  // on component initialization, fetch the product based on the route parameter
  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error = 'Invalid product id.';
      this.loading = false;
      return;
    }

    this.fetchProduct(id);
  }

  // returns the full image URL for the product, or null if no image is available
  imageUrl(product: Product): string | null {
    if (!product.image) {
      return null;
    }
    if (product.image.startsWith('http')) {
      return product.image;
    }
    return product.image.startsWith('/') ? product.image : `/${product.image}`;
  }

  // returns the seller's name for display purposes
  sellerName(product: Product): string {
    return product.seller?.username || product.seller_username || 'Unknown';
  }

  // checks if the current authenticated user is the owner of the product
  get isOwner(): boolean {
    if (!this.product) {
      return false;
    }
    const username = this.auth.username();
    const seller = this.product.seller?.username || this.product.seller_username;
    return !!username && !!seller && username === seller;
  }

  // checks if the user can interact with the product (i.e., is authenticated and not the owner)
  get canInteract(): boolean {
    return this.auth.isAuthenticated() && !this.isOwner;
  }

  messageSeller() {
    if (!this.product?.seller_id) {
      console.error('Seller ID not available');
      return;
    }
    // Navigate to chat page with seller's user ID and product ID
    this.router.navigate(['/chat'], {
      queryParams: {
        userId: this.product.seller_id,
        productId: this.product.id
      }
    });
  }

  async startCheckout() {
    if (!this.product) return;

    if (!confirm(`Proceed to checkout for "${this.product.title}"?`)) {
      return;
    }

    this.processingCheckout = true;

    // Build redirect URLs with current origin
    const origin = window.location.origin;
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/products/${this.product.id}`;

    this.paymentService
      .createCheckoutSession(this.product.id, successUrl, cancelUrl)
      .subscribe({
        next: async (session) => {
          try {
            // Redirect to Stripe Checkout using the URL
            await this.paymentService.redirectToCheckout(session.url);
          } catch (error) {
            console.error('Stripe redirect failed', error);
            alert('Failed to redirect to checkout. Please try again.');
            this.processingCheckout = false;
          }
        },
        error: (err) => {
          console.error('Checkout session creation failed', err);
          alert('Failed to start checkout: ' + (err.error?.detail || 'Unknown error'));
          this.processingCheckout = false;
        },
      });
  }

  // Edit Functions
  openEditModal() {
    if (!this.product) return;
    this.editData = {
      title: this.product.title,
      description: this.product.description,
      price: this.product.price
    };
    this.showEditModal = true;
    this.editError = '';
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editData = {};
    this.editError = '';
  }

  saveEdit() {
    if (!this.product || !this.editData.title || !this.editData.price) {
      this.editError = 'Title and price are required.';
      return;
    }

    this.editLoading = true;
    this.editError = '';

    this.productService.update(this.product.id, this.editData).subscribe({
      next: (updatedProduct) => {
        this.product = updatedProduct;
        this.details = this.buildDetails(updatedProduct);
        this.closeEditModal();
        this.editLoading = false;
      },
      error: (err) => {
        console.error('Failed to update product', err);
        this.editError = err.error?.detail || 'Failed to update product.';
        this.editLoading = false;
      }
    });
  }

  deleteProduct() {
    if (!this.product) return;

    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    this.productService.delete(this.product.id).subscribe({
      next: () => {
        alert('Product deleted successfully.');
        this.router.navigate(['/products']);
      },
      error: (err) => {
        console.error('Failed to delete product', err);
        alert('Failed to delete product: ' + (err.error?.detail || 'Unknown error'));
      }
    });
  }

  // fetches the product details from the service and handles loading and error states
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

  // builds the array of detail items to display for the product
  private buildDetails(product: Product): DetailItem[] {
    const createdAt = product.created_at ? new Date(product.created_at) : null;
    const listed = createdAt ? createdAt.toLocaleDateString() : 'Unknown';
    const categoryName = product.category?.name ?? 'Uncategorized';

    return [
      { label: 'Category', value: categoryName },
      { label: 'Seller', value: this.sellerName(product) },
      { label: 'Status', value: product.status },
      { label: 'Listed', value: listed },
    ];
  }
}
