export interface CheckoutSession {
  session_id: string;
  url: string;
  order_id: number;
}

export interface Payment {
  id: number;
  amount: string | number;
  currency: string;
  payment_method_type: string;
  successful: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  product: number;
  product_title: string;
  product_image?: string;
  buyer: number;
  buyer_username: string;
  seller: number;
  seller_username: string;
  price: string | number;
  platform_fee: string | number;
  seller_amount: string | number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  payment?: Payment;
}
