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
  active_listings_count: number;
  sold_items_count: number;
  member_since: string | null;
}