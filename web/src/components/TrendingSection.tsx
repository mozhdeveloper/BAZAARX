import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import ProductCard from './ProductCard';

interface TrendingSectionProps {
    products: Product[];
}

const TrendingSection: React.FC<TrendingSectionProps> = ({ products }) => {
    return (
        <section className="py-20 bg-transparent overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-16"
                >
                    <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)]">
                        Trending Now
                    </h2>
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-10 items-center">
                    {/* Left Side: Product Cards */}
                    <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-6">
                        {products.slice(0, 3).map((product, index) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                index={index}
                            />
                        ))}
                    </div>

                    {/* Right Side: Descriptive Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="lg:col-span-4"
                    >
                        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4 block">
                            Popular Items
                        </span>
                        <h3 className="text-4xl font-bold text-[var(--text-primary)] leading-tight mb-6">
                            Discover what's popular among Filipino shoppers
                        </h3>
                        <p className="text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
                            Top rated and best selling items this week.
                        </p>

                        <Link to="/search?sort=trending" className="group flex items-center gap-2 text-[var(--text-primary)] font-bold text-lg hover:text-[var(--brand-primary)] transition-colors">
                            <span className="underline underline-offset-8 decoration-2">View All Trending</span>
                            <svg
                                width="20" height="20" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                className="group-hover:translate-x-1 transition-transform"
                            >
                                <line x1="7" y1="17" x2="17" y2="7"></line>
                                <polyline points="7 7 17 7 17 17"></polyline>
                            </svg>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default TrendingSection;
