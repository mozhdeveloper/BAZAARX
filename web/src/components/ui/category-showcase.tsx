import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CategoryShowcaseProps {
	onExploreClick?: () => void;
}

export function CategoryShowcase({ onExploreClick }: CategoryShowcaseProps) {
	const navigate = useNavigate();
	const categories = [
		{
			id: 'fashion',
			name: 'Fashion & Style',
			description: 'Trendy clothes and accessories',
			image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
			color: 'from-pink-500 to-rose-500'
		},
		{
			id: 'electronics',
			name: 'Electronics',
			description: 'Latest gadgets and devices',
			image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
			color: 'from-blue-500 to-cyan-500'
		},
		{
			id: 'home',
			name: 'Home & Living',
			description: 'Furniture and home decor',
			image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
			color: 'from-green-500 to-emerald-500'
		},
		{
			id: 'beauty',
			name: 'Beauty & Health',
			description: 'Skincare and wellness products',
			image: 'https://images.unsplash.com/photo-1576401102123-c06ba2fa4db7?w=400&h=300&fit=crop',
			color: 'from-purple-500 to-violet-500'
		},
		{
			id: 'sports',
			name: 'Sports & Fitness',
			description: 'Athletic gear and equipment',
			image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
			color: 'from-orange-500 to-red-500'
		},
		{
			id: 'food',
			name: 'Food & Beverages',
			description: 'Local and international cuisine',
			image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
			color: 'from-yellow-500 to-orange-500'
		}
	];

	return (
		<section className="py-20 px-6 bg-white">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="text-center mb-16"
				>
					<h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-primary">
						Shop by Category
					</h2>
					<p className="text-xl text-gray-600 max-w-3xl mx-auto">
						From fashion to electronics, discover everything you need in one place.
						Each category is carefully curated with the best products from trusted sellers.
					</p>
				</motion.div>

				{/* Categories Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
					{categories.map((category, index) => (
						<motion.div
							key={category.id}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.1 }}
							whileHover={{ y: -8, scale: 1.02 }}
							className="group cursor-pointer"
							onClick={() => navigate(`/shop?category=${encodeURIComponent(category.name)}`)}
						>
							<div className="relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
								<div className="aspect-[4/3] overflow-hidden">
									<img
										src={category.image}
										alt={category.name}
										className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
									/>
									<div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-20 group-hover:opacity-30 transition-opacity duration-300`} />
								</div>

								<div className="p-6">
									<h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[var(--brand-primary)] transition-colors">
										{category.name}
									</h3>
									<p className="text-gray-600 text-sm">
										{category.description}
									</p>
								</div>

								{/* Hover overlay */}
								<div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 rounded-2xl" />
							</div>
						</motion.div>
					))}
				</div>

				{/* Explore Button */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					whileInView={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.6 }}
					className="text-center"
				>
					<Button
						onClick={onExploreClick || (() => navigate('/shop'))}
						size="lg"
						className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
					>
						Explore All Categories
						<ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
					</Button>
					<p className="text-sm text-gray-500 mt-4">
						Over 50 categories with thousands of products waiting for you
					</p>
				</motion.div>
			</div>
		</section>
	);
}