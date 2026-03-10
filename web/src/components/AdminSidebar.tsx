import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderTree,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Ticket,
  Star,
  Package,
  MessageSquare,
  Zap,
  DollarSign,
  ShieldCheck,
  Megaphone,
  Shield
} from 'lucide-react';

interface AdminSidebarProps {
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, setOpen }) => {
  const { user } = useAdminAuth();
  const location = useLocation();
  const isQARole = user?.role === 'qa_team';

  const allLinks = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className={`h-5 w-5 flex-shrink-0 ${location.pathname === '/admin' ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Categories',
      href: '/admin/categories',
      icon: <FolderTree className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/categories') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Products',
      href: '/admin/products',
      icon: <Package className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/products') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: isQARole ? 'QA Dashboard' : 'Product Approvals',
      href: isQARole ? '/admin/qa-dashboard' : '/admin/product-approvals',
      icon: <Shield className={`h-5 w-5 flex-shrink-0 ${location.pathname.includes(isQARole ? '/admin/qa-dashboard' : '/admin/product-approvals') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: true,
    },
    {
      label: 'Product Requests',
      href: '/admin/product-requests',
      icon: <MessageSquare className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/product-requests') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Flash Sales',
      href: '/admin/flash-sales',
      icon: <Zap className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/flash-sales') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Seller Approvals',
      href: '/admin/sellers',
      icon: <UserCheck className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/sellers') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Trusted Brands',
      href: '/admin/trusted-brands',
      icon: <ShieldCheck className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/trusted-brands') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Buyers',
      href: '/admin/buyers',
      icon: <Users className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/buyers') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Orders',
      href: '/admin/orders',
      icon: <ShoppingBag className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/orders') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Payouts',
      href: '/admin/payouts',
      icon: <DollarSign className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/payouts') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Vouchers',
      href: '/admin/vouchers',
      icon: <Ticket className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/vouchers') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Reviews',
      href: '/admin/reviews',
      icon: <Star className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/reviews') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: <BarChart3 className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/analytics') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Support Tickets',
      href: '/admin/tickets',
      icon: <MessageSquare className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/tickets') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Announcements',
      href: '/admin/announcements',
      icon: <Megaphone className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/announcements') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: <Settings className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/admin/settings') ? 'text-primary' : 'text-gray-500'}`} />,
      qaVisible: false,
    }
  ];

  // QA users only see links marked as qaVisible
  const links = isQARole ? allLinks.filter(l => l.qaVisible) : allLinks;

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {open ? <Logo /> : <LogoIcon />}

          {/* QA / Admin role badge */}
          {open && (
            <div className={`mt-4 mx-1 px-3 py-1.5 rounded-lg flex items-center gap-2 ${isQARole
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-gray-100 border border-gray-200'
              }`}>
              <Shield className={`w-3.5 h-3.5 ${isQARole ? 'text-primary' : 'text-gray-500'}`} />
              <span className={`text-xs font-semibold tracking-wide uppercase ${isQARole ? 'text-primary' : 'text-gray-500'}`}>
                {isQARole ? 'QA Team' : 'Admin'}
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-1">
            {links.map((link, idx) => {
              const isActive = link.href === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(link.href);
              return (
                <div
                  key={idx}
                  className={`rounded-lg transition-colors ${isActive
                      ? 'bg-orange-50 border border-orange-100'
                      : 'hover:bg-gray-100/70 border border-transparent'
                    }`}
                >
                  <SidebarLink link={link} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <UserProfile open={open} />
        </div>
      </SidebarBody>
    </Sidebar>
  );
};

const Logo = () => {
  return (
    <Link
      to="/admin"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img
        src="/Logo.png"
        alt="BazaarPH Logo"
        className="h-8 w-8 object-contain flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-gray-900 dark:text-white whitespace-pre"
      >
        BazaarPH Admin
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      to="/admin"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img
        src="/Logo.png"
        alt="BazaarPH Logo"
        className="h-8 w-8 object-contain flex-shrink-0"
      />
    </Link>
  );
};

const UserProfile = ({ open }: { open?: boolean }) => {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
    logout();
    navigate('/admin/login');
  };

  if (!user) return null;

  return (
    <div className="space-y-2">
      <SidebarLink
        link={{
          label: user.name,
          href: "/admin/profile",
          icon: (
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {user.name.charAt(0)}
              </span>
            </div>
          ),
        }}
      />
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full flex items-center justify-start gap-3 py-3 px-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all duration-200 min-h-[48px] text-gray-600"
      >
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          <LogOut className="w-5 h-5 flex-shrink-0" />
        </div>
        <motion.span
          animate={{
            opacity: open ? 1 : 0,
            width: open ? "auto" : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="text-sm font-medium whitespace-nowrap overflow-hidden"
          style={{
            display: open ? "block" : "none",
          }}
        >
          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </motion.span>
      </button>
    </div>
  );
};

export default AdminSidebar;