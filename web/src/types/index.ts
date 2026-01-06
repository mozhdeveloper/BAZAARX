export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  sold: number;
  seller: string;
  sellerRating: number;
  sellerVerified: boolean;
  isFreeShipping: boolean;
  isVerified: boolean;
  location: string;
  description?: string;
  category: string;
  stock?: number;
}

export interface Store {
  id: string;
  name: string;
  logo: string;
  avatar: string;
  banner: string;
  rating: number;
  followers: number;
  products: number;
  totalReviews: number;
  isVerified: boolean;
  description: string;
  location: string;
  categories: string[];
  badges: string[];
}

export interface Collection {
  id: string;
  title: string;
  name: string;
  image: string;
  productCount: number;
  description: string;
  rating: number;
  badge?: 'trending' | 'new' | 'popular';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}