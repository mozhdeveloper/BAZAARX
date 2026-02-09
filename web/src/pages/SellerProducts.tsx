import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Plus,
    Search,
    Trash2,
    MoreHorizontal,
    Package,
    Star,
    ToggleLeft,
    ToggleRight,
    ArrowLeft,
    LogOut,
    AlertTriangle,
    Clock,
    BadgeCheck,
    Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
    useAuthStore,
    useProductStore,
    SellerProduct,
} from "@/stores/sellerStore";
import { sellerLinks } from "@/config/sellerLinks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BulkUploadModal, BulkProductData } from "@/components/BulkUploadModal";
import { productService } from "@/services/productService";
import { ProductFormTabs } from "@/components/seller/products/ProductFormTabs";
import { GeneralInfoTab } from "@/components/seller/products/GeneralInfoTab";
import { AttributesTab } from "@/components/seller/products/AttributesTab";

const Logo = () => (
    <Link
        to="/seller"
        className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
        <img
            src="/Logo.png"
            alt="BazaarPH Logo"
            className="h-8 w-8 object-contain flex-shrink-0"
        />
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-semibold text-gray-900 whitespace-pre"
        >
            BazaarPH Seller
        </motion.span>
    </Link>
);

const LogoIcon = () => (
    <Link
        to="/seller"
        className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
        <img
            src="/Logo.png"
            alt="BazaarPH Logo"
            className="h-8 w-8 object-contain flex-shrink-0"
        />
    </Link>
);

