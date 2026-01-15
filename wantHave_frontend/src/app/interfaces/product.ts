export interface UserSummary {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Product {
  id: number;
  seller?: UserSummary;
  seller_username?: string;
  title: string;
  description: string;
  price: string | number;
  image?: string;
  created_at: string;
  status: string;
}
