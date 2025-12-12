'use client';

import { ZoomParallax } from "@/components/ui/zoom-parallax";
import { CategoryShowcase } from "@/components/ui/category-showcase";

export default function CategoryExplorer() {
	const categoryImages = [
		{
			src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
			alt: 'Fashion and style collection',
			category: 'Fashion'
		},
		{
			src: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
			alt: 'Latest electronics and gadgets',
			category: 'Electronics'
		},
		{
			src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
			alt: 'Home and living essentials',
			category: 'Home & Living'
		},
		{
			src: 'https://images.unsplash.com/photo-1576401102123-c06ba2fa4db7?w=800&h=600&fit=crop',
			alt: 'Beauty and health products',
			category: 'Beauty'
		},
		{
			src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
			alt: 'Sports and fitness gear',
			category: 'Sports'
		},
		{
			src: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop',
			alt: 'Food and beverage selection',
			category: 'Food'
		},
		{
			src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
			alt: 'Watches and accessories',
			category: 'Accessories'
		},
	];

	const handleExploreClick = () => {
		// Navigate to categories page or show more categories
		console.log('Exploring all categories...');
	};

	return (
		<div className="w-full bg-white">
			<ZoomParallax images={categoryImages} />
			<CategoryShowcase onExploreClick={handleExploreClick} />
		</div>
	);
}