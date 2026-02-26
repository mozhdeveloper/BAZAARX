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
    ChevronDown,
    Check,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import {
    useAuthStore,
    useProductStore,
    SellerProduct,
} from "@/stores/sellerStore";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BulkUploadModal, BulkProductData } from "@/components/BulkUploadModal";
import { productService } from "@/services/productService";
import { ProductFormTabs } from "@/components/seller/products/ProductFormTabs";
import { GeneralInfoTab } from "@/components/seller/products/GeneralInfoTab";
import { AttributesTab } from "@/components/seller/products/AttributesTab";
import { uploadProductImages, validateImageFile, compressImage } from "@/utils/storage";



export function SellerProducts() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(
        null,
    );
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        price: 0,
        stock: 0,
    });
    const [editVariants, setEditVariants] = useState<
        Array<{
            id: string;
            name?: string;
            variantLabel1Value?: string;
            variantLabel2Value?: string;
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
            (filterStatus === "inactive" && !product.isActive) ||
            (filterStatus === "pending" && product.approvalStatus === "pending");

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

    const handleDeleteClick = (id: string) => {
        setProductToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (productToDelete) {
            try {
                await deleteProduct(productToDelete);
                toast({
                    title: "Product Deleted",
                    description: "Product has been successfully removed.",
                });
                setIsDeleteDialogOpen(false);
                setProductToDelete(null);
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
                variantLabel1Value: v.variantLabel1Value,
                variantLabel2Value: v.variantLabel2Value,
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
        <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
            <SellerSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto scrollbar-hide relative">
                    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
                    </div>
                    <div className="w-full max-w-7xl mx-auto space-y-8 relative z-10 pb-10">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-extrabold text-[var(--text-headline)] font-heading tracking-tight">
                                    Products
                                </h1>
                                <p className="text-[var(--text-muted)] mt-1 text-sm">
                                    Manage your product inventory
                                </p>
                            </div>
                        </div>

                        <div>
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center">
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="h-9 w-[160px] bg-[var(--bg-secondary)] border border-[var(--brand-wash-gold)] rounded-xl text-[var(--text-headline)] focus:outline-none focus:ring-0 focus:border-[var(--brand-primary)] transition-all font-medium text-sm">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-gray-100 bg-[var(--bg-secondary)]">
                                        <SelectItem value="all" className="text-xs">All Products</SelectItem>
                                        <SelectItem value="active" className="text-xs">Active</SelectItem>
                                        <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                                        <SelectItem value="pending" className="text-xs">Pending Approval</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex-1 w-full relative group">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="w-full h-9 pl-10 pr-4 bg-white border border-[var(--brand-wash-gold)] shadow-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all text-sm placeholder:text-[var(--text-muted)]"
                                    />
                                </div>
                                <div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto">
                                    <Button
                                        onClick={() =>
                                            setIsBulkUploadOpen(true)
                                        }
                                        variant="outline"
                                        className="h-9 px-4 border-orange-200 bg-orange-50 text-[var(--brand-primary)] hover:bg-orange-100 hover:text-orange-700 flex items-center gap-2 rounded-xl font-bold transition-all shadow-sm text-sm"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Bulk Upload
                                    </Button>
                                    <Link to="/seller/products/add">
                                        <Button className="h-9 px-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white flex items-center gap-2 rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-sm">
                                            <Plus className="h-5 w-5" />
                                            Add Product
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            <div className="text-sm font-sm text-gray-400 mb-4 pl-1">
                                Showing <span className="text-[var(--brand-primary)] font-bold">{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'product' : 'products'}
                            </div>

                            {/* Products Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredProducts.map((product) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] hover:-translate-y-1 transition-all duration-300 group border border-transparent hover:border-orange-100 flex flex-col"
                                    >
                                        <div className="relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                                            <img
                                                src={product.images[0]}
                                                alt={product.name}
                                                className="w-full h-40 object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            {/* Status badge overlay — top left */}
                                            {product.approvalStatus === "pending" && (
                                                <div className="absolute top-2 left-2 z-20">
                                                    <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[var(--color-pending)] backdrop-blur-sm text-white">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        <span className="text-[10px] font-bold tracking-wide">Pending Approval</span>
                                                    </div>
                                                </div>
                                            )}
                                            {product.approvalStatus === "rejected" && (
                                                <div className="absolute top-2 left-2 z-20">
                                                    <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-red-500/90 backdrop-blur-sm text-white">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        <span className="text-[10px] font-bold tracking-wide">Rejected</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="mb-2">
                                                {/* Name + verified icon inline */}
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <h3 className="font-bold text-[var(--text-headline)] line-clamp-1 text-base group-hover:text-[var(--brand-primary)] transition-colors font-heading">
                                                        {product.name}
                                                    </h3>
                                                    {product.approvalStatus === "approved" && (
                                                        <BadgeCheck className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-[var(--text-secondary)] text-xs line-clamp-1 leading-relaxed opacity-80">
                                                    {product.description}
                                                </p>
                                            </div>



                                            {/* Rating row */}
                                            <div className="flex items-center gap-1 mb-3">
                                                <Star className="h-3.5 w-3.5 text-orange-400 fill-current" />
                                                <span className="text-xs font-bold text-gray-700">
                                                    {product.rating}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    ({product.reviews})
                                                </span>
                                            </div>

                                            {/* Price + Stock + Buttons — always at bottom */}
                                            <div className="mt-auto">
                                                <div className="flex items-center justify-between mb-3 border-t border-gray-50 pt-3">
                                                    <div>
                                                        <p className="text-lg font-black text-[var(--brand-primary)] font-heading">
                                                            ₱{product.price.toLocaleString()}
                                                        </p>
                                                        {product.originalPrice && (
                                                            <p className="text-xs text-gray-400 line-through font-medium">
                                                                ₱{product.originalPrice.toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[12px] font-sm text-gray-500">Stock</span>
                                                        <span className="text-[12px] font-sm text-gray-500">{product.stock}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleEditClick(product)
                                                        }
                                                        className="flex-1 h-10 flex items-center justify-center bg-orange-50 text-[var(--secondary-foreground)] rounded-xl hover:bg-[var(--brand-primary)] hover:text-white transition-all text-sm font-bold hover:shadow-lg hover:shadow-orange-500/20 active:scale-95"
                                                    >
                                                        Edit Product
                                                    </button>
                                                    {/* Active/Inactive toggle */}
                                                    {product.approvalStatus !== 'pending' && (
                                                        <button
                                                            onClick={() => handleToggleStatus(product.id, product.isActive)}
                                                            className={cn(
                                                                "h-10 w-10 flex items-center justify-center rounded-xl transition-all active:scale-95",
                                                                product.isActive
                                                                    ? "text-green-600 hover:text-green-700"
                                                                    : "text-gray-400 hover:text-gray-500"
                                                            )}
                                                        >
                                                            {product.isActive
                                                                ? <ToggleRight className="h-5 w-5" />
                                                                : <ToggleLeft className="h-5 w-5" />
                                                            }
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            handleDeleteClick(product.id)
                                                        }
                                                        className="h-10 w-10 flex items-center justify-center text-red-500 rounded-xl hover:text-red-700 transition-all active:scale-95"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {filteredProducts.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-200">
                                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                        <Package className="h-10 w-10 text-[var(--brand-primary)]" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-headline)] mb-2 font-heading">
                                        No products found
                                    </h3>
                                    <p className="text-[var(--text-secondary)] mb-8 text-center max-w-xs font-medium">
                                        Start by adding your first product to your store inventory
                                    </p>
                                    <Link to="/seller/products/add">
                                        <Button className="h-12 px-8 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl font-bold text-base shadow-xl shadow-orange-500/20 hover:scale-105 transition-all">
                                            <Plus className="h-5 w-5 mr-2" />
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
                    className={cn(
                        "bg-white border-none shadow-2xl scrollbar-hide focus-visible:ring-0 focus:ring-0",
                        editVariants.length > 0
                            ? "sm:max-w-[600px]"
                            : "sm:max-w-[425px]"
                    )}
                >
                    <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                        <DialogDescription>
                            {editVariants.length > 0
                                ? "Update product details and manage variant stock/prices."
                                : "Update product name, price, and stock quantity."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
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
                                className="w-full focus-visible:ring-0 focus:ring-0 border-gray-100 focus:border-[var(--brand-primary)] transition-all"
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
                                className="w-full focus-visible:ring-0 focus:ring-0 border-gray-100 focus:border-[var(--brand-primary)] transition-all"
                                placeholder="Enter price"
                            />
                        </div>

                        {/* Show variants or simple stock field */}
                        {editVariants.length > 0 ? (
                            <div className="border border-gray-100 rounded-xl p-4 bg-white">
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
                                <div className="space-y-3 max-h-56 overflow-y-auto scrollbar-hide">
                                    {editVariants.map((variant, index) => (
                                        <div
                                            key={variant.id}
                                            className="flex items-center gap-3 p-2 bg-white rounded border"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {variant.name ||
                                                        [
                                                            variant.variantLabel1Value,
                                                            variant.variantLabel2Value,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" - ") ||
                                                        `Variant ${index + 1}`}
                                                </p>
                                                <div className="flex gap-1 text-xs text-gray-500">
                                                    {variant.variantLabel1Value && (
                                                        <span className="bg-blue-100 text-blue-700 px-1 rounded">
                                                            {variant.variantLabel1Value}
                                                        </span>
                                                    )}
                                                    {variant.variantLabel2Value && (
                                                        <span className="bg-purple-100 text-purple-700 px-1 rounded">
                                                            {variant.variantLabel2Value}
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
                                                        className="w-24 h-9 text-sm focus-visible:ring-0 focus:ring-0 border-gray-100 focus:border-[var(--brand-primary)] transition-all"
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
                                                        className="w-24 h-9 text-sm focus-visible:ring-0 focus:ring-0 border-gray-100 focus:border-[var(--brand-primary)] transition-all"
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
                                    className="w-full focus-visible:ring-0 focus:ring-0 border-gray-100 focus:border-[var(--brand-primary)] transition-all"
                                    placeholder="Enter stock quantity"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsEditDialogOpen(false);
                                setEditingProduct(null);
                                setEditVariants([]);
                            }}
                            className="rounded-xl border-[var(--btn-border)] font-bold hover:bg-gray-100 hover:text-[var(--text-headline)] active:scale-95 transition-all h-11"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all px-8 h-11"
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white border-none shadow-2xl rounded-2xl p-6">
                    <DialogHeader className="space-y-3">
                        <div className="w-12 h-12 flex items-center justify-center mb-2">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-[var(--text-headline)]">
                            Delete Product?
                        </DialogTitle>
                        <DialogDescription className="text-[var(--text-muted)]">
                            Are you sure you want to delete this product? This action cannot be undone and will remove the product from your store inventory.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setProductToDelete(null);
                            }}
                            className="flex-1 h-11 rounded-xl border-gray-100 font-bold hover:bg-gray-100 hover:text-[var(--text-headline)] active:scale-95 transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
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
        variantLabel1Value: string;
        variantLabel2Value: string;
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
        variantLabel1Values: [] as string[],
        variantLabel2Values: [] as string[],
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
        variantLabel1Value: "",
        variantLabel2Value: "",
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
        if (!newVariant.variantLabel1Value && !newVariant.variantLabel2Value) {
            setErrors((prev) => ({
                ...prev,
                variant: "At least one variant attribute is required",
            }));
            return;
        }

        // Check for duplicates
        const isDuplicate = variantConfigs.some(
            (v) =>
                v.variantLabel1Value === (newVariant.variantLabel1Value || "") &&
                v.variantLabel2Value === (newVariant.variantLabel2Value || ""),
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
            variantLabel1Value: newVariant.variantLabel1Value || "",
            variantLabel2Value: newVariant.variantLabel2Value || "",
            stock: newVariant.stock || 0,
            // Use variant's price if set (even if 0), otherwise use base price
            price:
                newVariant.price !== undefined && newVariant.price > 0
                    ? newVariant.price
                    : basePrice,
            sku:
                newVariant.sku ||
                `${formData.name.substring(0, 3).toUpperCase()}-${newVariant.variantLabel1Value || "DEF"}-${newVariant.variantLabel2Value || "DEF"}`.replace(
                    /\s+/g,
                    "-",
                ),
            image: newVariant.image || "",
        };

        setVariantConfigs((prev) => [...prev, variant]);
        setNewVariant({
            variantLabel1Value: "",
            variantLabel2Value: "",
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

    // Image file upload state (for Upload mode in GeneralInfoTab)
    const [imageFiles, setImageFiles] = useState<(File | null)[]>([null]);
    const [imageFileErrors, setImageFileErrors] = useState<(string | null)[]>([null]);

    const handleFileSelect = async (index: number, file: File | null) => {
        if (!file) {
            const updated = [...imageFiles];
            updated[index] = null;
            setImageFiles(updated);
            const updatedErrors = [...imageFileErrors];
            updatedErrors[index] = null;
            setImageFileErrors(updatedErrors);
            return;
        }
        const validation = validateImageFile(file);
        if (!validation.valid) {
            const updatedErrors = [...imageFileErrors];
            updatedErrors[index] = validation.error ?? "Invalid file";
            setImageFileErrors(updatedErrors);
            return;
        }
        const compressed = await compressImage(file);
        const updated = [...imageFiles];
        updated[index] = compressed;
        setImageFiles(updated);
        const updatedErrors = [...imageFileErrors];
        updatedErrors[index] = null;
        setImageFileErrors(updatedErrors);
    };

    const addImageFileSlot = () => {
        setImageFiles((prev) => [...prev, null]);
        setImageFileErrors((prev) => [...prev, null]);
    };

    const removeImageFileSlot = (index: number) => {
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
        setImageFileErrors((prev) => prev.filter((_, i) => i !== index));
    };

    const setImageFileError = (index: number, error: string | null) => {
        setImageFileErrors((prev) => {
            const updated = [...prev];
            updated[index] = error;
            return updated;
        });
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
        if (trimmed && !formData.variantLabel1Values.includes(trimmed)) {
            setFormData((prev) => ({
                ...prev,
                variantLabel1Values: [...prev.variantLabel1Values, trimmed],
            }));
            setVariationInput("");
        }
    };

    const removeVariation = (variation: string) => {
        setFormData((prev) => ({
            ...prev,
            variantLabel1Values: prev.variantLabel1Values.filter((v) => v !== variation),
        }));
    };

    const addColor = () => {
        const trimmed = colorInput.trim();
        if (trimmed && !formData.variantLabel2Values.includes(trimmed)) {
            setFormData((prev) => ({
                ...prev,
                variantLabel2Values: [...prev.variantLabel2Values, trimmed],
            }));
            setColorInput("");
        }
    };

    const removeColor = (color: string) => {
        setFormData((prev) => ({
            ...prev,
            variantLabel2Values: prev.variantLabel2Values.filter((c) => c !== color),
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

        const baseStock = parseInt(formData.stock) || 0;
        const totalStock = baseStock + getTotalVariantStock();

        if (baseStock < 0) {
            newErrors.stock = "Stock cannot be negative";
        }

        if (variantConfigs.length > 0) {
            if (totalStock <= 0) {
                newErrors.variants =
                    "Total stock must be greater than 0. Add stock to base variant or custom variants.";
            }
        } else if (baseStock <= 0) {
            newErrors.stock = "Stock must be greater than 0";
        }

        if (!formData.category) {
            newErrors.category = "Please select a category";
        }
        const validImages = formData.images.filter((img) => img.trim() !== "");
        const validFiles = imageFiles.filter((f): f is File => f !== null);
        if (validImages.length === 0 && validFiles.length === 0) {
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
            const baseStock = parseInt(formData.stock) || 0;
            const customVariantStock = getTotalVariantStock();
            const totalStock = baseStock + customVariantStock;

            const baseVariant =
                variantConfigs.length > 0 && baseStock > 0
                    ? {
                        id: `base-${Date.now()}`,
                        variantLabel1Value: "",
                        variantLabel2Value: "",
                        stock: baseStock,
                        price: parseInt(formData.price) || 0,
                        sku: `${(formData.name || "ITEM").substring(0, 3).toUpperCase()}-BASE`,
                        image: "",
                    }
                    : null;

            const variantsForSubmit =
                variantConfigs.length > 0
                    ? [...(baseVariant ? [baseVariant] : []), ...variantConfigs]
                    : undefined;

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
                variantLabel1Values: formData.variantLabel1Values,
                variantLabel2Values: formData.variantLabel2Values,
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
                variants: variantsForSubmit,
            };

            // Upload any file-based images and merge with URL images
            const filesToUpload = imageFiles.filter((f): f is File => f !== null);
            if (filesToUpload.length > 0 && seller?.id) {
                const tempProductId = crypto.randomUUID();
                const uploadedUrls = await uploadProductImages(
                    filesToUpload,
                    seller.id,
                    tempProductId,
                );
                productData.images = [...productData.images, ...uploadedUrls];
            }

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
        <div className="min-h-screen bg-[var(--brand-wash)] font-sans relative overflow-hidden">
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
            </div>
            <div className="max-w-6xl mx-auto px-6 pb-20 relative z-10">
                <div className="flex items-center justify-between py-10">
                    <div className="flex items-center gap-4">
                        <Link to="/seller/products">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-12 w-12 border border-white bg-white/50 backdrop-blur-md shadow-sm hover:bg-white hover:shadow-md transition-all text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 text-[var(--brand-primary)] border border-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                <Plus className="h-3 w-3" />
                                New Listing
                            </div>
                            <h1 className="text-3xl font-black text-[var(--text-headline)] mt-2 font-heading tracking-tight">
                                Add New Product
                            </h1>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">
                                Create a compelling product listing to attract buyers.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Preview Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 space-y-6">
                            <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] overflow-hidden border border-white/50">
                                <div className="relative aspect-[4/5] bg-gray-50">
                                    {(() => {
                                        const urlPreview = formData.images[0] || null;
                                        const filePreview = imageFiles[0] ? URL.createObjectURL(imageFiles[0]) : null;
                                        const previewSrc = urlPreview || filePreview;
                                        return previewSrc ? (
                                            <img
                                                src={previewSrc}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-gray-300 gap-4">
                                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <Upload className="h-8 w-8 text-gray-300" />
                                                </div>
                                                <p className="text-sm font-medium">Upload an image</p>
                                            </div>
                                        );
                                    })()}
                                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/30 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white shadow-lg border border-white/10">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        Live Preview
                                    </div>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--brand-primary)] mb-1">
                                            {categories.find(c => c.id === formData.category)?.name || "Category"}
                                        </p>
                                        <h3 className="font-bold text-xl text-[var(--text-headline)] font-heading leading-tight line-clamp-2">
                                            {formData.name || "Your Product Name"}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed opacity-80">
                                        {formData.description || "Product description will appear here..."}
                                    </p>

                                    <div className="flex items-end gap-2 border-t border-dashed border-gray-100 pt-4">
                                        <span className="text-3xl font-black text-[var(--text-headline)] font-heading">
                                            ₱{parseInt(formData.price || "0").toLocaleString()}
                                        </span>
                                        {formData.originalPrice && (
                                            <span className="text-sm text-gray-400 line-through font-medium mb-1.5 ml-1">
                                                ₱{parseInt(formData.originalPrice).toLocaleString()}
                                            </span>
                                        )}
                                    </div>

                                    {(formData.variantLabel1Values.length > 0 || formData.variantLabel2Values.length > 0) && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {formData.variantLabel1Values.slice(0, 3).map((val, idx) => (
                                                <span key={idx} className="px-2 py-1 rounded-md bg-gray-100 text-xs font-bold text-gray-600 border border-gray-200">
                                                    {val}
                                                </span>
                                            ))}
                                            {formData.variantLabel2Values.slice(0, 3).map((val, idx) => (
                                                <span key={idx} className="px-2 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-600 border border-gray-200">
                                                    {val}
                                                </span>
                                            ))}
                                            {(formData.variantLabel1Values.length > 3 || formData.variantLabel2Values.length > 3) && (
                                                <span className="px-2 py-1 rounded-md bg-white text-xs font-medium text-gray-400 border border-dashed border-gray-200">
                                                    + more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl bg-white shadow-sm border border-orange-100 p-6 relative overflow-hidden">
                                <h4 className="font-bold text-[var(--text-headline)] mb-4 flex items-center gap-2">
                                    <BadgeCheck className="w-5 h-5 text-[var(--brand-primary)]" />
                                    Listing Checklist
                                </h4>
                                <ul className="space-y-3">
                                    <li className={cn("flex items-center gap-3 text-sm font-medium transition-colors", (formData.images.filter(i => i).length >= 1 || imageFiles.some(f => f !== null)) ? "text-green-600" : "text-gray-400")}>
                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border", (formData.images.filter(i => i).length >= 1 || imageFiles.some(f => f !== null)) ? "bg-green-100 border-green-200 text-green-600" : "border-gray-200 bg-gray-50")}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                        Add at least 1 image
                                    </li>
                                    <li className={cn("flex items-center gap-3 text-sm font-medium transition-colors", formData.name.length > 10 ? "text-green-600" : "text-gray-400")}>
                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border", formData.name.length > 10 ? "bg-green-100 border-green-200 text-green-600" : "border-gray-200 bg-gray-50")}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                        Detailed product name
                                    </li>
                                    <li className={cn("flex items-center gap-3 text-sm font-medium transition-colors", parseInt(formData.stock) > 0 || getTotalVariantStock() > 0 ? "text-green-600" : "text-gray-400")}>
                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border", parseInt(formData.stock) > 0 || getTotalVariantStock() > 0 ? "bg-green-100 border-green-200 text-green-600" : "border-gray-200 bg-gray-50")}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                        Set stock quantity
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Form Panel */}
                    <div className="lg:col-span-2">
                        <form
                            onSubmit={handleSubmit}
                            className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 space-y-8 border border-gray-100"
                        >
                            {/* Tab Navigation */}
                            <div className="bg-gray-50 p-1.5 rounded-2xl flex gap-1">
                                {["general", "attributes"].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab as any)}
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300",
                                            activeTab === tab
                                                ? "bg-white text-[var(--brand-primary)] shadow-md shadow-orange-900/5"
                                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                        )}
                                    >
                                        {tab === "general" ? "General Information" : "Variants & Attributes"}
                                    </button>
                                ))}
                            </div>

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
                                    imageFiles={imageFiles}
                                    imageFileErrors={imageFileErrors}
                                    onFileSelect={handleFileSelect}
                                    addImageFileSlot={addImageFileSlot}
                                    removeImageFileSlot={removeImageFileSlot}
                                    setImageFileError={setImageFileError}
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
                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/seller/products")}
                                    className="flex-1 rounded-2xl h-14 border-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-600 font-bold transition-all text-base"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-2xl h-14 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] transform transition-all font-bold text-base"
                                >
                                    {isSubmitting
                                        ? "Publishing..."
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

