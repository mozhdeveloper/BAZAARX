import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

export interface CategoryItem {
    id: string;
    name: string;
    image: string;
    productCount?: number;
}

interface CategoryCarouselProps {
    categories: CategoryItem[];
    selectedCategory: string;
    onCategorySelect: (categoryName: string) => void;
    showProductCount?: boolean;
    className?: string;
}

export default function CategoryCarousel({
    categories,
    selectedCategory,
    onCategorySelect,
    showProductCount = false,
    className = '',
}: CategoryCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            const newScrollLeft =
                scrollContainerRef.current.scrollLeft +
                (direction === 'left' ? -scrollAmount : scrollAmount);

            scrollContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div className={`relative bg-white rounded-xl shadow-sm border border-gray-100 py-6 px-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-xl font-bold text-gray-800">
                    Explore Popular Categories
                </h2>
                <button
                    onClick={() => onCategorySelect('All Categories')}
                    className="text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] transition-colors flex items-center gap-1"
                >
                    View All
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Carousel Container */}
            <div className="relative group">
                {/* Left Arrow */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-50 hidden md:flex"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                </Button>

                {/* Scrollable Categories */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth px-2 py-2"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {categories.map((category, index) => {
                        const isSelected = selectedCategory === category.name;

                        return (
                            <motion.button
                                key={category.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => onCategorySelect(category.name)}
                                className="flex flex-col items-center gap-3 flex-shrink-0 group/item focus:outline-none"
                                aria-label={`Select ${category.name} category`}
                            >
                                {/* Circular Image Container */}
                                <div
                                    className={`relative w-28 h-28 rounded-full overflow-hidden transition-all duration-300 ${isSelected
                                        ? 'ring-4 ring-[var(--brand-primary)] ring-offset-2 shadow-lg scale-105'
                                        : 'ring-2 ring-gray-200 hover:ring-[var(--brand-primary)]/50 hover:shadow-md hover:scale-105'
                                        }`}
                                >
                                    <img
                                        src={category.image}
                                        alt={category.name}
                                        className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300"
                                    />

                                    {/* Overlay on hover */}
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 ${isSelected ? 'opacity-100' : ''
                                            }`}
                                    />
                                </div>

                                {/* Category Name */}
                                <div className="text-center max-w-[112px]">
                                    <p
                                        className={`text-sm font-semibold transition-colors duration-200 line-clamp-2 ${isSelected
                                            ? 'text-[var(--brand-primary)]'
                                            : 'text-gray-700 group-hover/item:text-[var(--brand-primary)]'
                                            }`}
                                    >
                                        {category.name}
                                    </p>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Right Arrow */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-50 hidden md:flex"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                </Button>
            </div>

            {/* Mobile Scroll Indicator */}
            <div className="flex justify-center gap-1 mt-4 md:hidden">
                {Array.from({ length: Math.ceil(categories.length / 4) }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-gray-300"
                        aria-hidden="true"
                    />
                ))}
            </div>
        </div>
    );
}
