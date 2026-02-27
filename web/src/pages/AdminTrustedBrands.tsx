import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ShieldCheck,
  Search,
  Store,
  Package,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';

interface SellerRow {
  id: string;
  store_name: string;
  avatar_url: string | null;
  approval_status: string;
  created_at: string;
  product_count: number;
  tier_level: string | null;
  bypasses_assessment: boolean;
}

const AdminTrustedBrands: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'trusted' | 'standard'>('all');

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const fetchSellers = async () => {
    setLoading(true);
    try {
      // Fetch sellers with their tier info
      const { data: sellersData, error: sellersError } = await supabaseAdmin
        .from('sellers')
        .select(`
          id, store_name, avatar_url, approval_status, created_at
        `)
        .order('store_name');

      if (sellersError) throw sellersError;

      // Fetch tier info
      const { data: tiersData } = await supabaseAdmin
        .from('seller_tiers')
        .select('seller_id, tier_level, bypasses_assessment');

      // Fetch product counts
      const { data: productCounts } = await supabaseAdmin
        .from('products')
        .select('seller_id')
        .not('disabled_at', 'is', null)
        .is('disabled_at', null);

      const tierMap = new Map<string, { tier_level: string; bypasses_assessment: boolean }>();
      (tiersData || []).forEach((t: any) => tierMap.set(t.seller_id, t));

      const countMap = new Map<string, number>();
      (productCounts || []).forEach((p: any) => {
        countMap.set(p.seller_id, (countMap.get(p.seller_id) || 0) + 1);
      });

      const mapped: SellerRow[] = (sellersData || []).map((s: any) => {
        const tier = tierMap.get(s.id);
        return {
          id: s.id,
          store_name: s.store_name || 'Unnamed Store',
          avatar_url: s.avatar_url,
          approval_status: s.approval_status || 'pending',
          created_at: s.created_at,
          product_count: countMap.get(s.id) || 0,
          tier_level: tier?.tier_level || null,
          bypasses_assessment: tier?.bypasses_assessment || false,
        };
      });

      setSellers(mapped);
    } catch (err) {
      console.error('Failed to fetch sellers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleToggleTrusted = async (sellerId: string, currentlyTrusted: boolean) => {
    setTogglingId(sellerId);
    try {
      if (currentlyTrusted) {
        // Remove trusted brand status — delete the tier row or set to standard
        const { error } = await supabaseAdmin
          .from('seller_tiers')
          .upsert({
            seller_id: sellerId,
            tier_level: 'standard',
            bypasses_assessment: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'seller_id' });

        if (error) throw error;

        setSellers(prev => prev.map(s =>
          s.id === sellerId ? { ...s, tier_level: 'standard', bypasses_assessment: false } : s
        ));
      } else {
        // Set as trusted brand
        const { error } = await supabaseAdmin
          .from('seller_tiers')
          .upsert({
            seller_id: sellerId,
            tier_level: 'trusted_brand',
            bypasses_assessment: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'seller_id' });

        if (error) throw error;

        setSellers(prev => prev.map(s =>
          s.id === sellerId ? { ...s, tier_level: 'trusted_brand', bypasses_assessment: true } : s
        ));
      }
    } catch (err) {
      console.error('Failed to toggle trusted brand:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const isTrusted = (s: SellerRow) =>
    s.bypasses_assessment && (s.tier_level === 'trusted_brand' || s.tier_level === 'premium_outlet');

  const filteredSellers = useMemo(() => {
    let list = sellers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.store_name.toLowerCase().includes(q));
    }

    if (filter === 'trusted') {
      list = list.filter(s => isTrusted(s));
    } else if (filter === 'standard') {
      list = list.filter(s => !isTrusted(s));
    }

    return list;
  }, [sellers, searchQuery, filter]);

  const trustedCount = sellers.filter(s => isTrusted(s)).length;

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-7 w-7 text-amber-500" />
                  <h1 className="text-2xl font-bold text-gray-900">Trusted Brands</h1>
                </div>
                <p className="text-gray-600 mt-1">Manage trusted sellers whose products bypass QA verification</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-sm px-3 py-1">
                  {trustedCount} Trusted Brand{trustedCount !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Info Banner */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">How Trusted Brands Work</p>
                    <p className="text-sm text-amber-700 mt-1">
                      When a seller is marked as a Trusted Brand, all their <strong>new product submissions</strong> automatically
                      bypass the QA assessment process and are set to "Verified" status immediately. This means their products
                      go live without requiring digital review, sample inspection, or physical review.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search sellers by store name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All ({sellers.length})
                </Button>
                <Button
                  variant={filter === 'trusted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('trusted')}
                  className={filter === 'trusted' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  Trusted ({trustedCount})
                </Button>
                <Button
                  variant={filter === 'standard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('standard')}
                >
                  Standard ({sellers.length - trustedCount})
                </Button>
              </div>
            </div>

            {/* Sellers Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : filteredSellers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Store className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="font-medium">No sellers found</p>
                    <p className="text-sm">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50/50">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</th>
                          <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">QA Bypass</th>
                          <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trusted Brand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredSellers.map((seller) => {
                          const trusted = isTrusted(seller);
                          return (
                            <tr key={seller.id} className={`hover:bg-gray-50 transition-colors ${trusted ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={seller.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.store_name)}&background=FFD89A&color=78350F`}
                                    alt={seller.store_name}
                                    className="h-10 w-10 rounded-full object-cover border"
                                  />
                                  <div>
                                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                                      {seller.store_name}
                                      {trusted && <ShieldCheck className="h-4 w-4 text-amber-500" />}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Joined {new Date(seller.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge className={
                                  seller.approval_status === 'verified'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : seller.approval_status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                      : 'bg-gray-100 text-gray-800'
                                }>
                                  {seller.approval_status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Package className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-700">{seller.product_count}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {trusted ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Bypassed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-gray-500">
                                    Standard QA
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center">
                                  {togglingId === seller.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                                  ) : (
                                    <Switch
                                      checked={trusted}
                                      onCheckedChange={() => handleToggleTrusted(seller.id, trusted)}
                                      className="data-[state=checked]:bg-amber-500"
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTrustedBrands;
