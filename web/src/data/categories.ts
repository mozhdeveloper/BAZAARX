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
    image: 'https://images.unsplash.com/photo-1498049381145-06f1d078d0f3?auto=format&fit=crop&w=300&q=80',
    productCount: 1245
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Clothing, shoes, accessories',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=300&q=80',
    productCount: 2341
  },
  {
    id: 'home-garden',
    name: 'Home & Garden',
    description: 'Furniture, decorations, plants',
    image: 'https://images.unsplash.com/photo-1484154218962-a1c00207099b?auto=format&fit=crop&w=300&q=80',
    productCount: 876
  },
  {
    id: 'food-beverages',
    name: 'Food & Beverages',
    description: 'Local delicacies, snacks, drinks',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80',
    productCount: 567
  },
  {
    id: 'sports-outdoors',
    name: 'Sports & Outdoors',
    description: 'Athletic gear, camping equipment',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=300&q=80',
    productCount: 432
  },
  {
    id: 'books-media',
    name: 'Books & Media',
    description: 'Books, magazines, educational',
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=300&q=80',
    productCount: 298
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Car parts, accessories, tools',
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=300&q=80',
    productCount: 654
  },
  {
    id: 'beauty-personal',
    name: 'Beauty & Personal Care',
    description: 'Skincare, makeup, wellness',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?auto=format&fit=crop&w=300&q=80',
    productCount: 789
  },
  {
    id: 'toys-games',
    name: 'Toys & Games',
    description: 'Children toys, board games',
    image: 'https://images.unsplash.com/photo-1581557991964-125469da3b8a?auto=format&fit=crop&w=300&q=80',
    productCount: 345
  },
  {
    id: 'crafts-handmade',
    name: 'Crafts & Handmade',
    description: 'Filipino crafts, handmade items',
    image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=300&q=80',
    productCount: 123
  }
];

export const trendingCategories = categories.slice(0, 6);