export function SellerProducts() {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(
        null,
    );
    const [editFormData, setEditFormData] = useState({
        name: "",
        price: 0,
        stock: 0,
    });
    const [editVariants, setEditVariants] = useState<
        Array<{
            id: string;
            name?: string;
            size?: string;
            color?: string;
            price: number;
            stock: number;
        }>
    >([]);

    const { seller, logout } = useAuthStore();
    const { products, updateProduct, deleteProduct, bulkAddProducts } =
        useProductStore();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { fetchProducts } = useProductStore();

    useEffect(() => {
        if (seller?.id) {
            fetchProducts({ sellerId: seller.id });
        }
    }, [seller?.id, fetchProducts]);

    const handleLogout = () => {
        logout();
        navigate("/seller/auth");
    };

    // Find this block in your SellerProducts component
    const filteredProducts = products.filter((product) => {
        // 1. Check if the product belongs to the currently logged-in seller
        const matchesSeller = product.sellerId === seller?.id;

        // 2. Existing search logic
        const matchesSearch = product.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        // 3. Existing status filter logic
        const matchesFilter =
            filterStatus === "all" ||
            (filterStatus === "active" && product.isActive) ||
            (filterStatus === "inactive" && !product.isActive);

        // Only return true if it belongs to the seller AND matches search/filters
        return matchesSeller && matchesSearch && matchesFilter;
    });

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await updateProduct(id, { isActive: !currentStatus });
            toast({
                title: currentStatus
                    ? "Product Deactivated"
                    : "Product Activated",
                description: `Product status has been updated.`,
            });
        } catch (error) {
            console.error("Error toggling status.", error);
            toast({
                title: "Update Failed",
                description: "Failed to update product status.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteProduct(id);
                toast({
                    title: "Product Deleted",
                    description: "Product has been successfully removed.",
                });
            } catch (error) {
                console.error("Error deleting product.", error);
                toast({
                    title: "Delete Failed",
                    description: "Failed to delete product.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleEditClick = (product: SellerProduct) => {
        setEditingProduct(product);
        setEditFormData({
            name: product.name,
            price: product.price,
            stock: product.stock,
        });
        // Copy variants for editing
        setEditVariants(
            (product.variants || []).map((v) => ({
                id: v.id,
                name: v.name,
                size: v.size,
                color: v.color,
                price: v.price,
                stock: v.stock,
            })),
        );
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (editingProduct) {
            try {
                // If there are variants, update them via productService
                if (editVariants.length > 0) {
                    await productService.updateVariants(
                        editVariants.map((v) => ({
                            id: v.id,
                            price: v.price,
                            stock: v.stock,
                        })),
                    );
                }

                // Call the store function to update product name/price
                await updateProduct(editingProduct.id, {
                    name: editFormData.name,
                    price: editFormData.price,
                    // Only update stock if no variants (otherwise stock is from variants)
                    stock:
                        editVariants.length > 0
                            ? editVariants.reduce((sum, v) => sum + v.stock, 0)
                            : editFormData.stock,
                });

                // Refetch products to get updated data
                if (seller?.id) {
                    await fetchProducts({ sellerId: seller.id });
                }

                toast({
                    title: "Product Updated",
                    description: `${editFormData.name} has been successfully updated.`,
                });

                setIsEditDialogOpen(false);
                setEditingProduct(null);
                setEditVariants([]);
            } catch (error) {
                console.error("Error updating product.", error);
                toast({
                    title: "Update Failed",
                    description:
                        "There was an error updating the product. Please try again.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleBulkUpload = async (products: BulkProductData[]) => {
        try {
            await bulkAddProducts(products); // This now returns a Promise
            toast({
                title: "Bulk Upload Successful",
                description: `${products.length} products have been added to your inventory.`,
            });
            setIsBulkUploadOpen(false);
        } catch (error) {
            console.error("Error during bulk upload.", error);
            toast({
                title: "Error",
                description: "Failed to upload products. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {sellerLinks.map((link, idx) => (
                                <SidebarLink key={idx} link={link} />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <SidebarLink
                            link={{
                                label: seller?.name || "Seller",
                                href: "/seller/profile",
                                icon: (
                                    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">
                                            {seller?.name?.charAt(0) || "S"}
                                        </span>
                                    </div>
                                ),
                            }}
                        />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
                        >
                            <LogOut className="h-5 w-5 flex-shrink-0" />
                            {open && <span>Logout</span>}
                        </button>
                    </div>
                </SidebarBody>
            </Sidebar>

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto">
                    <div className="w-full max-w-7xl mx-auto">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">
                                        Products
                                    </h1>
                                    <p className="text-gray-600 mt-1">
                                        Manage your product inventory
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={() =>
                                            setIsBulkUploadOpen(true)
                                        }
                                        variant="outline"
                                        className="border-orange-500 text-orange-500 hover:bg-orange-50 flex items-center gap-2"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Bulk Upload
                                    </Button>
                                    <Link to="/seller/products/add">
                                        <Button className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2">
                                            <Plus className="h-4 w-4" />
                                            Add Product
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <select
                                    value={filterStatus}
                                    onChange={(e) =>
                                        setFilterStatus(e.target.value)
                                    }
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                >
                                    <option value="all">All Products</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Products Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProducts.map((product) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                                    >
                                        <div className="relative">
                                            <img
                                                src={product.images[0]}
                                                alt={product.name}
                                                className="w-full h-48 object-cover"
                                            />
                                            <div className="absolute top-3 left-3">
                                                <button
                                                    onClick={() =>
                                                        handleToggleStatus(
                                                            product.id,
                                                            product.isActive,
                                                        )
                                                    }
                                                    className="flex items-center gap-1"
                                                >
                                                    {product.isActive ? (
                                                        <ToggleRight className="h-6 w-6 text-green-500" />
                                                    ) : (
                                                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="absolute top-3 right-3">
                                                <div className="relative">
                                                    <button className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                                                        <MoreHorizontal className="h-4 w-4 text-gray-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-medium text-gray-900 line-clamp-2">
                                                    {product.name}
                                                </h3>
                                            </div>

                                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                                {product.description}
                                            </p>

                                            {/* Approval Status Badge */}
                                            {product.approvalStatus && (
                                                <div className="mb-3">
                                                    {product.approvalStatus ===
                                                        "pending" && (
                                                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Pending Approval
                                                        </Badge>
                                                    )}
                                                    {product.approvalStatus ===
                                                        "approved" && (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                            <BadgeCheck className="w-3 h-3 mr-1" />
                                                            Verified
                                                        </Badge>
                                                    )}
                                                    {product.approvalStatus ===
                                                        "rejected" && (
                                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Rejected
                                                        </Badge>
                                                    )}
                                                    {product.approvalStatus ===
                                                        "reclassified" && (
                                                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Category Adjusted
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                    <span className="text-sm text-gray-600">
                                                        {product.rating}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        ({product.reviews})
                                                    </span>
                                                </div>
                                                <span
                                                    className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-medium",
                                                        product.isActive
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-gray-100 text-gray-700",
                                                    )}
                                                >
                                                    {product.isActive
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        ₱
                                                        {product.price.toLocaleString()}
                                                    </p>
                                                    {product.originalPrice && (
                                                        <p className="text-sm text-gray-500 line-through">
                                                            ₱
                                                            {product.originalPrice.toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    Stock: {product.stock}
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() =>
                                                        handleEditClick(product)
                                                    }
                                                    className="flex-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-center text-sm font-medium"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(product.id)
                                                    }
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {filteredProducts.length === 0 && (
                                <div className="text-center py-12">
                                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No products found
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Start by adding your first product to
                                        your store
                                    </p>
                                    <Link to="/seller/products/add">
                                        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                                            Add Your First Product
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Product Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent
                    className={
                        editVariants.length > 0
                            ? "sm:max-w-[600px]"
                            : "sm:max-w-[425px]"
                    }
                >
                    <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                        <DialogDescription>
                            {editVariants.length > 0
                                ? "Update product details and manage variant stock/prices."
                                : "Update product name, price, and stock quantity."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div>
                            <Label htmlFor="edit-name" className="mb-2 block">
                                Product Name
                            </Label>
                            <Input
                                id="edit-name"
                                value={editFormData.name}
                                onChange={(e) =>
                                    setEditFormData({
                                        ...editFormData,
                                        name: e.target.value,
                                    })
                                }
                                className="w-full"
                                placeholder="Enter product name"
                            />
                        </div>

                        <div>
                            <Label htmlFor="edit-price" className="mb-2 block">
                                Base Price (₱)
                            </Label>
                            <Input
                                id="edit-price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={editFormData.price}
                                onChange={(e) =>
                                    setEditFormData({
                                        ...editFormData,
                                        price: parseFloat(e.target.value) || 0,
                                    })
                                }
                                className="w-full"
                                placeholder="Enter price"
                            />
                        </div>

                        {/* Show variants or simple stock field */}
                        {editVariants.length > 0 ? (
                            <div className="border rounded-lg p-3 bg-gray-50">
                                <Label className="mb-2 block font-medium">
                                    Variants ({editVariants.length})
                                </Label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Total Stock:{" "}
                                    {editVariants.reduce(
                                        (sum, v) => sum + v.stock,
                                        0,
                                    )}
                                </p>
                                <div className="space-y-3 max-h-48 overflow-y-auto">
                                    {editVariants.map((variant, index) => (
                                        <div
                                            key={variant.id}
                                            className="flex items-center gap-3 p-2 bg-white rounded border"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {variant.name ||
                                                        [
                                                            variant.size,
                                                            variant.color,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" - ") ||
                                                        `Variant ${index + 1}`}
                                                </p>
                                                <div className="flex gap-1 text-xs text-gray-500">
                                                    {variant.size && (
                                                        <span className="bg-blue-100 text-blue-700 px-1 rounded">
                                                            {variant.size}
                                                        </span>
                                                    )}
                                                    {variant.color && (
                                                        <span className="bg-purple-100 text-purple-700 px-1 rounded">
                                                            {variant.color}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <Label className="text-xs text-gray-500">
                                                        Price
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={variant.price}
                                                        onChange={(e) => {
                                                            const newVariants =
                                                                [
                                                                    ...editVariants,
                                                                ];
                                                            newVariants[index] =
                                                                {
                                                                    ...variant,
                                                                    price:
                                                                        parseFloat(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ) || 0,
                                                                };
                                                            setEditVariants(
                                                                newVariants,
                                                            );
                                                        }}
                                                        className="w-20 h-8 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-gray-500">
                                                        Stock
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={variant.stock}
                                                        onChange={(e) => {
                                                            const newVariants =
                                                                [
                                                                    ...editVariants,
                                                                ];
                                                            newVariants[index] =
                                                                {
                                                                    ...variant,
                                                                    stock:
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ) || 0,
                                                                };
                                                            setEditVariants(
                                                                newVariants,
                                                            );
                                                        }}
                                                        className="w-20 h-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <Label
                                    htmlFor="edit-stock"
                                    className="mb-2 block"
                                >
                                    Stock Quantity
                                </Label>
                                <Input
                                    id="edit-stock"
                                    type="number"
                                    min="0"
                                    value={editFormData.stock}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            stock:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full"
                                    placeholder="Enter stock quantity"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsEditDialogOpen(false);
                                setEditingProduct(null);
                                setEditVariants([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            className="bg-orange-500 hover:bg-orange-600"
                            disabled={
                                !editFormData.name.trim() ||
                                editFormData.price <= 0 ||
                                (editVariants.length === 0 &&
                                    editFormData.stock < 0) ||
                                (editVariants.length > 0 &&
                                    editVariants.some(
                                        (v) => v.stock < 0 || v.price < 0,
                                    ))
                            }
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Upload Modal */}
            <BulkUploadModal
                isOpen={isBulkUploadOpen}
                onClose={() => setIsBulkUploadOpen(false)}
                onUpload={handleBulkUpload}
            />
        </div>
    );
}

export function AddProduct() {
    const navigate = useNavigate();
    const { addProduct } = useProductStore();
    const { seller } = useAuthStore();
    const { toast } = useToast();

    // Variant configuration interface
    interface VariantConfig {
        id: string;
        size: string;
        color: string;
        stock: number;
        price: number;
        sku: string;
        image: string;
    }

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        originalPrice: "",
        stock: "",
        category: "",
        images: [""],
        sizes: [] as string[],
        colors: [] as string[],
    });
    const [variationInput, setVariationInput] = useState("");
    const [colorInput, setColorInput] = useState("");

    // Custom attribute names state
    const [firstAttributeName, setFirstAttributeName] = useState("Variations");
    const [secondAttributeName, setSecondAttributeName] = useState("Colors");
    const [editingFirstAttributeName, setEditingFirstAttributeName] =
        useState(false);
    const [editingSecondAttributeName, setEditingSecondAttributeName] =
        useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<"general" | "attributes">(
        "general",
    );

    // Variant stock configuration - CRUD approach
    const [variantConfigs, setVariantConfigs] = useState<VariantConfig[]>([]);
    const [showAddVariantForm, setShowAddVariantForm] = useState(false);

    // Categories fetched from database
    const [categories, setCategories] = useState<
        { id: string; name: string }[]
    >([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const dbCategories = await productService.getCategories();
                if (dbCategories.length > 0) {
                    setCategories(
                        dbCategories.map((c) => ({ id: c.id, name: c.name })),
                    );
                } else {
                    // Fallback to default categories if none in DB
                    setCategories([
                        { id: "electronics", name: "Electronics" },
                        { id: "fashion", name: "Fashion" },
                        { id: "home-garden", name: "Home & Garden" },
                        { id: "sports", name: "Sports" },
                        { id: "books", name: "Books" },
                        { id: "beauty", name: "Beauty" },
                        { id: "automotive", name: "Automotive" },
                        { id: "toys", name: "Toys" },
                        { id: "health", name: "Health" },
                        { id: "food-beverage", name: "Food & Beverage" },
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch categories:", error);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);
    const [newVariant, setNewVariant] = useState<Partial<VariantConfig>>({
        size: "",
        color: "",
        stock: 0,
        price: 0,
        sku: "",
        image: "",
    });
    const [editingVariantId, setEditingVariantId] = useState<string | null>(
        null,
    );

    // Generate unique ID for variants
    const generateVariantId = () =>
        `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add a new variant
    const addVariant = () => {
        if (!newVariant.size && !newVariant.color) {
            setErrors((prev) => ({
                ...prev,
                variant: "At least one of Size or Color is required",
            }));
            return;
        }

        // Check for duplicates
        const isDuplicate = variantConfigs.some(
            (v) =>
                v.size === (newVariant.size || "") &&
                v.color === (newVariant.color || ""),
        );
        if (isDuplicate) {
            setErrors((prev) => ({
                ...prev,
                variant: "This variant combination already exists",
            }));
            return;
        }

        const basePrice = parseInt(formData.price) || 0;
        const variant: VariantConfig = {
            id: generateVariantId(),
            size: newVariant.size || "",
            color: newVariant.color || "",
            stock: newVariant.stock || 0,
            // Use variant's price if set (even if 0), otherwise use base price
            price:
                newVariant.price !== undefined && newVariant.price > 0
                    ? newVariant.price
                    : basePrice,
            sku:
                newVariant.sku ||
                `${formData.name.substring(0, 3).toUpperCase()}-${newVariant.size || "DEF"}-${newVariant.color || "DEF"}`.replace(
                    /\s+/g,
                    "-",
                ),
            image: newVariant.image || "",
        };

        setVariantConfigs((prev) => [...prev, variant]);
        setNewVariant({
            size: "",
            color: "",
            stock: 0,
            price: 0,
            sku: "",
            image: "",
        });
        setShowAddVariantForm(false);
        setErrors((prev) => ({ ...prev, variant: "" }));
    };

    // Update an existing variant
    const updateVariantConfig = (
        id: string,
        field: keyof VariantConfig,
        value: string | number,
    ) => {
        setVariantConfigs((prev) =>
            prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
        );
    };

    // Delete a variant
    const deleteVariant = (id: string) => {
        setVariantConfigs((prev) => {
            const updated = prev.filter((v) => v.id !== id);
            return updated;
        });
    };

    // Start editing a variant
    const startEditVariant = (variant: VariantConfig) => {
        setEditingVariantId(variant.id);
    };

    // Cancel editing
    const cancelEditVariant = () => {
        setEditingVariantId(null);
    };

    // Calculate total stock from variants
    const getTotalVariantStock = () => {
        return variantConfigs.reduce((sum, v) => sum + (v.stock || 0), 0);
    };

    // Categories now fetched from database via useEffect above

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const addVariation = () => {
        const trimmed = variationInput.trim();
        if (trimmed && !formData.sizes.includes(trimmed)) {
            setFormData((prev) => ({
                ...prev,
                sizes: [...prev.sizes, trimmed],
            }));
            setVariationInput("");
        }
    };

    const removeVariation = (variation: string) => {
        setFormData((prev) => ({
            ...prev,
            sizes: prev.sizes.filter((v) => v !== variation),
        }));
    };

    const addColor = () => {
        const trimmed = colorInput.trim();
        if (trimmed && !formData.colors.includes(trimmed)) {
            setFormData((prev) => ({
                ...prev,
                colors: [...prev.colors, trimmed],
            }));
            setColorInput("");
        }
    };

    const removeColor = (color: string) => {
        setFormData((prev) => ({
            ...prev,
            colors: prev.colors.filter((c) => c !== color),
        }));
    };

    const handleImageChange = (index: number, value: string) => {
        const newImages = [...formData.images];
        newImages[index] = value;
        setFormData((prev) => ({ ...prev, images: newImages }));
    };

    const addImageField = () => {
        setFormData((prev) => ({
            ...prev,
            images: [...prev.images, ""],
        }));
    };

    const removeImageField = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Product name is required";
        }
        if (!formData.description.trim()) {
            newErrors.description = "Description is required";
        }
        if (!formData.price || parseInt(formData.price) <= 0) {
            newErrors.price = "Price must be greater than 0";
        }

        // If using variant stock, check that at least one variant has stock
        if (variantConfigs.length > 0) {
            const totalVariantStock = getTotalVariantStock();
            if (totalVariantStock <= 0) {
                newErrors.variants = "At least one variant must have stock";
            }
        } else if (!formData.stock || parseInt(formData.stock) < 0) {
            newErrors.stock = "Stock cannot be negative";
        }

        if (!formData.category) {
            newErrors.category = "Please select a category";
        }
        const validImages = formData.images.filter((img) => img.trim() !== "");
        if (validImages.length === 0) {
            newErrors.images = "At least one product image is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Calculate total stock - from variants if using variant stock, else from form
            const totalStock =
                variantConfigs.length > 0
                    ? getTotalVariantStock()
                    : parseInt(formData.stock);

            const productData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                price: parseInt(formData.price),
                originalPrice: formData.originalPrice
                    ? parseInt(formData.originalPrice)
                    : undefined,
                stock: totalStock,
                category: formData.category,
                images: formData.images.filter((img) => img.trim() !== ""),
                sizes: formData.sizes,
                colors: formData.colors,
                isActive: true,
                sellerId: seller?.id || "",
                // Pass custom variant label names for the products table
                variantLabel1:
                    firstAttributeName !== "Variations"
                        ? firstAttributeName
                        : undefined,
                variantLabel2:
                    secondAttributeName !== "Colors"
                        ? secondAttributeName
                        : undefined,
                // Pass variant configurations for database creation
                variants:
                    variantConfigs.length > 0 ? variantConfigs : undefined,
            };

            await addProduct(productData);

            // Show success message
            toast({
                title: "Product Added",
                description: `${formData.name} has been successfully submitted for review.`,
            });
            navigate("/seller/products");
        } catch (error) {
            console.error("Failed to add product:", error);
            alert("Failed to add product. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-white">
            <div className="max-w-6xl mx-auto px-6 pb-16">
                <div className="flex items-center justify-between py-6">
                    <div className="flex items-center gap-3">
                        <Link to="/seller/products">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full border border-orange-200 bg-white/70 backdrop-blur"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Products
                            </Button>
                        </Link>
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                                New Listing
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mt-2">
                                Add New Product
                            </h1>
                            <p className="text-gray-600 text-sm">
                                Craft a beautiful, conversion-ready listing.
                            </p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Auto-save not enabled
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Preview Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 space-y-4">
                            <div className="rounded-2xl border border-orange-100 bg-white shadow-sm overflow-hidden">
                                <div className="relative aspect-[4/5] bg-gradient-to-b from-orange-100 via-white to-white">
                                    {formData.images[0] ? (
                                        <img
                                            src={formData.images[0]}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-gray-300 text-sm">
                                            Preview your first image
                                        </div>
                                    )}
                                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm">
                                        Live Preview
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-gray-400">
                                            Product Title
                                        </p>
                                        <h3 className="font-semibold text-lg text-gray-900 truncate">
                                            {formData.name ||
                                                "Your product name"}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-3">
                                        {formData.description ||
                                            "Add a short, compelling description to help shoppers decide."}
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-bold text-gray-900">
                                            ₱{formData.price || "0.00"}
                                        </span>
                                        {formData.originalPrice && (
                                            <span className="text-sm text-gray-400 line-through">
                                                ₱{formData.originalPrice}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.sizes.length > 0 ? (
                                            formData.sizes.map((size, idx) => (
                                                <span
                                                    key={`${size}-${idx}`}
                                                    className="rounded-full bg-orange-50 text-orange-700 px-3 py-1 text-xs font-semibold"
                                                >
                                                    {size}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">
                                                No variations added
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(formData.colors.length
                                            ? formData.colors
                                            : ["No colors"]
                                        ).map((color, idx) => (
                                            <span
                                                key={`${color}-${idx}`}
                                                className={cn(
                                                    "rounded-full border px-3 py-1 text-xs font-semibold",
                                                    formData.colors.length
                                                        ? "border-blue-200 bg-blue-50 text-blue-700"
                                                        : "border-gray-200 text-gray-400 italic",
                                                )}
                                            >
                                                {color}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-white/70 backdrop-blur shadow-sm p-4">
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>Checklist</span>
                                    <span className="text-xs font-semibold text-orange-600">
                                        Optional
                                    </span>
                                </div>
                                <div className="mt-3 space-y-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                                        Add at least 3 images
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                                        Add variations if product has options
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                                        Keep description concise
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Panel */}
                    <div className="lg:col-span-2">
                        <form
                            onSubmit={handleSubmit}
                            className="bg-white/90 backdrop-blur rounded-2xl border border-gray-100 shadow-sm p-6 space-y-8"
                        >
                            {/* Tab Navigation */}
                            <ProductFormTabs
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                            />

                            {/* General Information Tab */}
                            {activeTab === "general" && (
                                <GeneralInfoTab
                                    formData={formData}
                                    errors={errors}
                                    variantConfigs={variantConfigs}
                                    categories={categories}
                                    loadingCategories={loadingCategories}
                                    handleChange={handleChange}
                                    handleImageChange={handleImageChange}
                                    addImageField={addImageField}
                                    removeImageField={removeImageField}
                                    getTotalVariantStock={getTotalVariantStock}
                                />
                            )}

                            {/* Attributes and Variants Tab */}
                            {activeTab === "attributes" && (
                                <AttributesTab
                                    formData={formData}
                                    variationInput={variationInput}
                                    setVariationInput={setVariationInput}
                                    colorInput={colorInput}
                                    setColorInput={setColorInput}
                                    addVariation={addVariation}
                                    removeVariation={removeVariation}
                                    addColor={addColor}
                                    removeColor={removeColor}
                                    firstAttributeName={firstAttributeName}
                                    setFirstAttributeName={
                                        setFirstAttributeName
                                    }
                                    secondAttributeName={secondAttributeName}
                                    setSecondAttributeName={
                                        setSecondAttributeName
                                    }
                                    editingFirstAttributeName={
                                        editingFirstAttributeName
                                    }
                                    setEditingFirstAttributeName={
                                        setEditingFirstAttributeName
                                    }
                                    editingSecondAttributeName={
                                        editingSecondAttributeName
                                    }
                                    setEditingSecondAttributeName={
                                        setEditingSecondAttributeName
                                    }
                                    variantConfigs={variantConfigs}
                                    editingVariantId={editingVariantId}
                                    showAddVariantForm={showAddVariantForm}
                                    newVariant={newVariant}
                                    errors={errors}
                                    getTotalVariantStock={getTotalVariantStock}
                                    updateVariantConfig={updateVariantConfig}
                                    cancelEditVariant={cancelEditVariant}
                                    startEditVariant={startEditVariant}
                                    deleteVariant={deleteVariant}
                                    setShowAddVariantForm={
                                        setShowAddVariantForm
                                    }
                                    setNewVariant={setNewVariant}
                                    setErrors={setErrors}
                                    addVariant={addVariant}
                                />
                            )}

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/seller/products")}
                                    className="flex-1 rounded-full"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-orange-700"
                                >
                                    {isSubmitting
                                        ? "Adding Product..."
                                        : "Publish Product"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
