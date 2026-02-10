
import { VariantItem } from "./VariantItem";
import { UnsavedVariantItem } from "./UnsavedVariantItem";
import { VariantConfig } from "@/types";

interface VariantListProps {
  variantConfigs: VariantConfig[];
  firstAttributeName: string;
  secondAttributeName: string;
  formData: {
    variantLabel1Values: string[];
    variantLabel2Values: string[];
  };
  editingVariantId: string | null;
  newVariant: Partial<VariantConfig>;
  updateVariantConfig: (id: string, field: keyof VariantConfig, value: string | number) => void;
  cancelEditVariant: () => void;
  startEditVariant: (variant: VariantConfig) => void;
  deleteVariant: (id: string) => void;
}

export function VariantList({
  variantConfigs,
  firstAttributeName,
  secondAttributeName,
  formData,
  editingVariantId,
  newVariant,
  updateVariantConfig,
  cancelEditVariant,
  startEditVariant,
  deleteVariant,
}: VariantListProps) {
  return (
    <>
      {/* Existing Variants List */}
      {variantConfigs.length > 0 && (
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
      )}

      {/* Unsaved Variant Preview (when list is empty) */}
      {variantConfigs.length === 0 && (
        <UnsavedVariantItem newVariant={newVariant} />
      )}
    </>
  );
}
