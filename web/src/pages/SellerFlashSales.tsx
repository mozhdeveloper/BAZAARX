import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/sellerStore';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { sellerLinks } from '@/config/sellerLinks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit,
  LogOut,
  Users
} from 'lucide-react';
import { cn } from "@/lib/utils";

// Logo components defined outside of render
// Logo components defined outside of render


interface FlashSale {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'active' | 'ended';
  products: FlashSaleProduct[];
}

interface FlashSaleProduct {
  id: string;
  name: string;
  image: string;
  originalPrice: number;
  flashPrice: number;
  stock: number;
  sold: number;
}

export default function SellerFlashSales() {
  const { seller, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/seller/auth');
  };

  // Mock Data
  const flashSales: FlashSale[] = [
    {
      id: '1',
      name: 'Weekend Special',
      startDate: new Date('2024-12-20T00:00:00'),
      endDate: new Date('2024-12-22T23:59:59'),
      status: 'active',
      products: [
        {
          id: 'p1',
          name: 'Wireless Earbuds',
          image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
          originalPrice: 2999,
          flashPrice: 1499,
          stock: 50,
          sold: 12
        }
      ]
    },
    {
      id: '2',
      name: 'New Year Blast',
      startDate: new Date('2025-01-01T00:00:00'),
      endDate: new Date('2025-01-01T23:59:59'),
      status: 'scheduled',
      products: []
    }
  ];

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4 bg-white z-50 transition-all duration-300">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            <SellerLogo open={open} />
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-6 border-t border-gray-50">
            <SidebarLink
              link={{
                label: seller?.storeName || seller?.ownerName || "Seller",
                href: "/seller/profile",
                icon: (
                  <div className="h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <span className="text-white text-xs font-bold">
                      {(seller?.storeName || "S").charAt(0).toUpperCase()}
                    </span>
                  </div>
                ),
              }}
            />
            <button
              onClick={async () => {
                const hasBuyerAccount = await useAuthStore.getState().createBuyerAccount();
                if (hasBuyerAccount) navigate('/profile');
              }}
              className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-orange-50 rounded-xl transition-all group overflow-hidden"
            >
              <Users className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors" />
              <motion.span
                animate={{
                  opacity: open ? 1 : 0,
                  width: open ? "auto" : 0,
                  display: open ? "block" : "none"
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="whitespace-nowrap overflow-hidden"
              >
                Switch to Buyer Mode
              </motion.span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group overflow-hidden"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
              <motion.span
                animate={{
                  opacity: open ? 1 : 0,
                  width: open ? "auto" : 0,
                  display: open ? "block" : "none"
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="whitespace-nowrap overflow-hidden"
              >
                Logout
              </motion.span>
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-extrabold text-[var(--text-headline)] font-heading tracking-tight">Flash Sales</h1>
                <p className="text-[var(--text-muted)] mt-1 font-medium">Manage your flash sale campaigns and boost sales</p>
              </div>
              <Button className="rounded-xl px-6 py-6 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:opacity-90 transition-all shadow-lg shadow-orange-500/20 text-white font-bold">
                <Plus className="w-5 h-5 mr-2" />
                Join Campaign
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {flashSales.map((sale) => (
                <Card key={sale.id} className="overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100 rounded-[32px] hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] transition-all">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b border-orange-50 pb-6 pt-6 px-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-orange-100">
                          <Zap className="w-6 h-6 text-[var(--brand-primary)] fill-orange-500" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-[var(--text-headline)] font-heading">{sale.name}</CardTitle>
                          <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)] font-medium">
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm">
                              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                              {sale.startDate.toLocaleDateString()} - {sale.endDate.toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm">
                              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                              {sale.status === 'active' ? 'Ends in 2 days' : 'Starts in 5 days'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide",
                        sale.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' :
                          sale.status === 'scheduled' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200'
                      )}>
                        {sale.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <h3 className="font-bold text-[var(--text-headline)] mb-4 text-sm uppercase tracking-wider">Participating Products</h3>
                      {sale.products.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sale.products.map((product) => (
                            <div key={product.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-[20px] bg-gray-50/50 hover:bg-white hover:shadow-md hover:border-orange-100 transition-all cursor-pointer group">
                              <div className="relative">
                                <img src={product.image} alt={product.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                  -50%
                                </div>
                              </div>
                              <div>
                                <p className="font-bold text-[var(--text-headline)] text-sm line-clamp-1 group-hover:text-[var(--brand-primary)] transition-colors">{product.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[var(--brand-primary)] font-black text-lg">₱{product.flashPrice}</span>
                                  <span className="text-gray-400 text-xs line-through font-medium">₱{product.originalPrice}</span>
                                </div>
                                <div className="text-xs text-[var(--text-secondary)] font-medium mt-1 bg-white px-2 py-0.5 rounded-full inline-block border border-gray-100">
                                  {product.sold} / {product.stock} sold
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-[24px] bg-gray-50/50">
                          <p className="text-[var(--text-muted)] font-medium mb-3">No products added yet</p>
                          <Button variant="outline" size="sm" className="rounded-xl font-bold border-gray-200 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]">Add Products</Button>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                      <Button variant="outline" size="sm" className="rounded-xl h-10 px-5 font-bold border-gray-200 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] bg-white">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" className="rounded-xl h-10 px-5 font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 shadow-none">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar Logo Component
const SellerLogo = ({ open }: { open: boolean }) => (
  <Link to="/seller" className={cn(
    "flex items-center py-2 mb-6 group transition-all duration-300",
    open ? "justify-start px-2 gap-3" : "justify-center px-0 gap-0"
  )}>
    <div className="w-10 h-10 bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
      <img src="/BazaarX.png" alt="BazaarX Logo" className="h-6 w-6 brightness-0 invert" />
    </div>

    <motion.div
      animate={{
        opacity: open ? 1 : 0,
        width: open ? "auto" : 0,
        display: open ? "flex" : "none"
      }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex-col overflow-hidden whitespace-nowrap"
    >
      <span className="font-black text-xl text-[var(--text-headline)] font-heading tracking-tight leading-none">BazaarX</span>
      <span className="text-[10px] text-[var(--brand-primary)] font-bold tracking-widest uppercase">Seller Hub</span>
    </motion.div>
  </Link>
);
