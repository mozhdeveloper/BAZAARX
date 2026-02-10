import { cn } from "@/lib/utils";

interface ProductFormTabsProps {
  activeTab: 'general' | 'attributes';
  setActiveTab: (tab: 'general' | 'attributes') => void;
}

export function ProductFormTabs({ activeTab, setActiveTab }: ProductFormTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
      <button
        type="button"
        onClick={() => setActiveTab('general')}
        className={cn(
          "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
          activeTab === 'general'
            ? "bg-white text-orange-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        General Information
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('attributes')}
        className={cn(
          "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
          activeTab === 'attributes'
            ? "bg-white text-orange-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        Attributes and Variants
      </button>
    </div>
  );
}
