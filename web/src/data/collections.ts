import { Collection } from '../types';

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

export const categories = [
  { id: '1', name: 'Electronics', icon: 'https://antdisplay.com/pub/media/Blog/3_1.png', count: 2341 },
  { id: '2', name: 'Fashion', icon: 'https://images.squarespace-cdn.com/content/v1/663106aa8729ca13650cbd51/1720548964054-VQYASPLKFNLO56R69O59/image-asset.jpeg', count: 1876 },
  { id: '3', name: 'Home & Garden', icon: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&h=600&fit=crop', count: 1543 },
  { id: '4', name: 'Food & Beverages', icon: 'https://cdn-icons-png.flaticon.com/512/3859/3859737.png', count: 987 },
  { id: '5', name: 'Sports & Outdoors', icon: 'https://img.freepik.com/free-photo/sports-tools_53876-138077.jpg?semt=ais_hybrid&w=740&q=80', count: 321 },
  { id: '6', name: 'Books & Media', icon: 'https://collegeinfogeek.com/wp-content/uploads/2018/11/Essential-Books.jpg', count: 654 },
  { id: '7', name: 'Automotive', icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzP1IHcPzRNn_8IiizfTCYpjMbjN17Vlb1wQ&s', count: 234 },
  { id: '8', name: 'Beauty & Personal Care', icon: 'https://images.verifiedmarketresearch.com/assets/Top-7-personal-care-product-companies-empowering-beauty-and-enhancing-well-being.jpg', count: 876 },
  { id: '9', name: 'Toys & Games', icon: 'https://media.istockphoto.com/id/1435512685/photo/childrens-things-hang-on-a-hanger-in-a-clothing-store.jpg?s=612x612&w=0&k=20&c=14YFAd0nE0yTll8O6gmqpGIa8cfk_I2LsyISDAyL9G8=', count: 543 },
  { id: '10', name: 'Crafts & Handmade', icon: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop', count: 432 }
];