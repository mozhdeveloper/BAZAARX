import React from 'react';
import Header from "../components/Header";
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Globe, Gift, RotateCcw } from 'lucide-react';
import { RegistryDetailModal, Product } from '../components/RegistryDetailModal';
import { CreateRegistryModal } from '../components/CreateRegistryModal';

interface RegistryItem {
    id: string;
    title: string;
    sharedDate: string;
    imageUrl: string;
    category?: string;
    products?: Product[];
}
const RegistryAndGiftingPage = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedRegistry, setSelectedRegistry] = useState<RegistryItem | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [userRegistries, setUserRegistries] = useState<RegistryItem[]>([
        { id: '1', title: 'Graduation list 2026', sharedDate: 'Jan 28, 2026', imageUrl: '/gradGift.jpeg' },
        { id: '2', title: 'Graduation list 2026', sharedDate: 'Jan 30, 2026', imageUrl: '/gradGift.jpeg' },
    ]);

    const handleCreateRegistry = (name: string, category: string) => {
        const newRegistry: RegistryItem = {
            id: Date.now().toString(),
            title: name,
            category: category,
            sharedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            imageUrl: '/public/gradGift.jpeg',
            products: [],
        };
        setUserRegistries([newRegistry, ...userRegistries]);
    };

    const handleAddProductToRegistry = (registryId: string, productName: string) => {
        const newProduct: Product = {
            id: Date.now().toString(),
            name: productName,
            price: '$0.00', // Placeholder
            image: '',
        };

        const updatedRegistries = userRegistries.map(reg => {
            if (reg.id === registryId) {
                return {
                    ...reg,
                    products: [...(reg.products || []), newProduct]
                };
            }
            return reg;
        });

        setUserRegistries(updatedRegistries);

        // Update selected registry to reflect changes immediately in modal
        if (selectedRegistry && selectedRegistry.id === registryId) {
            const updated = updatedRegistries.find(r => r.id === registryId) || null;
            setSelectedRegistry(updated);
        }
    };

    const handleRegistryClick = (item: RegistryItem) => {
        setSelectedRegistry(item);
        setIsDetailModalOpen(true);
    };
    const location = useLocation();

    // Check for navigation state to open create modal
    useEffect(() => {
        if (location.state && (location.state as any).openCreateModal) {
            setIsCreateModalOpen(true);
        }
    }, [location]);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 pt-0 pb-4 flex flex-col gap-2">
                {/* Page Navigation */}
                <div className="flex items-center justify-center gap-10 pt-1 pb-1">
                    <Link
                        to="/shop"
                        className="text-sm  text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
                    >
                        Shop
                    </Link>
                    <Link
                        to="/collections"
                        className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
                    >
                        Collections
                    </Link>
                    <Link
                        to="/stores"
                        className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
                    >
                        Stores
                    </Link>
                    <Link
                        to="/registry"
                        className="text-sm text-[var(--brand-primary)]"
                    >
                        Registry & Gifting
                    </Link>
                </div>

                <div className="py-24 bg-gradient-to-br from-orange-100/20 via-orange-200/50 to-orange-200/50 backdrop-blur-md border border-orange-200/30 rounded-3xl mb-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-2">
                            Registry & {''}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                                Gifting
                            </span>
                        </h1>

                        <p className="text-medium text-gray-700 max-w-2xl mx-auto mb-6">
                            From wishlist to wow — turn every shared moment into the perfect gift.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-medium hover:shadow-lg hover:opacity-90 transition-all shadow-md"
                            >
                                Create a registry
                            </button>
                        </div>
                    </motion.div>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">

                    {/* Category Cards */}
                    <CategoryCard
                        title="Baby Registry"
                        desc="Get help preparing for your new arrival."
                        imgSrc="/babyRegistry.jpg"
                    />
                    <CategoryCard
                        title="Wedding Registry"
                        desc="Register for gifts to start your new chapter."
                        imgSrc="/weddingRegistry.jpg"
                    />
                    <CategoryCard
                        title="Graduation Registry"
                        desc="Share gift ideas or needs for college milestones—birthdays, graduations, dorm moves, org events, and more"
                        imgSrc="/gradGift.jpeg"
                    />
                    <CategoryCard
                        title="Other Occasions"
                        desc="Share gift ideas or needs for birthdays, holidays, graduations, new homes and more."
                        imgSrc="/othersRegistry.jpg"
                    />
                </section>

                <section>
                    <div className="flex items-center space-x-3 mb-4">
                        <h3 className="text-xl font-bold">Your registries and gift lists</h3>
                        <button className="p-1 rounded-full border border-gray-300 hover:bg-gray-100">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {userRegistries.map((list) => (
                            <div
                                key={list.id}
                                onClick={() => handleRegistryClick(list)}
                                className="flex items-center w-full md:w-80 p-3 border border-gray-200 rounded-lg hover:shadow-sm cursor-pointer transition bg-white"
                            >
                                <img src={list.imageUrl} alt="Gift list" className="w-12 h-12 rounded object-cover mr-4" />
                                <div>
                                    <h4 className="font-semibold text-[var(--brand-primary)] text-sm">{list.title}</h4>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Shared - {list.sharedDate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-bold mb-4">Reasons to register with BazaarX</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FeatureCard
                            Icon={Globe}
                            title="Earth's biggest selection"
                            desc="Add items from BazaarX to create a gift registry for any occasion."
                        />
                        <FeatureCard
                            Icon={Gift}
                            title="Easy to share"
                            desc="Share your gift registry with friends and family so they'll know exactly what gifts to get."
                        />
                        <FeatureCard
                            Icon={RotateCcw}
                            title="Extended returns"
                            desc="Not quite right? Registry gifts have an extended return period."
                        />
                    </div>
                </section>

                <CreateRegistryModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateRegistry}
                />

                <RegistryDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    registry={selectedRegistry}
                    onAddProduct={handleAddProductToRegistry}
                />
            </div>
        </div>
    );
};

const CategoryCard = ({ title, desc, imgSrc }: { title: string; desc: string; imgSrc: string }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:shadow-md transition">
        <img src={imgSrc} alt={title} className="h-44 w-full object-cover" />
        <div className="p-4">
            <h4 className="font-bold text-base">{title}</h4>
            <p className="text-sm text-gray-600 mt-2 leading-snug">{desc}</p>
        </div>
    </div>
);

const FeatureCard = ({ Icon, title, desc }: { Icon: any; title: string; desc: string }) => (
    <div className="border border-gray-200 rounded-lg p-8 text-center flex flex-col items-center justify-center space-y-4 min-h-[220px]">
        <div className="p-3 bg-gray-50 rounded-full">
            <Icon size={32} className="text-gray-800" strokeWidth={1.5} />
        </div>
        <h4 className="font-bold text-lg">{title}</h4>
        <p className="text-sm text-gray-600 max-w-[250px]">{desc}</p>
    </div>
);

export default RegistryAndGiftingPage;
