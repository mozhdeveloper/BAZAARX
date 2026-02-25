/**
 * StoreSelector - Component for buyers to select a store when submitting a ticket
 * Fetches stores the buyer has ordered from
 */
import React, { useState, useEffect } from 'react';
import { Search, Store } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface SellerOption {
    id: string;
    storeName: string;
    ownerName: string;
}

interface SellerWithProfile {
    id: string;
    store_name: string | null;
    owner_name?: string | null;
    profile?:
        | {
              first_name: string | null;
              last_name: string | null;
          }
        | {
              first_name: string | null;
              last_name: string | null;
          }[]
        | null;
}

interface StoreSelectorProps {
    buyerId: string;
    selectedSellerId?: string;
    onSelectStore: (sellerId: string | null, storeName: string) => void;
}

export function StoreSelector({ buyerId, selectedSellerId, onSelectStore }: StoreSelectorProps) {
    const [sellers, setSellers] = useState<SellerOption[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSellers();
    }, [buyerId]);

    const fetchSellers = async () => {
        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        try {
            // Fetch ALL sellers from the database (buyers can report about any store)
            const { data: allSellers, error: sellersError } = await supabase
                .from('sellers')
                .select('id, store_name, approval_status, profile:profiles(first_name, last_name)')
                .order('store_name', { ascending: true });

            if (sellersError) {
                console.error('Error fetching sellers:', sellersError);
                setLoading(false);
                return;
            }

            // Map to seller options
            const sellerRows = (allSellers ?? []) as unknown[];

            const sellerOptions = sellerRows.map((row) => {
                const seller = row as SellerWithProfile;
                const profileRow = Array.isArray(seller.profile)
                    ? seller.profile[0]
                    : seller.profile;
                const profileName = [profileRow?.first_name || '', profileRow?.last_name || '']
                    .join(' ')
                    .trim();
                const ownerName = profileName || seller.owner_name || 'Unknown Owner';

                return {
                    id: seller.id,
                    storeName: seller.store_name || ownerName || 'Unknown Store',
                    ownerName,
                };
            });

            setSellers(sellerOptions);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch sellers:', error);
            setLoading(false);
        }
    };

    const filteredSellers = sellers.filter(seller =>
        seller.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedStore = sellers.find(s => s.id === selectedSellerId);

    return (
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Store (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
                Select which store this issue is about
            </p>

            {/* Search input */}
            <div className="relative mb-2">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search stores..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Seller list */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {loading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        Loading stores...
                    </div>
                ) : filteredSellers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        {searchQuery ? 'No stores found' : 'No stores available'}
                    </div>
                ) : (
                    <>
                        {/* None option */}
                        <div
                            onClick={() => onSelectStore(null, '')}
                            className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                                !selectedSellerId ? 'bg-orange-50 border-l-4 border-l-[#FF4500]' : ''
                            }`}
                        >
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                                    <Store size={16} className="text-gray-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm text-gray-700">
                                        General Issue (No specific store)
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {filteredSellers.map((seller) => (
                            <div
                                key={seller.id}
                                onClick={() => onSelectStore(seller.id, seller.storeName)}
                                className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                    selectedSellerId === seller.id ? 'bg-orange-50 border-l-4 border-l-[#FF4500]' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center mr-3">
                                        <Store size={16} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-gray-900">
                                            {seller.storeName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Owner: {seller.ownerName}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
