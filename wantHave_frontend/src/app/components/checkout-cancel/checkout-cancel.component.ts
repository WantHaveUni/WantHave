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
      min-height: 60vh;
      padding: 2rem;
    }

    mat-card {
      max-width: 600px;
      text-align: center;
    }

    h1 {
      color: #ff9800;
      font-size: 2rem;
      margin: 0;
    }

    mat-card-content {
      margin: 2rem 0;
    }

    mat-card-actions {
      display: flex;
      justify-content: center;
      padding: 1rem;
    }
  `]
})
export class CheckoutCancelComponent {}
