export interface UserSummary {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

import { Category } from './category';

export interface Product {
  id: number;
  seller?: UserSummary;
  seller_username?: string;
  category?: Category | null;
  title: string;
  description: string;
  price: string | number;
  image?: string;
  created_at: string;
  status: string;
}
