import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-checkout-cancel',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule],
  template: `
    <div class="cancel-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <h1>Checkout Cancelled</h1>
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Your checkout was cancelled. No charges were made.</p>
          <p>Feel free to continue browsing or try again later.</p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-raised-button color="primary" routerLink="/products">
            Back to Products
          </a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .cancel-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 64px);
      padding: 32px;
      background: #050505;
      position: relative;
    }

    .cancel-container::before {
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
      border-top: 2px solid #ff4757;
      border-left: 2px solid #ff4757;
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
      color: #ff4757;
      font-size: 24px;
      margin: 0;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 3px;
      text-shadow: 0 0 20px rgba(255, 71, 87, 0.5);
    }

    mat-card-content {
      margin: 32px 0;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
    }

    mat-card-actions {
      display: flex;
      justify-content: center;
      padding: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    a[mat-raised-button] {
      background: transparent !important;
      border: 1px solid #bc13fe !important;
      color: #bc13fe !important;
      border-radius: 0 !important;
      font-family: 'Courier New', monospace !important;
      text-transform: uppercase !important;
      letter-spacing: 2px !important;
      font-size: 11px !important;
    }
  `]
})
export class CheckoutCancelComponent { }
