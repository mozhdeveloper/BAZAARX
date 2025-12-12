import { Collection, Category } from '../types';

export const featuredCollections: Collection[] = [
  {
    id: '1',
    title: 'Tech Essentials',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
    productCount: 234,
    description: 'Latest gadgets and electronics'
  },
  {
    id: '2',
    title: 'Local Delicacies',
    image: 'https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=300&fit=crop',
    productCount: 189,
    description: 'Authentic Filipino food products'
  },
  {
    id: '3',
    title: 'Handmade Crafts',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
    productCount: 156,
    description: 'Traditional Filipino handicrafts'
  },
  {
    id: '4',
    title: 'Sustainable Living',
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=300&fit=crop',
    productCount: 98,
    description: 'Eco-friendly lifestyle products'
  }
];

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