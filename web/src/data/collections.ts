import { Collection, Category } from '../types';

export const collections: Collection[] = [
  {
    id: '1',
    title: 'Tech Essentials',
    name: 'Tech Essentials',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
    productCount: 234,
    rating: 4.8,
    description: 'Latest gadgets and electronics for the modern Filipino lifestyle',
    badge: 'trending'
  },
  {
    id: '2',
    title: 'Local Delicacies',
    name: 'Local Delicacies',
    image: 'https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=800&h=600&fit=crop',
    productCount: 189,
    rating: 4.9,
    description: 'Authentic Filipino food products and delicacies from across the Philippines',
    badge: 'popular'
  },
  {
    id: '3',
    title: 'Handmade Crafts',
    name: 'Handmade Crafts',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
    productCount: 156,
    rating: 4.7,
    description: 'Traditional Filipino handicrafts made by local artisans',
    badge: 'new'
  },
  {
    id: '4',
    title: 'Sustainable Living',
    name: 'Sustainable Living',
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&h=600&fit=crop',
    productCount: 98,
    rating: 4.6,
    description: 'Eco-friendly lifestyle products for conscious consumers'
  },
  {
    id: '5',
    title: 'Fashion Forward',
    name: 'Fashion Forward',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop',
    productCount: 312,
    rating: 4.8,
    description: 'Trendy clothing and accessories from Filipino designers',
    badge: 'trending'
  },
  {
    id: '6',
    title: 'Home Essentials',
    name: 'Home Essentials',
    image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&h=600&fit=crop',
    productCount: 245,
    rating: 4.5,
    description: 'Everything you need to make your house a home'
  }
];

export const featuredCollections: Collection[] = collections.slice(0, 4);

export const categories: Category[] = [
  { id: '1', name: 'Electronics', icon: '📱', count: 2341 },
  { id: '2', name: 'Fashion', icon: '👗', count: 1876 },
  { id: '3', name: 'Home & Garden', icon: '🏠', count: 1543 },
  { id: '4', name: 'Food & Beverages', icon: '🍯', count: 987 },
  { id: '5', name: 'Beauty & Personal Care', icon: '💄', count: 876 },
  { id: '6', name: 'Books', icon: '📚', count: 654 },
  { id: '7', name: 'Music & Instruments', icon: '🎵', count: 432 },
  { id: '8', name: 'Sports & Fitness', icon: '⚽', count: 321 },
  { id: '9', name: 'Baby & Kids', icon: '🍼', count: 543 },
  { id: '10', name: 'Automotive', icon: '🚗', count: 234 }
];