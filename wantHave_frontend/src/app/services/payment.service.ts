import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CheckoutSession, Order } from '../interfaces/payment';
import { loadStripe, Stripe } from '@stripe/stripe-js';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/market';

  // Initialize Stripe (publishable key will be loaded from environment)
  private stripePromise: Promise<Stripe | null>;

  constructor() {
    // Stripe publishable key
    const stripePublishableKey = 'pk_test_51Sor357JB2XCAXasti4lLxOEFhsS2AvWx0y3p12u7g5a7ZlXaPU10wAkuoQZvB8Sv7bVfLPZQ9ytveVyCoG2gWtD00jB5TwoBK';
    this.stripePromise = loadStripe(stripePublishableKey);
  }

  /**
   * Create a checkout session for a product purchase
   */
  createCheckoutSession(
    productId: number,
    successUrl: string,
    cancelUrl: string
  ): Observable<CheckoutSession> {
    return this.http.post<CheckoutSession>(
      `${this.baseUrl}/products/${productId}/create_checkout_session/`,
      {
        success_url: successUrl,
        cancel_url: cancelUrl,
      }
    );
  }

  /**
   * Redirect to Stripe Checkout using the session URL
   */
  async redirectToCheckout(checkoutUrl: string): Promise<void> {
    // Simply redirect to the Stripe Checkout URL
    window.location.href = checkoutUrl;
  }

  /**
   * Get all orders (purchases and sales)
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/`);
  }

  /**
   * Get user's purchases
   */
  getMyPurchases(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/my_purchases/`);
  }

  /**
   * Get user's sales
   */
  getMySales(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/my_sales/`);
  }

  /**
   * Get specific order details
   */
  getOrder(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${orderId}/`);
  }
}
