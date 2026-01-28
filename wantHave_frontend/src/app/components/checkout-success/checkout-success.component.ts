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
          <p>You will receive a confirmation email shortly.</p>
          <p class="chat-hint">Check your <a routerLink="/chat">chat</a> for order details.</p>
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
      min-height: calc(100vh - 64px);
      padding: 32px;
      background: #050505;
      position: relative;
    }

    .success-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        linear-gradient(rgba(0, 243, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 243, 255, 0.02) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
    }

    mat-card {
      max-width: 600px;
      text-align: center;
      background: rgba(10, 10, 10, 0.65);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0;
      position: relative;
      z-index: 1;
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    mat-card::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      width: 20px;
      height: 20px;
      border-top: 2px solid #00f3ff;
      border-left: 2px solid #00f3ff;
    }

    mat-card::after {
      content: '';
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 20px;
      height: 20px;
      border-bottom: 2px solid #bc13fe;
      border-right: 2px solid #bc13fe;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    h1 {
      color: #00f3ff;
      font-size: 24px;
      margin: 0;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 3px;
      text-shadow: 0 0 20px rgba(0, 243, 255, 0.5);
    }

    mat-card-content {
      margin: 32px 0;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
    }

    .chat-hint {
      margin-top: 16px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
    }

    .chat-hint a {
      color: #00f3ff;
      text-decoration: none;
      font-weight: 600;
      transition: text-shadow 0.3s ease;
    }

    .chat-hint a:hover {
      text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
    }

    mat-card-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    a[mat-raised-button] {
      background: transparent !important;
      border: 1px solid #00f3ff !important;
      color: #00f3ff !important;
      border-radius: 0 !important;
      font-family: 'Courier New', monospace !important;
      text-transform: uppercase !important;
      letter-spacing: 2px !important;
      font-size: 11px !important;
    }

    a[mat-button] {
      color: rgba(255, 255, 255, 0.5) !important;
      font-family: 'Courier New', monospace !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      font-size: 11px !important;
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
