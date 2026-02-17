import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBuyerStore } from '../stores/buyerStore';
import Header from '../components/Header';
import { Gift, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';

const SharedRegistryPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [registry, setRegistry] = useState<any>(null);
    const { registries, setQuickOrder } = useBuyerStore();

    // Mock data if not found in store (for demo purposes if sharing across "browsers" isn't synced)
    // In a real app, this would fetch from backend by ID/slug

    useEffect(() => {
        if (id) {
            // Try to find in store first
            const found = registries.find(r =>
                r.id === id ||
                r.title.toLowerCase().replace(/\s+/g, '-') === id
            );

            if (found) {
                setRegistry(found);
            } else {
                // Fallback mock for demo if not found in local state
                // This simulates "viewing someone else's registry"
                setRegistry({
                    id: 'demo-1',
                    title: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    sharedDate: 'Feb 4, 2026',
                    category: 'Celebration',
                    products: []
                });
            }
        }
    }, [id, registries]);

    if (!registry) {
        return (
            <div className="min-h-screen bg-[var(--brand-wash)]">
                <Header />
                <div className="max-w-7xl mx-auto px-4 py-12 text-center">
                    <p>Loading registry...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--brand-wash)]">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-[var(--brand-wash)] text-[var(--brand-primary)] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                                {registry.category || 'Gift List'}
                            </span>
                            <span className="text-sm text-gray-500">
                                Shared on {registry.sharedDate}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">{registry.title}</h1>
                    </div>

                    <div className="p-8">
                        {!registry.products || registry.products.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                                <div className="p-4 bg-gray-50 rounded-full mb-4">
                                    <ShoppingBag className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-900 font-medium">No items yet</p>
                                <p className="text-gray-500 text-sm mt-1">This registry is currently empty.</p>
                                <Button
                                    onClick={() => navigate('/shop')}
                                    className="mt-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-full px-6"
                                >
                                    Browse Shop
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {registry.products.map((product: any, idx: number) => (
                                    <div key={idx} className="flex flex-col p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Gift className="w-12 h-12 text-gray-300" />
                                            )}
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-1">{product.name}</h4>
                                        <p className="text-sm text-[var(--brand-primary)] font-medium mb-4">{product.price || 'Price varies'}</p>

                                        {(product.receivedQty || 0) >= (product.requestedQty || 1) ? (
                                            <Button
                                                className="w-full mt-auto bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-not-allowed"
                                                size="sm"
                                                disabled
                                            >
                                                Purchased
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full mt-auto"
                                                size="sm"
                                                onClick={() => {
                                                    setQuickOrder(product, 1, undefined, registry.id);
                                                    navigate('/checkout');
                                                }}
                                            >
                                                Buy Gift
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SharedRegistryPage;
