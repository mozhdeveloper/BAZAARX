export interface Store {
    id: string;
    name: string;
    logo: string;
    banner: string;
    verified: boolean;
    rating: number;
    followers: number;
    description: string;
    location: string;
    products: string[]; // URLs of product images
    categories: string[];
}

export const officialStores: Store[] = [
    {
        id: '1',
        name: 'Nike Official',
        logo: '🏃',
        banner: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800',
        verified: true,
        rating: 4.9,
        followers: 125000,
        description: 'Just Do It. Official Nike Store Philippines.',
        location: 'Metro Manila',
        products: [
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200',
            'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=200',
        ],
        categories: ['Sports', 'Fashion', 'Shoes']
    },
    {
        id: '2',
        name: 'Adidas Store',
        logo: '👟',
        banner: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800',
        verified: true,
        rating: 4.8,
        followers: 98000,
        description: 'Impossible is Nothing. Official Adidas Store.',
        location: 'Taguig',
        products: [
            'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200',
            'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=200',
            'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=200',
        ],
        categories: ['Sports', 'Fashion', 'Shoes']
    },
    {
        id: '3',
        name: 'Samsung Philippines',
        logo: '📱',
        banner: 'https://images.unsplash.com/photo-1610945265078-386f6874bafc?w=800',
        verified: true,
        rating: 4.9,
        followers: 250000,
        description: 'Inspire the World, Create the Future.',
        location: 'Manila',
        products: [
            'https://images.unsplash.com/photo-1610945415295-d97bf06b2b1c?w=200',
            'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200',
        ],
        categories: ['Electronics', 'Mobile']
    },
    {
        id: '4',
        name: 'Uniqlo PH',
        logo: '👕',
        banner: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800',
        verified: true,
        rating: 4.9,
        followers: 180000,
        description: 'LifeWear. Simple made better.',
        location: 'Makati',
        products: [
            'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200',
            'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200',
        ],
        categories: ['Fashion', 'Clothing']
    },
];
