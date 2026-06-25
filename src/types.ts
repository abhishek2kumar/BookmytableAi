export interface StoryView {
  userId: string;
  userName: string;
  userPhoto?: string;
  viewedAt: any;
}

export interface Story {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  city: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: any;
  expiresAt: any;
  views: StoryView[];
}

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

export interface DiningCollection {
  id: string;
  name: string;
  image: string;
  slug: string;
  description?: string;
  city?: string; // Optional: specify if it belongs to a specific city e.g. "Dubai"
  restaurantIds?: string[];
  isActive: boolean;
  order: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  images: string[];
}

export interface CustomizationOption {
  name: string;
  price: number;
  isVeg?: boolean;
  isAvailable?: boolean;
}

export interface CustomizationCategory {
  id: string;
  name: string;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: CustomizationOption[];
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
  customizations?: CustomizationCategory[];
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

export interface Mall {
  id: string;
  name: string;
  image?: string;
  location: string;
  address?: string;
  area: string;
  city: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface AutoApprovalThreshold {
  day: string; // 'Monday', 'Tuesday', etc.
  thresholds: {
    [category: string]: number; // e.g. 'Breakfast': 10, 'Lunch': 10
  };
}

export interface BlackoutSlot {
  date: string; // YYYY-MM-DD
  categories: string[]; // e.g. ['Breakfast', 'Lunch']
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
  partnerEmails?: string[];
  mallName?: string;
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
  isTakeawayEnabled?: boolean;
  isQrMenuEnabled?: boolean;
  instantBookingLimit?: number;
  autoApprovalThresholds?: AutoApprovalThreshold[];
  blackoutDates?: string[]; // Legacy
  blackoutSlots?: BlackoutSlot[];
  slotCategories?: SlotCategory[];
  bookingSlots?: string[];
  facilities?: string[];
  collections?: string[]; // Array of collection slugs
  offers?: Offer[];
  advertisements?: Advertisement[];
  signatureDishes?: {
    name: string;
    price: number;
    description?: string;
  }[];
  menuImages?: string[];
  secondaryImages?: (string | { url: string; category: string })[];
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
  date?: string;
  time?: string;
  dateTime?: any;
  guests: number;
  guestsLabel?: string;
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

export type OrderType = 'dine_in' | 'takeaway';
export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
}

export interface Order {
  id: string;
  userId?: string; // Optional if guest checkout
  userName: string;
  userPhone: string;
  restaurantId: string;
  restaurantName: string;
  restaurantOwnerId: string;
  type: OrderType;
  tableNumber?: string; // Only for dine_in
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  tokenNumber?: string;
  createdAt: any;
  updatedAt: any;
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
