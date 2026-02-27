import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
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
  CheckSquare,
  ShieldCheck
} from 'lucide-react';

interface AdminSidebarProps {
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, setOpen }) => {
  const links = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Categories',
      href: '/admin/categories',
      icon: <FolderTree className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Products',
      href: '/admin/products',
      icon: <Package className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Product Approvals',
      href: '/admin/product-approvals',
      icon: <CheckSquare className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Product Requests',
      href: '/admin/product-requests',
      icon: <MessageSquare className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Flash Sales',
      href: '/admin/flash-sales',
      icon: <Zap className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Seller Approvals',
      href: '/admin/sellers',
      icon: <UserCheck className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Trusted Brands',
      href: '/admin/trusted-brands',
      icon: <ShieldCheck className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Buyers',
      href: '/admin/buyers',
      icon: <Users className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Orders',
      href: '/admin/orders',
      icon: <ShoppingBag className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Payouts',
      href: '/admin/payouts',
      icon: <DollarSign className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Vouchers',
      href: '/admin/vouchers',
      icon: <Ticket className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Reviews',
      href: '/admin/reviews',
      icon: <Star className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: <BarChart3 className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Support Tickets',
      href: '/admin/tickets',
      icon: <MessageSquare className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: <Settings className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    }
  ];

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>
        <div>
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