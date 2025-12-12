export interface Category {
  id: string;
  name: string;
  description?: string;
  icon: string;
  productCount: number;
}

export const categories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Phones, laptops, gadgets and more',
    icon: '📱',
    productCount: 1245
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Clothing, shoes, accessories',
    icon: '👗',
    productCount: 2341
  },
  {
    id: 'home-garden',
    name: 'Home & Garden',
    description: 'Furniture, decorations, plants',
    icon: '🏠',
    productCount: 876
  },
  {
    id: 'food-beverages',
    name: 'Food & Beverages',
    description: 'Local delicacies, snacks, drinks',
    icon: '🍽️',
    productCount: 567
  },
  {
    id: 'sports-outdoors',
    name: 'Sports & Outdoors',
    description: 'Athletic gear, camping equipment',
    icon: '⚽',
    productCount: 432
  },
  {
    id: 'books-media',
    name: 'Books & Media',
    description: 'Books, magazines, educational',
    icon: '📚',
    productCount: 298
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Car parts, accessories, tools',
    icon: '🚗',
    productCount: 654
  },
  {
    id: 'beauty-personal',
    name: 'Beauty & Personal Care',
    description: 'Skincare, makeup, wellness',
    icon: '💄',
    productCount: 789
  },
  {
    id: 'toys-games',
    name: 'Toys & Games',
    description: 'Children toys, board games',
    icon: '🧸',
    productCount: 345
  },
  {
    id: 'crafts-handmade',
    name: 'Crafts & Handmade',
    description: 'Filipino crafts, handmade items',
    icon: '🎨',
    productCount: 123
  }
];

export const trendingCategories = categories.slice(0, 6);