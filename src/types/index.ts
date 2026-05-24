export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  imageUrl: string;
  images?: string[];
  stock: number;
  featured: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    imageUrl: string;
  }[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  createdAt: number;
  updatedAt?: number;
  notes?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  address?: string;
  isAdmin: boolean;
  createdAt: number;
}

export interface SiteSettings {
  bannerText: string;
  bannerEnabled: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  announcement: string;
  announcementEnabled: boolean;
  featuredCategoryTitle: string;
  aboutText: string;
  specialOfferEnabled: boolean;
  specialOfferTitle: string;
  specialOfferDescription: string;
  specialOfferImageUrl: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  read: boolean;
  createdAt: number;
}
