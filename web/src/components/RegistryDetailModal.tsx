import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Plus, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export interface Product {
    id: string;
    name: string;
    price: string;
    image: string;
}

export interface RegistryItem {
    id: string;
    title: string;
    sharedDate: string;
    imageUrl: string;
    category?: string;
    products?: Product[];
}

interface RegistryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    registry: RegistryItem | null;
    onAddProduct: (registryId: string, productName: string) => void;
}

export const RegistryDetailModal = ({ isOpen, onClose, registry, onAddProduct }: RegistryDetailModalProps) => {
    const [newProductName, setNewProductName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    if (!registry) return null;

    const handleAdd = () => {
        if (newProductName.trim()) {
            onAddProduct(registry.id, newProductName);
            setNewProductName('');
            setIsAdding(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="p-6 relative overflow-y-auto max-h-[calc(90vh)]">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>

                            <div className="mb-6 border-b border-gray-100 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-orange-100 text-[var(--brand-primary)] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                                        {registry.category || 'Gift List'}
                                    </span>
                                    <span className="text-sm text-[var(--text-secondary)]">
                                        Created on {registry.sharedDate}
                                    </span>
                                </div>
                                <h2 className="text-3xl font-bold text-[var(--text-primary)]">{registry.title}</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Registry Items</h3>
                                    <Button
                                        onClick={() => setIsAdding(!isAdding)}
                                        size="sm"
                                        variant="outline"
                                        className="text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/10"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Item
                                    </Button>
                                </div>

                                {isAdding && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                                    >
                                        <Label className="mb-2 block">Add a Product (Quick Add)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newProductName}
                                                onChange={(e) => setNewProductName(e.target.value)}
                                                placeholder="Enter product name..."
                                                className="bg-white"
                                                autoFocus
                                            />
                                            <Button onClick={handleAdd} className="btn-primary shrink-0">
                                                Add
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="space-y-3">
                                    {!registry.products || registry.products.length === 0 ? (
                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                                <ShoppingBag className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-900 font-medium">No items yet</p>
                                            <p className="text-gray-500 text-sm mt-1">Start adding items to build your registry.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {registry.products.map((product, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                                                        ) : (
                                                            <Gift className="w-8 h-8 text-gray-300" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{product.name}</h4>
                                                        <p className="text-sm text-[var(--brand-primary)] font-medium">{product.price || 'Price varies'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
