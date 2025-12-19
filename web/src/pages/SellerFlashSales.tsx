import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/sellerStore';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Star,
  BarChart3,
  Settings,
  Store,
  Wallet,
  Zap,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit,
  MessageSquare
} from 'lucide-react';

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
  const { seller } = useAuthStore();
  const [open, setOpen] = useState(false);

  const sellerLinks = [
    {
      label: "Dashboard",
      href: "/seller",
      icon: <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Store Profile",
      href: "/seller/store-profile",
      icon: <Store className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Products",
      href: "/seller/products",
      icon: <Package className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Orders",
      href: "/seller/orders",
      icon: <ShoppingBag className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Flash Sales",
      href: "/seller/flash-sales",
      icon: <Zap className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Messages",
      href: "/seller/messages",
      icon: <MessageSquare className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Earnings",
      href: "/seller/earnings",
      icon: <Wallet className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Reviews",
      href: "/seller/reviews",
      icon: <Star className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Analytics",
      href: "/seller/analytics",
      icon: <BarChart3 className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Settings",
      href: "/seller/settings",
      icon: <Settings className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    }
  ];

  const Logo = () => (
    <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-5 w-6 flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black whitespace-pre"
      >
        BazaarPH Seller
      </motion.span>
    </Link>
  );

  const LogoIcon = () => (
    <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-8 w-8 object-contain flex-shrink-0"
      />
    </Link>
  );

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
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: seller?.storeName || "Store",
                href: "/seller/store-profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.storeName?.charAt(0) || 'S'}
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Flash Sales</h1>
                <p className="text-gray-600 mt-2">Manage your flash sale campaigns and boost sales</p>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Join Campaign
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {flashSales.map((sale) => (
                <Card key={sale.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Zap className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{sale.name}</CardTitle>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {sale.startDate.toLocaleDateString()} - {sale.endDate.toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {sale.status === 'active' ? 'Ends in 2 days' : 'Starts in 5 days'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge className={
                        sale.status === 'active' ? 'bg-green-500' :
                        sale.status === 'scheduled' ? 'bg-blue-500' : 'bg-gray-500'
                      }>
                        {sale.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="font-medium mb-3">Participating Products</h3>
                      {sale.products.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sale.products.map((product) => (
                            <div key={product.id} className="flex items-center gap-3 p-3 border rounded-lg">
                              <img src={product.image} alt={product.name} className="w-16 h-16 rounded-md object-cover" />
                              <div>
                                <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-orange-600 font-bold">₱{product.flashPrice}</span>
                                  <span className="text-gray-400 text-xs line-through">₱{product.originalPrice}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {product.sold} / {product.stock} sold
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <p className="text-gray-500 mb-2">No products added yet</p>
                          <Button variant="outline" size="sm">Add Products</Button>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm">
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
