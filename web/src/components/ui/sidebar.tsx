"use client";

import { cn } from "@/lib/utils";
import { Link, LinkProps, useLocation } from "react-router-dom";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  comingSoon?: boolean;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      <TooltipProvider delayDuration={0}>
        {children}
      </TooltipProvider>
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as any)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-white border-r border-gray-100 flex-shrink-0 shadow-sm relative",
        className
      )}
      initial={false}
      animate={{
        width: animate ? (open ? "280px" : "72px") : "280px",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      {...props}
    >
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "absolute top-8 -right-3 h-6 w-6 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-md z-[60] hover:bg-gray-50 transition-all duration-300",
          open ? "rotate-180" : "rotate-0"
        )}
      >
        <ChevronRight className="h-4 w-4 text-gray-600" />
      </button>
      {children as React.ReactNode}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-16 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-white border-b border-gray-200 w-full"
        )}
        {...props}
      >
        <div className="flex justify-start items-center">
          <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="ml-2 font-semibold text-gray-900">BazaarPH Seller</span>
        </div>
        <div className="flex justify-end z-20">
          <Menu
            className="text-gray-600 cursor-pointer h-6 w-6"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white p-6 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-6 top-6 z-50 text-gray-600 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X className="h-6 w-6" />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  badge,
  ...props
}: {
  link: Links;
  className?: string;
  badge?: number;
} & Omit<LinkProps, "to">) => {
  const { open, animate } = useSidebar();
  const location = useLocation();
  const isRootPath = ["/seller", "/admin", "/"].includes(link.href);
  const isActive = isRootPath
    ? location.pathname === link.href
    : location.pathname.startsWith(link.href);

  const showBadge = typeof badge === "number" && badge > 0;

  const content = (
    <Link
      to={link.comingSoon ? "#" : link.href}
      onClick={(e) => {
        if (link.comingSoon) {
          e.preventDefault();
          return;
        }
        if (props.onClick) props.onClick(e);
      }}
      className={cn(
        "flex items-center gap-3 group/sidebar py-2 rounded-xl min-h-[48px] transition-all duration-200",
        open ? "justify-start px-3" : "justify-center px-0",
        isActive && !link.comingSoon
          ? "text-[var(--text-accent)] font-bold"
          : "text-gray-700 hover:text-[var(--text-accent)] hover:bg-gray-50/50",
        link.comingSoon && "opacity-60 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {/* Icon with red dot when collapsed */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center relative">
        {link.icon}
        {showBadge && !open && !link.comingSoon && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-sm" />
        )}
      </div>
      <motion.span
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? "auto" : 0) : "auto",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="text-sm font-medium whitespace-nowrap overflow-hidden flex items-center gap-2"
        style={{
          display: animate ? (open ? "flex" : "none") : "flex",
        }}
      >
        {link.label}
        {link.comingSoon && (
          <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1 rounded-sm uppercase tracking-tighter">
            Soon
          </span>
        )}
        {/* Count pill when expanded */}
        {showBadge && !link.comingSoon && (
          <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none flex-shrink-0">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </motion.span>
    </Link>
  );

  if (!open) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="z-[100] bg-white text-gray-900 border border-gray-100 shadow-md font-medium"
          sideOffset={10}
        >
          {link.label}
          {showBadge && badge > 0 && ` (${badge})`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};