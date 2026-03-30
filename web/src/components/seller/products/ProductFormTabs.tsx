import { cn } from "@/lib/utils";
import { Package, Settings, ShieldCheck } from "lucide-react";

interface ProductFormTabsProps {
  activeTab: 'general' | 'attributes' | 'warranty';
  setActiveTab: (tab: 'general' | 'attributes' | 'warranty') => void;
}

export function ProductFormTabs({ activeTab, setActiveTab }: ProductFormTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
      <button
        type="button"
        onClick={() => setActiveTab('general')}
        className={cn(
          "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2",
          activeTab === 'general'
            ? "bg-white text-orange-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        <Package className="w-4 h-4" />
        General
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('attributes')}
        className={cn(
          "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2",
          activeTab === 'attributes'
            ? "bg-white text-orange-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        <Settings className="w-4 h-4" />
        Variants
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('warranty')}
        className={cn(
          "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2",
          activeTab === 'warranty'
            ? "bg-white text-orange-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        <ShieldCheck className="w-4 h-4" />
        Warranty
      </button>
    </div>
  );
}
