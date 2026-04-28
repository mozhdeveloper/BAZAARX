import { VariantItem } from "./VariantItem";
import { VariantConfig } from "@/types";
import { Package } from "lucide-react";

// 1. Removed newVariant from the interface
interface VariantListProps {
  variantConfigs: VariantConfig[];
  firstAttributeName: string;
  secondAttributeName: string;
  formData: {
    variantLabel1Values: string[];
    variantLabel2Values: string[];
    price: string;
    stock: string;
  };
  editingVariantId: string | null;
  updateVariantConfig: (id: string, field: string, value: any) => void;
  cancelEditVariant: () => void;
  startEditVariant: (variant: VariantConfig) => void;
  deleteVariant: (id: string) => void;
}

// 2. Removed newVariant from the component parameters
export function VariantList({
  variantConfigs,
  firstAttributeName,
  secondAttributeName,
  formData,
  editingVariantId,
  updateVariantConfig,
  cancelEditVariant,
  startEditVariant,
  deleteVariant,
}: VariantListProps) {
  const baseStock = parseInt(formData.stock) || 0;
  const basePrice = parseInt(formData.price) || 0;

  return (
    <>
      {/* Auto-Generated Variants List */}
      {variantConfigs.length > 0 ? (
        <div className="space-y-2">
          {variantConfigs.map((variant) => (
            <VariantItem
              key={variant.id}
              variant={variant}
              isEditing={editingVariantId === variant.id}
              firstAttributeName={firstAttributeName}
              secondAttributeName={secondAttributeName}
              formData={formData}
              updateVariantConfig={updateVariantConfig}
              cancelEditVariant={cancelEditVariant}
              startEditVariant={startEditVariant}
              deleteVariant={deleteVariant}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          Add attributes above to auto-generate variants.
        </div>
      )}
    </>
  );
}