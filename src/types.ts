export type UserRole = 'user' | 'owner' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  favorites?: string[];
  createdAt: any;
}

export interface TimeRange {
  open: string;
  close: string;
}

export interface DailyTiming {
  ranges: TimeRange[];
  closed: boolean;
}

export interface SlotCategory {
  id: string;
  name: string;
  slots: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  images: string[];
}

export interface LiveMenuItem {
  id: string;
  name: string;
  description?: string;
  image?: string;
  rating?: number;
  ratingCount?: number;
  price: number;
  isAvailable: boolean;
  category?: string;
  isVeg?: boolean;
  availableDays?: string[];
  availableStartTime?: string;
  availableEndTime?: string;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  terms?: string;
  promoCode?: string;
  validFrom?: string;
  validUntil?: string;
  image?: string;
  isBreakfast?: boolean;
  isLunch?: boolean;
  isDinner?: boolean;
}

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  image?: string;
  videoUrl?: string; // Youtube link
  active: boolean;
  validFrom?: string;
  validUntil?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  legalEntityName?: string;
  description: string;
  cuisine: string[];
  rating: number;
  avgPrice: number;
  image: string;
  location: string; // Area Name
  address?: string; // Full Address
  city: string;
  state?: string;
  pincode?: string;
  country?: string;
  shopNo?: string;
  floor?: string;
  area: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  ownerId: string;
  isOpen: boolean; // Live on Portal
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
  instantBookingLimit?: number;
  blackoutDates?: string[];
  slotCategories?: SlotCategory[];
  bookingSlots?: string[];
  facilities?: string[];
  offers?: Offer[];
  advertisements?: Advertisement[];
  signatureDishes?: {
    name: string;
    price: number;
    description?: string;
  }[];
  menuImages?: string[];
  secondaryImages?: string[];
  foodImages?: string[];
  ambienceImages?: string[];
  popularDishes?: string[];
  menuCategories?: MenuCategory[];
  liveMenu?: LiveMenuItem[];
  gallery?: { [category: string]: string[] };
  contactNumber?: string;
  contactEmail?: string;
  globalRank?: number;
  aiSummary?: string;
  aiSummaryUpdatedAt?: any;
  lastModifiedBy?: string;
  lastModifiedByType?: 'admin' | 'owner';
  ownerEmail?: string;
  gstPercentage?: number;
  createdAt: any;
  updatedAt?: any;
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
