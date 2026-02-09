import { VariantList } from "./VariantList";
import { VariantForm } from "./VariantForm";
import { VariantConfig } from "@/types";

interface VariantManagerProps {
    firstAttributeName: string;
    secondAttributeName: string;
    variantConfigs: VariantConfig[];
    formData: {
        sizes: string[];
        colors: string[];
        price: string;
    };
    editingVariantId: string | null;
    showAddVariantForm: boolean;
    newVariant: Partial<VariantConfig>;
    errors: Record<string, string | undefined>;
    getTotalVariantStock: () => number;
    updateVariantConfig: (
        id: string,
        field: keyof VariantConfig,
        value: string | number,
    ) => void;
    cancelEditVariant: () => void;
    startEditVariant: (variant: VariantConfig) => void;
    deleteVariant: (id: string) => void;
    setShowAddVariantForm: (show: boolean) => void;
    setNewVariant: (
        variant:
            | Partial<VariantConfig>
            | ((prev: Partial<VariantConfig>) => Partial<VariantConfig>),
    ) => void;
    setErrors: (errors: any | ((prev: any) => any)) => void;
    addVariant: () => void;
}

export function VariantManager({
    firstAttributeName,
    secondAttributeName,
    variantConfigs,
    formData,
    editingVariantId,
    showAddVariantForm,
    newVariant,
    errors,
    getTotalVariantStock,
    updateVariantConfig,
    cancelEditVariant,
    startEditVariant,
    deleteVariant,
    setShowAddVariantForm,
    setNewVariant,
    setErrors,
    addVariant,
}: VariantManagerProps) {
    return (
        <div className="space-y-4">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">
                        Product Variants
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Create size, color, or custom variants with individual
                        stock and pricing
                    </p>
                </div>
                {variantConfigs.length > 0 && (
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                            Total Stock:{" "}
                            <span className="text-orange-600 font-bold">
                                {getTotalVariantStock()}
                            </span>
                        </p>
                        <p className="text-xs text-gray-500">
                            {variantConfigs.length} variant(s)
                        </p>
                        {/* Show price range only if variants have different prices */}
                        {variantConfigs.length > 1 &&
                            Math.min(...variantConfigs.map((v) => v.price)) !==
                                Math.max(
                                    ...variantConfigs.map((v) => v.price),
                                ) && (
                                <p className="text-xs text-orange-600 font-medium">
                                    Price Range: ₱
                                    {Math.min(
                                        ...variantConfigs.map((v) => v.price),
                                    ).toLocaleString()}{" "}
                                    - ₱
                                    {Math.max(
                                        ...variantConfigs.map((v) => v.price),
                                    ).toLocaleString()}
                                </p>
                            )}
                    </div>
                )}
            </div>

            {/* Variants List & Unsaved Preview */}
            <VariantList
                variantConfigs={variantConfigs}
                firstAttributeName={firstAttributeName}
                secondAttributeName={secondAttributeName}
                formData={formData}
                editingVariantId={editingVariantId}
                newVariant={newVariant}
                updateVariantConfig={updateVariantConfig}
                cancelEditVariant={cancelEditVariant}
                startEditVariant={startEditVariant}
                deleteVariant={deleteVariant}
            />

            {/* Add Variant Form */}
            <VariantForm
                firstAttributeName={firstAttributeName}
                secondAttributeName={secondAttributeName}
                formData={formData}
                variantConfigs={variantConfigs}
                showAddVariantForm={showAddVariantForm}
                setShowAddVariantForm={setShowAddVariantForm}
                newVariant={newVariant}
                setNewVariant={setNewVariant}
                errors={errors}
                setErrors={setErrors}
                addVariant={addVariant}
            />
        </div>
    );
}
