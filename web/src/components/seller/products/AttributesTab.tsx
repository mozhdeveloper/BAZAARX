import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { VariantManager } from "@/components/seller/products/VariantManager";
import { VariantConfig } from "@/types";

interface AttributesTabProps {
    formData: {
        sizes: string[];
        colors: string[];
        price: string;
        stock: string;
    };
    variationInput: string;
    setVariationInput: (value: string) => void;
    colorInput: string;
    setColorInput: (value: string) => void;
    addVariation: () => void;
    removeVariation: (variation: string) => void;
    addColor: () => void;
    removeColor: (color: string) => void;

    // Custom attribute names
    firstAttributeName: string;
    setFirstAttributeName: (value: string) => void;
    secondAttributeName: string;
    setSecondAttributeName: (value: string) => void;
    editingFirstAttributeName: boolean;
    setEditingFirstAttributeName: (value: boolean) => void;
    editingSecondAttributeName: boolean;
    setEditingSecondAttributeName: (value: boolean) => void;

    // Variant Manager props
    variantConfigs: VariantConfig[];
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

export function AttributesTab({
    formData,
    variationInput,
    setVariationInput,
    colorInput,
    setColorInput,
    addVariation,
    removeVariation,
    addColor,
    removeColor,
    firstAttributeName,
    setFirstAttributeName,
    secondAttributeName,
    setSecondAttributeName,
    editingFirstAttributeName,
    setEditingFirstAttributeName,
    editingSecondAttributeName,
    setEditingSecondAttributeName,
    variantConfigs,
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
}: AttributesTabProps) {
    return (
        <>
            {/* Attributes Section */}
            <div className="space-y-6">
                {/* First Attribute (Variations) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {editingFirstAttributeName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={firstAttributeName}
                                        onChange={(e) =>
                                            setFirstAttributeName(
                                                e.target.value,
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                setEditingFirstAttributeName(
                                                    false,
                                                );
                                            }
                                        }}
                                        className="rounded-lg border border-orange-300 px-2 py-1 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingFirstAttributeName(false)
                                        }
                                        className="text-green-600 hover:text-green-700 p-1"
                                        title="Done"
                                    >
                                        <span className="text-xs">
                                            Save changes
                                        </span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <label className="block text-sm font-semibold text-gray-800">
                                        {firstAttributeName}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingFirstAttributeName(true)
                                        }
                                        className="text-gray-400 hover:text-orange-600 transition-colors p-1"
                                        title="Edit attribute"
                                    >
                                        <span className="text-xs">
                                            Edit attribute
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={variationInput}
                            onChange={(e) => setVariationInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addVariation();
                                }
                            }}
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="E.g., Small, 32GB, Chocolate"
                        />
                        <Button
                            type="button"
                            onClick={addVariation}
                            variant="outline"
                            className="rounded-xl border-dashed border-gray-300 hover:border-orange-400"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>
                    {formData.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {formData.sizes.map((variation) => (
                                <span
                                    key={variation}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-700 px-3 py-1.5 text-sm font-medium border border-orange-200"
                                >
                                    {variation}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeVariation(variation)
                                        }
                                        className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Second Attribute (Colors) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {editingSecondAttributeName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={secondAttributeName}
                                        onChange={(e) =>
                                            setSecondAttributeName(
                                                e.target.value,
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                setEditingSecondAttributeName(
                                                    false,
                                                );
                                            }
                                        }}
                                        className="rounded-lg border border-blue-300 px-2 py-1 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingSecondAttributeName(false)
                                        }
                                        className="text-green-600 hover:text-green-700 p-1"
                                        title="Done"
                                    >
                                        <span className="text-xs">
                                            Save changes
                                        </span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <label className="block text-sm font-semibold text-gray-800">
                                        {secondAttributeName}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingSecondAttributeName(true)
                                        }
                                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                        title="Edit attribute"
                                    >
                                        <span className="text-xs">
                                            Edit attribute
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={colorInput}
                            onChange={(e) => setColorInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addColor();
                                }
                            }}
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="E.g., Space Gray, Forest Green"
                        />
                        <Button
                            type="button"
                            onClick={addColor}
                            variant="outline"
                            className="rounded-xl border-dashed border-gray-300 hover:border-orange-400"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>
                    {formData.colors.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {formData.colors.map((color) => (
                                <span
                                    key={color}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 text-sm font-medium border border-blue-200"
                                >
                                    {color}
                                    <button
                                        type="button"
                                        onClick={() => removeColor(color)}
                                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Variant Manager Section */}
            <VariantManager
                firstAttributeName={firstAttributeName}
                secondAttributeName={secondAttributeName}
                variantConfigs={variantConfigs}
                formData={formData}
                editingVariantId={editingVariantId}
                showAddVariantForm={showAddVariantForm}
                newVariant={newVariant}
                errors={errors}
                getTotalVariantStock={getTotalVariantStock}
                updateVariantConfig={updateVariantConfig}
                cancelEditVariant={cancelEditVariant}
                startEditVariant={startEditVariant}
                deleteVariant={deleteVariant}
                setShowAddVariantForm={setShowAddVariantForm}
                setNewVariant={setNewVariant}
                setErrors={setErrors}
                addVariant={addVariant}
            />
        </>
    );
}
