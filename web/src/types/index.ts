export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  sold: number;
  seller: string;
  isFreeShipping: boolean;
  isVerified?: boolean;
  location: string;
  description?: string;
  category: string;
}

export interface Store {
  id: string;
  name: string;
  logo: string;
  banner: string;
  rating: number;
  followers: number;
  products: number;
  isVerified: boolean;
  description: string;
  location: string;
}

export interface Collection {
  id: string;
  title: string;
  image: string;
  productCount: number;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}