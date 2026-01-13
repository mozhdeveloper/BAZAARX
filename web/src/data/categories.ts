export interface Category {
  id: string;
  name: string;
  description?: string;
  image: string;
  productCount: number;
}

export const categories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Phones, laptops, gadgets and more',
    image: '📱',
    productCount: 1245
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Clothing, shoes, accessories',
    image: '👗',
    productCount: 2341
  },
  {
    id: 'home-garden',
    name: 'Home & Garden',
    description: 'Furniture, decorations, plants',
    image: '🏠',
    productCount: 876
  },
  {
    id: 'food-beverages',
    name: 'Food & Beverages',
    description: 'Local delicacies, snacks, drinks',
    image: '🍽️',
    productCount: 567
  },
  {
    id: 'sports-outdoors',
    name: 'Sports & Outdoors',
    description: 'Athletic gear, camping equipment',
    image: '⚽',
    productCount: 432
  },
  {
    id: 'books-media',
    name: 'Books & Media',
    description: 'Books, magazines, educational',
    image: '📚',
    productCount: 298
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Car parts, accessories, tools',
    image: '🚗',
    productCount: 654
  },
  {
    id: 'beauty-personal',
    name: 'Beauty & Personal Care',
    description: 'Skincare, makeup, wellness',
    image: '💄',
    productCount: 789
  },
  {
    id: 'toys-games',
    name: 'Toys & Games',
    description: 'Children toys, board games',
    image: '🧸',
    productCount: 345
  },
  {
    id: 'crafts-handmade',
    name: 'Crafts & Handmade',
    description: 'Filipino crafts, handmade items',
    image: '🎨',
    productCount: 123
  }
];

export const trendingCategories = categories.slice(0, 6);