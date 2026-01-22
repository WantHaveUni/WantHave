import { UserSummary } from './product';

export interface UserProfile {
  id: number;
  user: UserSummary;
  bio: string;
  profile_picture: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  postal_code: string | null;
  phone: string | null;
  phone_verified: boolean;
  birth_year: number | null;
  gender: 'female' | 'male' | 'diverse' | 'none' | null;
  active_listings_count: number;
  sold_items_count: number;
  member_since: string | null;
}