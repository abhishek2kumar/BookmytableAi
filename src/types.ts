export type UserRole = 'user' | 'owner' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: any;
}

export interface DailyTiming {
  open: string;
  close: string;
  closed: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  rating: number;
  avgPrice: number;
  image: string;
  location: string;
  city: string;
  lat?: number;
  lng?: number;
  ownerId: string;
  isOpen: boolean;
  approved: boolean;
  openingHours?: {
    open: string;
    close: string;
    days: string;
  };
  dailyTimings?: {
    [key: string]: DailyTiming;
  };
  isBookingEnabled?: boolean;
  bookingSlots?: string[];
  facilities?: string[];
  offers?: string[];
  menu?: {
    name: string;
    price: number;
    description?: string;
  }[];
  menuImages?: string[];
  secondaryImages?: string[];
  aiSummary?: string;
  aiSummaryUpdatedAt?: any;
  createdAt: any;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantOwnerId: string;
  dateTime: any;
  guests: number;
  userPhone: string;
  status: BookingStatus;
  createdAt: any;
  updatedAt: any;
}

export interface Review {
  id: string;
  restaurantId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  text: string;
  createdAt: any;
}

export const CUISINES = [
  'North Indian',
  'South Indian',
  'Chinese',
  'Italian',
  'Continental',
  'Mexican',
  'Thai',
  'Fast Food',
  'Desserts',
  'Beverages'
];
