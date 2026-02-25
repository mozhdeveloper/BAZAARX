import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface GeneralInfoTabProps {
    formData: {
        name: string;
        description: string;
        price: string;
        originalPrice: string;
        stock: string;
        category: string;
        images: string[];
    };
    errors: Record<string, string | undefined>;
    variantConfigs: Array<{ stock: number; price: number }>;
    categories: Array<{ id: string; name: string }>;
    loadingCategories: boolean;
    handleChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => void;
    handleImageChange: (index: number, value: string) => void;
    addImageField: () => void;
    removeImageField: (index: number) => void;
    getTotalVariantStock: () => number;
}

export function GeneralInfoTab({
    formData,
    errors,
    variantConfigs,
    categories,
    loadingCategories,
    handleChange,
    handleImageChange,
    addImageField,
    removeImageField,
    getTotalVariantStock,
}: GeneralInfoTabProps) {
    return (
        <div className="space-y-8">
            {/* Product Name */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label
                        htmlFor="name"
                        className="block text-sm font-semibold text-gray-800"
                    >
                        Product Name *
                    </label>
                    <span className="text-xs text-gray-500">
                        Keep it clear and searchable
                    </span>
                </div>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={cn(
                        "w-full rounded-xl border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
                        errors.name ? "border-red-500" : "border-gray-200",
                    )}
                    placeholder="E.g., Classic Linen Button-Down Shirt"
                    required
                />
                {errors.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                )}
            </div>

            {/* Description */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label
                        htmlFor="description"
                        className="block text-sm font-semibold text-gray-800"
                    >
                        Description *
                    </label>
                    <span className="text-xs text-gray-500">
                        Highlight benefits, not just specs
                    </span>
                </div>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Material, fit, key features, and what makes it special."
                    required
                />
                {errors.description && (
                    <p className="text-sm text-red-600">{errors.description}</p>
                )}
            </div>

            {/* Price and Original Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="price"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                    >
                        Display Price (₱) *
                        <span className="text-xs font-normal text-gray-500 ml-1">
                            (shown on product card)
                        </span>
                    </label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="0"
                        required
                    />
                    {variantConfigs.length > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                            ⓘ Actual prices are set per variant below. This is
                            the thumbnail/display price.
                        </p>
                    )}
                    {errors.price && (
                        <p className="text-sm text-red-600">{errors.price}</p>
                    )}
                </div>
                <div>
                    <label
                        htmlFor="originalPrice"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                    >
                        Original Price (₱)
                        <span className="text-xs font-normal text-gray-500 ml-1">
                            (for strikethrough display)
                        </span>
                    </label>
                    <input
                        type="number"
                        id="originalPrice"
                        name="originalPrice"
                        value={formData.originalPrice}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="0"
                    />
                </div>
            </div>

            {/* Stock and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="stock"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                    >
                        Base Stock Quantity {variantConfigs.length === 0 && "*"}
                    </label>
                    <input
                        type="number"
                        id="stock"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="0"
                        required={variantConfigs.length === 0}
                    />
                    {variantConfigs.length > 0 && (
                        <p className="text-xs text-green-700 mt-1">
                            Base variant stock: {parseInt(formData.stock) || 0} •
                            Custom variants stock: {getTotalVariantStock()} • Total:
                            {" "}
                            {(parseInt(formData.stock) || 0) +
                                getTotalVariantStock()}
                        </p>
                    )}
                    {errors.stock && (
                        <p className="text-sm text-red-600">{errors.stock}</p>
                    )}
                </div>
                <div>
                    <label
                        htmlFor="category"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                    >
                        Category *
                    </label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                        disabled={loadingCategories}
                    >
                        <option value="">
                            {loadingCategories
                                ? "Loading..."
                                : "Select a category"}
                        </option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    {errors.category && (
                        <p className="text-sm text-red-600">
                            {errors.category}
                        </p>
                    )}
                </div>
            </div>

            {/* Images */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                        Product Images *
                    </label>
                    <span className="text-xs text-gray-500">
                        Use high-res, clean backgrounds
                    </span>
                </div>
                <div className="space-y-2">
                    {formData.images.map((image, index) => (
                        <div key={index} className="flex gap-3 items-center">
                            <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-xs text-gray-400">
                                {image ? (
                                    <img
                                        src={image}
                                        alt={`Preview ${index + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span>{index === 0 ? "Main" : "Alt"}</span>
                                )}
                            </div>
                            <input
                                type="url"
                                value={image}
                                onChange={(e) =>
                                    handleImageChange(index, e.target.value)
                                }
                                className="flex-1 rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="https://..."
                                required={index === 0}
                            />
                            {formData.images.length > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => removeImageField(index)}
                                    className="px-3 py-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={addImageField}
                        className="w-full border-dashed"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Image
                    </Button>
                </div>
                <p className="text-xs text-gray-500">
                    The first image is the thumbnail. Aim for 1600x1200, neutral
                    backgrounds.
                </p>
                {errors.images && (
                    <p className="text-sm text-red-600">{errors.images}</p>
                )}
            </div>
        </div>
    );
}
