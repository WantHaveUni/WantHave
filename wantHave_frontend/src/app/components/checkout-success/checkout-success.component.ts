import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="success-container">
      <mat-card *ngIf="!loading">
        <mat-card-header>
          <mat-card-title>
            <h1>✓ Payment Successful!</h1>
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Thank you for your purchase. Your order has been confirmed.</p>
          <p *ngIf="sessionId" class="session-id">Session ID: {{ sessionId }}</p>
          <p>You will receive a confirmation email shortly.</p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-raised-button color="primary" routerLink="/profile">
            View My Orders
          </a>
          <a mat-button routerLink="/products">
            Continue Shopping
          </a>
        </mat-card-actions>
      </mat-card>

      <mat-spinner *ngIf="loading"></mat-spinner>
    </div>
  `,
  styles: [`
    .success-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      padding: 2rem;
    }

    mat-card {
      max-width: 600px;
      text-align: center;
    }

    h1 {
      color: #4caf50;
      font-size: 2rem;
      margin: 0;
    }

    mat-card-content {
      margin: 2rem 0;
    }

    .session-id {
      font-size: 0.85rem;
      color: #666;
      font-family: monospace;
    }

    mat-card-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      padding: 1rem;
    }
  `]
})
export class CheckoutSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  sessionId: string | null = null;
  loading = true;

  ngOnInit() {
    // Get session_id from query params
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!this.sessionId) {
      // Invalid access, redirect to products
      this.router.navigate(['/products']);
      return;
    }

    this.loading = false;
  }
}
