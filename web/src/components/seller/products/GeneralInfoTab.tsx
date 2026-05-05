import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus, Link as LinkIcon, Plus, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

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
    variantConfigs: Array<{ stock: number; price: number; variantLabel1Value?: string; variantLabel2Value?: string }>;
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
    // File upload props
    imageFiles: (File | null)[];
    imageFileErrors: (string | null)[];
    onFileSelect: (index: number, file: File | null) => void;
    addImageFileSlot: () => void;
    removeImageFileSlot: (index: number) => void;
    setImageFileError: (index: number, error: string | null) => void;
    hideCategory?: boolean;
    reorderImages?: (fromIndex: number, toIndex: number) => void;
    reorderImageFile?: (fromIndex: number, toIndex: number) => void;
}

function FileSlot({
    index,
    file,
    error,
    onFileSelect,
    onRemove,
    showRemove,
}: {
    index: number;
    file: File | null;
    error: string | null;
    onFileSelect: (index: number, file: File | null) => void;
    onRemove: () => void;
    showRemove: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const preview = file ? URL.createObjectURL(file) : null;

    return (
        <div className="flex gap-3 items-start">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={cn(
                    "relative h-20 w-20 flex-shrink-0 rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500",
                    error
                        ? "border-red-400 bg-red-50"
                        : file
                            ? "border-orange-300 bg-orange-50"
                            : "border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/50",
                )}
                title={file ? "Replace image" : "Select image"}
            >
                {preview ? (
                    <img loading="lazy" 
                        src={preview}
                        alt={`Upload ${index + 1}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <ImagePlus className="h-6 w-6 text-gray-300" />
                )}
                {file && (
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center transition-colors">
                        <Upload className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                )}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    onFileSelect(index, f);
                    // Reset so the same file can be re-selected
                    e.target.value = "";
                }}
            />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                    {file ? file.name : index === 0 ? "Main image" : `Image ${index + 1}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                    {file
                        ? `${(file.size / 1024).toFixed(0)} KB`
                        : "JPEG, PNG or WebP · max 5 MB"}
                </p>
                {error && (
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                )}
                {!file && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="mt-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                    >
                        Choose file
                    </button>
                )}
            </div>
            {showRemove && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={onRemove}
                    className="px-3 py-2 flex-shrink-0 self-center"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
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
    imageFiles,
    imageFileErrors,
    onFileSelect,
    addImageFileSlot,
    removeImageFileSlot,
    setImageFileError: _setImageFileError,
    hideCategory,
    reorderImages,
    reorderImageFile,
}: GeneralInfoTabProps) {
    const [imageUploadMode, setImageUploadMode] = useState<"url" | "upload">("url");

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
                    maxLength={120}
                    className={cn(
                        "w-full rounded-xl border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
                        errors.name ? "border-red-500" : "border-gray-200",
                    )}
                    placeholder="E.g., Classic Linen Button-Down Shirt"
                    required
                />
                <div className="flex items-center justify-between">
                    {errors.name ? (
                        <p className="text-sm text-red-600">{errors.name}</p>
                    ) : <span />}
                    <span className={cn("text-xs", formData.name.length >= 120 ? "text-red-500" : "text-gray-400")}>
                        {formData.name.length}/120
                    </span>
                </div>
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
                    maxLength={2000}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Material, fit, key features, and what makes it special."
                    required
                />
                <div className="flex items-center justify-between">
                    {errors.description ? (
                        <p className="text-sm text-red-600">{errors.description}</p>
                    ) : <span />}
                    <span className={cn("text-xs", formData.description.length >= 2000 ? "text-red-500" : "text-gray-400")}>
                        {formData.description.length}/2000
                    </span>
                </div>
            </div>

            {/* Price and Original Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="price"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                    >
                        Display Price (₱) *
                        {variantConfigs.some(v => v.variantLabel1Value || v.variantLabel2Value) && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded ml-2 uppercase">
                                Locked to Variants
                            </span>
                        )}
                    </label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        // Disable only if real named variants exist (not just a default base variant)
                        disabled={variantConfigs.some(v => v.variantLabel1Value || v.variantLabel2Value)}
                        className={cn(
                            "w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
                            variantConfigs.some(v => v.variantLabel1Value || v.variantLabel2Value) && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        placeholder="0"
                        required
                    />
                    {variantConfigs.some(v => v.variantLabel1Value || v.variantLabel2Value) && (
                        <p className="text-[11px] text-orange-600 mt-1 font-medium italic">
                            Edit individual prices in the "Attributes & Variants" tab to change the display range.
                        </p>
                    )}
                </div>
                <div>
                    <label
                        htmlFor="originalPrice"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                    >
                        Original Price (₱) *
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
                        className={cn(
                            "w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
                            errors.originalPrice && "border-red-500",
                        )}
                        placeholder="0"
                    />
                    {errors.originalPrice && (
                        <p className="text-sm text-red-600">{errors.originalPrice}</p>
                    )}
                </div>
            </div>

            {/* Stock and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="stock"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                    >
                        Total Stock Quantity *
                    </label>
                    <input
                        type="number"
                        id="stock"
                        name="stock"
                        // Use the calculated total if variants exist, otherwise use raw formData
                        value={variantConfigs.length > 0 ? getTotalVariantStock() : formData.stock}
                        onChange={handleChange}
                        disabled={variantConfigs.length > 0}
                        className={cn(
                            "w-full rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
                            variantConfigs.length > 0 && "bg-gray-50 cursor-not-allowed opacity-75",
                            errors.stock && "border-red-500",
                        )}
                        placeholder="0"
                    />
                    {errors.stock && (
                        <p className="text-sm text-red-600">{errors.stock}</p>
                    )}
                    {variantConfigs.length > 0 && (
                        <p className="text-[11px] text-green-700 mt-1 font-medium">
                            Automatically calculated from {variantConfigs.length} variants.
                        </p>
                    )}
                </div>
                {!hideCategory && <div>
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
                </div>}
            </div>

            {/* Images */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-800">
                        Product Images *
                    </label>
                    {/* Upload / URL toggle pill */}
                    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                        <button
                            type="button"
                            onClick={() => setImageUploadMode("url")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                imageUploadMode === "url"
                                    ? "bg-white text-orange-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700",
                            )}
                        >
                            <LinkIcon className="h-3 w-3" />
                            URL
                        </button>
                        <button
                            type="button"
                            onClick={() => setImageUploadMode("upload")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                imageUploadMode === "upload"
                                    ? "bg-white text-orange-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700",
                            )}
                        >
                            <Upload className="h-3 w-3" />
                            Upload
                        </button>
                    </div>
                </div>

                {/* URL mode */}
                {imageUploadMode === "url" && (
                    <div className="space-y-2">
                        {formData.images.map((image, index) => (
                            <div key={index} className="flex gap-3 items-center">
                                <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-xs text-gray-400 relative">
                                    {image ? (
                                        <img loading="lazy" 
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
                                {index === 0 && image.trim() && (
                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg flex-shrink-0">
                                        PRIMARY
                                    </span>
                                )}
                                {index !== 0 && image.trim() && reorderImages && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => reorderImages(index, 0)}
                                        title="Set as primary image"
                                        className="px-2 py-1 text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] hover:bg-orange-50 flex-shrink-0"
                                    >
                                        <Star className="h-4 w-4" />
                                    </Button>
                                )}
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
                )}

                {/* Upload mode */}
                {imageUploadMode === "upload" && (
                    <div className="space-y-3">
                        {imageFiles.map((file, index) => (
                            <div key={index} className="flex gap-3 items-center">
                                <FileSlot
                                    index={index}
                                    file={file}
                                    error={imageFileErrors[index] ?? null}
                                    onFileSelect={onFileSelect}
                                    onRemove={() => removeImageFileSlot(index)}
                                    showRemove={imageFiles.length > 1}
                                />
                                {index === 0 && file && (
                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg flex-shrink-0">
                                        PRIMARY
                                    </span>
                                )}
                                {index !== 0 && file && reorderImageFile && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => reorderImageFile(index, 0)}
                                        title="Set as primary image"
                                        className="px-2 py-1 text-orange-500 hover:text-orange-600 flex-shrink-0"
                                    >
                                        <Star className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addImageFileSlot}
                            className="w-full border-dashed"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another Image
                        </Button>
                    </div>
                )}

                <p className="text-xs text-gray-500">
                    The first image is the thumbnail. Aim for 1600×1200, neutral
                    backgrounds.
                </p>
                {errors.images && (
                    <p className="text-sm text-red-600">{errors.images}</p>
                )}
            </div>
        </div>
    );
}
