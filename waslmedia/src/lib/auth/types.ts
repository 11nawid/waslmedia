export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  handle: string;
  profilePictureUrl: string | null;
  bannerUrl: string | null;
  subscriberCount: number;
  description?: string | null;
  country?: string | null;
  showCountry?: boolean;
  subscriptions: string[];
  watchLater: string[];
}
