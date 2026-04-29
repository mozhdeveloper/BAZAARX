import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface ComingSoonWrapperProps {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
  showOnHover?: boolean;
  variant?: "absolute" | "inline";
}

export const ComingSoonWrapper = ({
  children,
  className,
  enabled = true,
  showOnHover = true,
  variant = "absolute",
}: ComingSoonWrapperProps) => {
  if (!enabled) return <>{children}</>;

  if (variant === "inline") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex items-center gap-2 cursor-not-allowed group transition-all duration-300", className)}>
              <div className="opacity-40 grayscale-[0.5] pointer-events-none select-none flex items-center gap-2">
                {children}
              </div>
              <span className={cn(
                "bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm border border-amber-200/50 whitespace-nowrap uppercase tracking-widest transition-all duration-300",
                showOnHover ? "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100" : "opacity-100"
              )}>
                Coming Soon
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gray-900 text-white border-none text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl">
            This feature is under development
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("relative group cursor-not-allowed transition-all duration-300", className)}>
            <div className="opacity-40 grayscale-[0.5] pointer-events-none select-none transition-all duration-300 group-hover:opacity-30">
              {children}
            </div>
            <div className={cn(
              "absolute -top-1.5 -right-1.5 z-20 pointer-events-none transition-all duration-300",
              showOnHover ? "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100" : "opacity-100"
            )}>
              <div className="bg-amber-100 text-amber-700 text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm border border-amber-200/50 whitespace-nowrap uppercase tracking-widest">
                Coming Soon
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-50/10 to-orange-50/10 rounded-xl pointer-events-none" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-gray-900 text-white border-none text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl">
          This feature is under development
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ComingSoonWrapper;
