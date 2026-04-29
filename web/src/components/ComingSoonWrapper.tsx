import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface ComingSoonWrapperProps {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

export const ComingSoonWrapper = ({
  children,
  className,
  enabled = true,
}: ComingSoonWrapperProps) => {
  if (!enabled) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("relative group cursor-not-allowed opacity-60", className)}>
            <div className="pointer-events-none select-none">
              {children}
            </div>
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full shadow-sm z-10 uppercase tracking-tighter scale-75 group-hover:scale-90 transition-transform">
              Soon
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-gray-900 text-white border-none text-[10px] font-bold">
          Feature Coming Soon
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ComingSoonWrapper;
