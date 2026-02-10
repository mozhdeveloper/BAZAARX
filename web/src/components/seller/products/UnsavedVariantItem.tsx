
import { Package } from "lucide-react";
import { VariantConfig } from "@/types";

interface UnsavedVariantProps {
  newVariant: Partial<VariantConfig>;
}

export function UnsavedVariantItem({ newVariant }: UnsavedVariantProps) {
  return (
    <div className="space-y-2 mb-4">
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0">
          <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
            New
          </span>
        </div>
        <div className="flex items-center gap-3 opacity-80">
          {/* Preview Thumbnail */}
          <div className="h-10 w-10 rounded-lg border border-orange-100 bg-orange-50 overflow-hidden flex items-center justify-center flex-shrink-0">
            {newVariant.image ? (
              <img src={newVariant.image} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-4 w-4 text-orange-300" />
            )}
          </div>
          
          {/* Preview Details */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              Unsaved variant
            </span>
          </div>

          {/* Preview Stats */}
          {(newVariant.stock && newVariant.stock > 0 || (newVariant.price !== undefined && newVariant.price > 0)) && (
            <>
              <div className="h-4 w-px bg-gray-200 mx-1"></div>
              <span className="text-sm text-gray-600">
                Stock: <span className="font-medium">{newVariant.stock || 0}</span>
              </span>
              <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                ₱{(newVariant.price || 0).toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
