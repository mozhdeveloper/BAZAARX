import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";
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
  Shield,
  RotateCcw,
  Mail,
  Bell
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
      icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Categories',
      href: '/admin/categories',
      icon: <FolderTree className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Products',
      href: '/admin/products',
      icon: <Package className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: isQARole ? 'QA Dashboard' : 'Product Approvals',
      href: isQARole ? '/qa/dashboard' : '/admin/product-approvals',
      icon: <Shield className="h-5 w-5 flex-shrink-0" />,
      qaVisible: true,
    },
    {
      label: 'Product Requests',
      href: '/admin/product-requests',
      icon: <MessageSquare className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Flash Sales',
      href: '/admin/flash-sales',
      icon: <Zap className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Seller Approvals',
      href: '/admin/sellers',
      icon: <UserCheck className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Trusted Brands',
      href: '/admin/trusted-brands',
      icon: <ShieldCheck className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Buyers',
      href: '/admin/buyers',
      icon: <Users className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Orders',
      href: '/admin/orders',
      icon: <ShoppingBag className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Returns',
      href: '/admin/returns',
      icon: <RotateCcw className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Payouts',
      href: '/admin/payouts',
      icon: <DollarSign className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Vouchers',
      href: '/admin/vouchers',
      icon: <Ticket className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Reviews',
      href: '/admin/reviews',
      icon: <Star className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: <BarChart3 className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Support Tickets',
      href: '/admin/tickets',
      icon: <MessageSquare className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Announcements',
      href: '/admin/announcements',
      icon: <Megaphone className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'CRM & Marketing',
      href: '/admin/crm',
      icon: <Mail className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Notifications',
      href: '/admin/notifications',
      icon: <Bell className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: <Settings className="h-5 w-5 flex-shrink-0" />,
      qaVisible: false,
    }
  ];

  // QA users only see links marked as qaVisible
  const links = isQARole ? allLinks.filter(l => l.qaVisible) : allLinks;

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-1 bg-white z-50">
        <Logo open={open || false} subtitle={isQARole ? "QA Team" : "Admin"} />

        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-1">
          <div className="mt-1 flex flex-col gap-1 px-1">
            {links.map((link, idx) => (
              <SidebarLink
                key={idx}
                link={link}
              />
            ))}
          </div>
        </div>
        <div className="pt-3 border-t border-gray-100 space-y-1">
          <UserProfile open={open} />
        </div>
      </SidebarBody>
    </Sidebar>
  );
};

const Logo = ({ open, subtitle }: { open: boolean; subtitle: string }) => {
  return (
    <div
      className={cn(
        "flex items-center py-2 group transition-all duration-300",
        open ? "justify-start px-2 gap-3" : "justify-center px-0 gap-0"
      )}
    >
      <div className="w-10 h-10 bg-gradient-to-tr from-[#D97706] to-[#B45309] rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
        <img loading="lazy" 
          src="/BazaarX.png"
          alt="BazaarX Logo"
          className="h-6 w-6 brightness-0 invert"
        />
      </div>

      <motion.div
        animate={{
          opacity: open ? 1 : 0,
          width: open ? "auto" : 0,
          display: open ? "flex" : "none",
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-col overflow-hidden whitespace-nowrap"
      >
        <span className="font-bold text-xl text-[var(--text-headline)] tracking-tight leading-none">
          BazaarX
        </span>
        <span className="text-[10px] text-[var(--brand-primary)] font-bold tracking-widest uppercase">
          {subtitle}
        </span>
      </motion.div>
    </div>
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
    <div className="space-y-1 px-1">
      <SidebarLink
        link={{
          label: user.name,
          href: "/admin/profile",
          icon: (
            <div className="h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#D97706] to-[#B45309] flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-white text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          ),
        }}
        className={cn(
          "text-gray-700 hover:text-amber-600 hover:bg-gray-50 rounded-xl",
          open ? "px-3" : "px-0"
        )}
      />
      {!open ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center py-3 rounded-xl hover:bg-gray-50 hover:text-red-600 transition-all duration-200 min-h-[44px] text-gray-600 group px-0"
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <LogOut className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="bg-white text-gray-900 border border-gray-100 shadow-md font-medium z-[100]">
            Sign Out
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full flex items-center gap-3 py-3 rounded-xl hover:bg-gray-50 hover:text-red-600 transition-all duration-200 min-h-[44px] text-gray-600 group",
            "justify-start px-3"
          )}
        >
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <LogOut className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
          </div>
          <motion.span
            animate={{
              opacity: 1,
              width: "auto",
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden block"
          >
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </motion.span>
        </button>
      )}
    </div>
  );
};

export default AdminSidebar;
