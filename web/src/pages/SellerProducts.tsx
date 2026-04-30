import { BulkProductData, BulkUploadModal } from "@/components/BulkUploadModal";
import { AttributesTab } from "@/components/seller/products/AttributesTab";
import { GeneralInfoTab } from "@/components/seller/products/GeneralInfoTab";
import { ProductFormTabs } from "@/components/seller/products/ProductFormTabs";
import { WarrantyTab } from "@/components/seller/products/WarrantyTab";
import { SampleQAResultModal } from "@/components/seller/SampleQAResultModal";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { categoryService } from "@/services/categoryService";
import { featuredProductService } from "@/services/featuredProductService";
import { productService } from "@/services/productService";
import {
    useAuthStore,
    useProductStore
} from "@/stores/sellerStore";
import { compressImage, uploadProductImages, validateImageFile } from "@/utils/storage";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowLeft,
    BadgeCheck,
    Ban,
    Check,
    Clock,
    Package,
    Plus,
    Search,
    ShieldCheck,
    Star,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Upload,
    Zap
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export function SellerProducts() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    const { seller, logout } = useAuthStore();
    const { products, updateProduct, deleteProduct, bulkAddProducts } =
        useProductStore();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { fetchProducts } = useProductStore();
    const [featuredProductIds, setFeaturedProductIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (seller?.id) {
            fetchProducts({ sellerId: seller.id });
            // Load featured products for this seller
            featuredProductService.getSellerFeaturedProducts(seller.id).then(fps => {
                setFeaturedProductIds(new Set(fps.filter(fp => fp.is_active).map(fp => fp.product_id)));
            });
        }
    }, [seller?.id, fetchProducts]);

    const handleToggleFeature = useCallback(async (productId: string) => {
        if (!seller?.id) return;
        const isFeatured = featuredProductIds.has(productId);
        try {
            if (isFeatured) {
                const ok = await featuredProductService.unfeatureProduct(productId, seller.id);
                if (ok) {
                    setFeaturedProductIds(prev => { const next = new Set(prev); next.delete(productId); return next; });
                    toast({ title: 'Removed from Featured', description: 'Product is no longer featured.' });
                } else {
                    toast({ title: 'Error', description: 'Failed to remove product from featured.', variant: 'destructive' });
                }
            } else {
                if (featuredProductIds.size >= 6) {
                    toast({ title: 'Limit Reached', description: 'You can feature up to 6 products. Remove one first.', variant: 'destructive' });
                    return;
                }
                const ok = await featuredProductService.featureProduct(productId, seller.id);
                if (ok) {
                    setFeaturedProductIds(prev => new Set(prev).add(productId));
                    toast({ title: 'Product Featured!', description: 'Product will appear in Featured Products section.' });
                } else {
                    toast({ title: 'Error', description: 'Failed to feature product. Max 6 products allowed.', variant: 'destructive' });
                }
            }
        } catch {
            toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
        }
    }, [seller?.id, featuredProductIds, toast]);



    // Memoized filtered products to avoid recomputing on every render
    const filteredProducts = useMemo(() => products.filter((product) => {
        // 1. Check if the product belongs to the currently logged-in seller
        const matchesSeller = product.sellerId === seller?.id;

        // 2. Existing search logic
        const matchesSearch = product.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        // 3. Status filter logic
        // "active" = approved + isActive + has stock
        // "inactive" = explicitly disabled (isActive false), but not draft/pending
        // "pending" = awaiting approval
        // "draft" = saved as draft
        // "out_of_stock" = approved + active but 0 stock
        const matchesFilter =
            filterStatus === "all" ||
            (filterStatus === "active" && product.isActive && product.approvalStatus === "approved") ||
            (filterStatus === "inactive" && !product.isActive && product.approvalStatus !== "pending" && product.approvalStatus !== "draft") ||
            (filterStatus === "pending" && product.approvalStatus === "pending") ||
            (filterStatus === "draft" && product.approvalStatus === "draft") ||
            (filterStatus === "out_of_stock" && product.stock === 0 && product.approvalStatus !== "draft" && product.approvalStatus !== "pending");

        // Only return true if it belongs to the seller AND matches search/filters
        return matchesSeller && matchesSearch && matchesFilter;
    }), [products, searchQuery, filterStatus, seller?.id]);

    const handleToggleStatus = useCallback(async (id: string, currentStatus: boolean) => {
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
    }, [updateProduct, toast]);

    const handleDeleteClick = useCallback((id: string) => {
        setProductToDelete(id);
        setIsDeleteDialogOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
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
    }, [productToDelete, deleteProduct, toast]);


    const handleBulkUpload = useCallback(async (products: BulkProductData[]) => {
        try {
            await bulkAddProducts(products);

            toast({
                title: "Bulk Upload Successful",
                description: `${products.length} rows processed. Check your inventory for updates.`,
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
    }, [bulkAddProducts, toast]);

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
                                        <SelectItem value="inactive" className="text-xs">Disabled</SelectItem>
                                        <SelectItem value="pending" className="text-xs">Pending Approval</SelectItem>
                                        <SelectItem value="draft" className="text-xs">Drafts</SelectItem>
                                        <SelectItem value="out_of_stock" className="text-xs">Out of Stock</SelectItem>
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
                                            <img loading="lazy"
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
                                            {product.approvalStatus === "draft" && (
                                                <div className="absolute top-2 left-2 z-20">
                                                    <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-500/90 backdrop-blur-sm text-white">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        <span className="text-[10px] font-bold tracking-wide">Draft</span>
                                                    </div>
                                                </div>
                                            )}
                                            {!product.isActive && product.approvalStatus !== "pending" && product.approvalStatus !== "draft" && (
                                                <div className="absolute top-2 left-2 z-20">
                                                    <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-600/90 backdrop-blur-sm text-white">
                                                        <Ban className="w-3 h-3 mr-1" />
                                                        <span className="text-[10px] font-bold tracking-wide">Disabled</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Warranty badge - top right */}
                                            {product.hasWarranty && (
                                                <div className="absolute top-2 right-2 z-20">
                                                    <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-orange-500/90 backdrop-blur-sm text-white">
                                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                                        <span className="text-[10px] font-bold tracking-wide">
                                                            {product.warrantyDurationMonths ? `${product.warrantyDurationMonths}mo` : 'Warranty'}
                                                        </span>
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
                                                        <span className={cn("text-[12px] font-sm", product.stock === 0 ? "text-red-500 font-bold" : "text-gray-500")}>Stock</span>
                                                        <span className={cn("text-[12px] font-sm", product.stock === 0 ? "text-red-500 font-bold" : "text-gray-500")}>
                                                            {product.stock === 0 ? "Out of Stock" : product.stock}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() =>
                                                            navigate(`/seller/products/edit/${product.id}`)
                                                        }
                                                        className="w-full h-10 px-4 flex items-center justify-center bg-orange-50 text-[var(--secondary-foreground)] rounded-xl hover:bg-[var(--brand-primary)] hover:text-white transition-all text-sm font-bold hover:shadow-lg hover:shadow-orange-500/20 active:scale-95"
                                                    >
                                                        Edit Product
                                                    </button>
                                                    <div className="flex gap-8 justify-center">
                                                        {/* Active/Inactive toggle */}
                                                        {product.approvalStatus !== 'pending' && product.approvalStatus !== 'draft' && (
                                                            <button
                                                                onClick={() => handleToggleStatus(product.id, product.isActive)}
                                                                title={product.isActive ? "Disable product" : "Enable product"}
                                                                className={cn(
                                                                    "h-9 w-9 flex items-center justify-center rounded-xl transition-all active:scale-95",
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
                                                        {/* Feature / Unfeature */}
                                                        {product.approvalStatus === 'approved' && (
                                                            <button
                                                                onClick={() => handleToggleFeature(product.id)}
                                                                title={featuredProductIds.has(product.id) ? 'Remove from Featured' : 'Feature Product'}
                                                                className={cn(
                                                                    "h-9 w-9 flex items-center justify-center rounded-xl transition-all active:scale-95",
                                                                    featuredProductIds.has(product.id)
                                                                        ? "text-amber-500 bg-amber-50 hover:text-amber-700"
                                                                        : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
                                                                )}
                                                            >
                                                                <Star className={cn("h-4 w-4", featuredProductIds.has(product.id) && "fill-amber-500")} />
                                                            </button>
                                                        )}
                                                        {/* Add to Flash Sale — hidden for drafts and pending */}
                                                        {product.approvalStatus !== 'draft' && product.approvalStatus !== 'pending' && (
                                                            <button
                                                                onClick={() =>
                                                                    navigate(`/seller/discounts?flash_product=${product.id}&flash_product_name=${encodeURIComponent(product.name)}&flash_product_price=${product.price}`)
                                                                }
                                                                title="Add to Flash Sale"
                                                                className="h-9 w-9 flex items-center justify-center text-orange-500 rounded-xl hover:text-orange-700 hover:bg-orange-50 transition-all active:scale-95"
                                                            >
                                                                <Zap className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteClick(product.id)
                                                            }
                                                            className="h-9 w-9 flex items-center justify-center text-red-500 rounded-xl hover:text-red-700 transition-all active:scale-95"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
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
    const { id: editProductId } = useParams<{ id: string }>();
    const isEditMode = !!editProductId;
    const { addProduct, updateProduct, products } = useProductStore();
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
        file?: File | null;
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
        sizesValues: [] as string[],
    });
    const [variationInput, setVariationInput] = useState("");
    const [colorInput, setColorInput] = useState("");
    const [sizeInput, setSizeInput] = useState("");
    const [sizeGuideImage, setSizeGuideImage] = useState<File | null>(null);
    const [sizeGuideImageUrl, setSizeGuideImageUrl] = useState("");

    // Warranty state
    const [warrantyData, setWarrantyData] = useState({
        hasWarranty: false,
        warrantyType: "local_manufacturer",
        warrantyDurationMonths: "",
        warrantyProviderName: "",
        warrantyProviderContact: "",
        warrantyProviderEmail: "",
        warrantyTermsUrl: "",
        warrantyPolicy: "",
    });

    // Custom attribute names state
    const [firstAttributeName, setFirstAttributeName] = useState("Sizes");
    const [secondAttributeName, setSecondAttributeName] = useState("Colors");
    const [editingFirstAttributeName, setEditingFirstAttributeName] =
        useState(false);
    const [editingSecondAttributeName, setEditingSecondAttributeName] =
        useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [qaResultOpen, setQaResultOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"general" | "attributes" | "warranty">(
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
                // Use the new CategoryService to fetch ONLY active categories
                const dbCategories = await categoryService.getActiveCategories();

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

    // BX-03-002: Prefill form state when editing an existing product
    const [editPrefilled, setEditPrefilled] = useState(false);
    useEffect(() => {
        if (!isEditMode || !editProductId || editPrefilled) return;
        const product = products.find(p => p.id === editProductId);
        if (!product) {
            toast({ title: "Product not found", description: "The product you're trying to edit doesn't exist.", variant: "destructive" });
            navigate("/seller/products");
            return;
        }

        // Prefill form data
        setFormData({
            name: product.name || "",
            description: (product as any).description || "",
            price: product.price?.toString() || "",
            originalPrice: (product as any).originalPrice?.toString() || "",
            stock: product.stock?.toString() || "",
            category: product.category || "",
            images: product.images?.length ? [...product.images] : [""],
            variantLabel1Values: [],
            variantLabel2Values: [],
            sizesValues: [],
        });

        // Prefill warranty
        setWarrantyData({
            hasWarranty: product.hasWarranty || false,
            warrantyType: product.warrantyType || "local_manufacturer",
            warrantyDurationMonths: product.warrantyDurationMonths?.toString() || "",
            warrantyProviderName: product.warrantyProviderName || "",
            warrantyProviderContact: product.warrantyProviderContact || "",
            warrantyProviderEmail: product.warrantyProviderEmail || "",
            warrantyTermsUrl: product.warrantyTermsUrl || "",
            warrantyPolicy: product.warrantyPolicy || "",
        });

        // Prefill variants
        if (product.variants?.length) {
            setVariantConfigs(product.variants.map(v => ({
                id: v.id,
                variantLabel1Value: v.variantLabel1Value || "",
                variantLabel2Value: v.variantLabel2Value || "",
                stock: v.stock || 0,
                price: v.price || 0,
                sku: v.sku || "",
                image: v.image || "",
            })));
        }

        // Prefill variant attribute tag values from product data
        // This ensures the Cartesian product useEffect doesn't wipe existing variants
        if (product.variantLabel1Values?.length) {
            setFormData(prev => ({ ...prev, variantLabel1Values: [...product.variantLabel1Values!] }));
        } else if (product.variants?.length) {
            // Derive from variants if not stored at product level
            const uniqueV1 = Array.from(new Set(
                product.variants.map(v => v.variantLabel1Value).filter(Boolean) as string[]
            ));
            if (uniqueV1.length > 0) {
                setFormData(prev => ({ ...prev, variantLabel1Values: uniqueV1 }));
            }
        }
        if (product.variantLabel2Values?.length) {
            setFormData(prev => ({ ...prev, variantLabel2Values: [...product.variantLabel2Values!] }));
        } else if (product.variants?.length) {
            const uniqueV2 = Array.from(new Set(
                product.variants.map(v => v.variantLabel2Value).filter(Boolean) as string[]
            ));
            if (uniqueV2.length > 0) {
                setFormData(prev => ({ ...prev, variantLabel2Values: uniqueV2 }));
            }
        }

        // Prefill attribute names
        if (product.variantLabel1) setFirstAttributeName(product.variantLabel1);
        if (product.variantLabel2) setSecondAttributeName(product.variantLabel2);

        setEditPrefilled(true);
    }, [isEditMode, editProductId, products, editPrefilled]);

    useEffect(() => {
        const v1 = formData.variantLabel1Values;
        const v2 = formData.variantLabel2Values;
        const basePrice = parseInt(formData.price) || 0;
        const baseName = formData.name || "ITEM";

        // If the user hasn't added any variation tags yet, we don't auto-generate.
        if (v1.length === 0 && v2.length === 0) {
            // Optional: If you want to wipe variants when all tags are removed,
            // uncomment the line below:
            // setVariantConfigs([]);
            return;
        }

        setVariantConfigs((prevConfigs) => {
            const newConfigs: VariantConfig[] = [];

            // 1. Map out the ideal Cartesian product matrix
            const combos: { val1: string; val2: string }[] = [];
            if (v1.length > 0 && v2.length > 0) {
                v1.forEach((val1) => {
                    v2.forEach((val2) => {
                        combos.push({ val1, val2 });
                    });
                });
            } else if (v1.length > 0) {
                v1.forEach((val1) => combos.push({ val1, val2: "" }));
            } else if (v2.length > 0) {
                v2.forEach((val2) => combos.push({ val1: "", val2 }));
            }

            // 2. Diff against existing configs (Smart Merge)
            let hasChanges = false;

            combos.forEach(({ val1, val2 }) => {
                const existing = prevConfigs.find(
                    (c) => c.variantLabel1Value === val1 && c.variantLabel2Value === val2
                );

                if (existing) {
                    // Match found: Preserve the seller's custom stock, price, etc.
                    newConfigs.push(existing);
                } else {
                    // No match found: Generate a fresh combination
                    hasChanges = true;
                    newConfigs.push({
                        id: generateVariantId(),
                        variantLabel1Value: val1,
                        variantLabel2Value: val2,
                        stock: 0, // Default new variants to 0 stock
                        price: basePrice, // Inherit base price
                        sku: `${baseName.substring(0, 3).toUpperCase()}-${val1 || "DEF"}-${val2 || "DEF"}`.replace(/\s+/g, "-"),
                        image: "",
                    });
                }
            });

            // 3. Detect orphans (tags the user deleted)
            if (prevConfigs.length !== newConfigs.length) {
                hasChanges = true;
            }

            // Only trigger a state update if the matrix actually changed
            return hasChanges ? newConfigs : prevConfigs;
        });
    }, [formData.variantLabel1Values, formData.variantLabel2Values]);

    useEffect(() => {
        if (variantConfigs.length > 0) {
            const minPrice = Math.min(...variantConfigs.map(v => v.price));
            if (minPrice !== Infinity && minPrice.toString() !== formData.price) {
                setFormData(prev => ({
                    ...prev,
                    price: minPrice.toString()
                }));
            }
        }
    }, [variantConfigs]);

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
            const variantToDelete = prev.find((v) => v.id === id);
            const updated = prev.filter((v) => v.id !== id);

            // Also remove orphaned tag values so the Cartesian useEffect
            // doesn't immediately re-create the deleted variant
            if (variantToDelete) {
                const remainingV1Values = new Set(updated.map(v => v.variantLabel1Value).filter(Boolean));
                const remainingV2Values = new Set(updated.map(v => v.variantLabel2Value).filter(Boolean));

                setFormData(prevForm => ({
                    ...prevForm,
                    variantLabel1Values: prevForm.variantLabel1Values.filter(v => remainingV1Values.has(v)),
                    variantLabel2Values: prevForm.variantLabel2Values.filter(v => remainingV2Values.has(v)),
                }));
            }

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

    const addSize = () => {
        const trimmed = sizeInput.trim();
        if (trimmed && !formData.sizesValues.includes(trimmed)) {
            setFormData((prev) => ({
                ...prev,
                sizesValues: [...prev.sizesValues, trimmed],
            }));
            setSizeInput("");
        }
    };

    const removeSize = (size: string) => {
        setFormData((prev) => ({
            ...prev,
            sizesValues: prev.sizesValues.filter((s) => s !== size),
        }));
    };

    const handleSizeGuideImageSelect = async (file: File | null) => {
        if (!file) {
            setSizeGuideImage(null);
            setSizeGuideImageUrl("");
            return;
        }
        const validation = validateImageFile(file);
        if (!validation.valid) {
            setErrors((prev) => ({
                ...prev,
                sizeGuide: validation.error ?? "Invalid file",
            }));
            return;
        }
        const compressed = await compressImage(file);
        setSizeGuideImage(compressed);
        setSizeGuideImageUrl(URL.createObjectURL(compressed));
        setErrors((prev) => ({ ...prev, sizeGuide: "" }));
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

    // Warranty change handler
    const handleWarrantyChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setWarrantyData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Product name is required";
        }
        if (!formData.description.trim()) {
            newErrors.description = "Description is required";
        }
        const priceStr = String(formData.price ?? "").trim();
        if (!priceStr) {
            newErrors.price = "Display price is required";
        } else if (parseInt(priceStr) <= 0) {
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
            // Variant images are optional (will fallback to product image if empty)
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

        // Warranty validation
        if (warrantyData.hasWarranty) {
            if (!warrantyData.warrantyType) {
                newErrors.warrantyType = "Please select a warranty type";
            }
            if (!warrantyData.warrantyDurationMonths || parseInt(warrantyData.warrantyDurationMonths) <= 0) {
                newErrors.warrantyDurationMonths = "Warranty duration must be greater than 0";
            }
            if (!warrantyData.warrantyProviderName?.trim()) {
                newErrors.warrantyProviderName = "Warranty provider name is required";
            }
            if (warrantyData.warrantyProviderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(warrantyData.warrantyProviderEmail)) {
                newErrors.warrantyProviderEmail = "Please enter a valid email address";
            }
            if (warrantyData.warrantyTermsUrl && !/^https?:\/\/.+$/.test(warrantyData.warrantyTermsUrl)) {
                newErrors.warrantyTermsUrl = "Please enter a valid URL";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault();

        if (!validateForm()) {
            toast({
                title: "Validation Error",
                description: "Please check all tabs for missing or incorrect information.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const baseStock = parseInt(formData.stock) || 0;

            // 1. Prepare Variant Data & Handle Image Uploads
            const updatedVariants = await Promise.all(
                variantConfigs.map(async (variant) => {
                    // If there's a local file, upload it first
                    if (variant.file && seller?.id) {
                        try {
                            const [uploadedUrl] = await uploadProductImages(
                                [variant.file],
                                seller.id,
                                `variant-${variant.id}`
                            );
                            return { ...variant, image: uploadedUrl, file: undefined };
                        } catch (error) {
                            console.error(`Failed to upload image for variant ${variant.id}:`, error);
                            return { ...variant, file: undefined }; // Fallback to no image
                        }
                    }
                    // If no new file, just return the variant as is (preserving existing URL if any)
                    const { file, ...rest } = variant;
                    return rest;
                })
            );

            const customVariantStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
            const totalStock = baseStock + customVariantStock;

            // 2. Handle Base Variant logic
            const baseVariant =
                updatedVariants.length > 0 && baseStock > 0
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
                updatedVariants.length > 0
                    ? [...(baseVariant ? [baseVariant] : []), ...updatedVariants]
                    : undefined;

            const hasVariantAxis1 =
                formData.variantLabel1Values.length > 0 ||
                updatedVariants.some((variant) =>
                    !!String(variant.variantLabel1Value || '').trim()
                );

            const hasVariantAxis2 =
                formData.variantLabel2Values.length > 0 ||
                updatedVariants.some((variant) =>
                    !!String(variant.variantLabel2Value || '').trim()
                );

            const resolvedVariantLabel1 = hasVariantAxis1
                ? (firstAttributeName?.trim() || 'Variations')
                : undefined;

            const resolvedVariantLabel2 = hasVariantAxis2
                ? (secondAttributeName?.trim() || 'Colors')
                : undefined;

            // 3. Upload Main Product Images (URLs + Files)
            const filesToUpload = imageFiles.filter((f): f is File => f !== null);
            let uploadedMainUrls: string[] = [];

            if (filesToUpload.length > 0 && seller?.id) {
                const tempProductId = crypto.randomUUID();
                uploadedMainUrls = await uploadProductImages(filesToUpload, seller.id, tempProductId);
            }

            const allImages = [
                ...formData.images.filter((img) => img.trim() !== ""),
                ...uploadedMainUrls,
            ];

            // 4. Upload Size Guide Image if apparel category and image selected
            let uploadedSizeGuideUrl: string | undefined = undefined;
            const isApparelCategory =
                formData.category &&
                (
                    formData.category.toLowerCase().includes('apparel') ||
                    formData.category.toLowerCase().includes('fashion') ||
                    formData.category.toLowerCase().includes('clothing')
                );
            if (isApparelCategory && sizeGuideImage && seller?.id) {
                try {
                    const [uploadedUrl] = await uploadProductImages(
                        [sizeGuideImage],
                        seller.id,
                        `size-guide-${Date.now()}`
                    );
                    uploadedSizeGuideUrl = uploadedUrl;
                } catch (error) {
                    console.error("Failed to upload size guide image:", error);
                    // Continue without size guide image
                }
            }

            // 5. Assemble Final Product Payload
            const productData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                price: parseInt(formData.price),
                originalPrice: formData.originalPrice ? parseInt(formData.originalPrice) : undefined,
                stock: totalStock,
                category: formData.category,
                images: allImages,
                variantLabel1Values: formData.variantLabel1Values,
                variantLabel2Values: formData.variantLabel2Values,
                sizesValues: isApparelCategory ? formData.sizesValues : undefined,
                sizeGuideImage: uploadedSizeGuideUrl,
                isActive: !isDraftMode,
                sellerId: seller?.id || "",
                variantLabel1: resolvedVariantLabel1,
                variantLabel2: resolvedVariantLabel2,
                variants: variantsForSubmit,
                isDraft: isDraftMode,
                // Warranty information (only included if enabled)
                ...(warrantyData.hasWarranty && {
                    hasWarranty: true,
                    warrantyType: warrantyData.warrantyType,
                    warrantyDurationMonths: warrantyData.warrantyDurationMonths ? parseInt(warrantyData.warrantyDurationMonths) : undefined,
                    warrantyProviderName: warrantyData.warrantyProviderName || null,
                    warrantyProviderContact: warrantyData.warrantyProviderContact || null,
                    warrantyProviderEmail: warrantyData.warrantyProviderEmail || null,
                    warrantyTermsUrl: warrantyData.warrantyTermsUrl || null,
                    warrantyPolicy: warrantyData.warrantyPolicy || null,
                }),
            };

            if (isEditMode && editProductId) {
                // ====== EDIT FLOW ======
                // Resolve category name to category_id for DB update
                const categoryId = await productService.getOrCreateCategoryByName(productData.category);

                // Update product fields
                const { data: updatedProduct, error: updateError } = await supabase
                    .from('products')
                    .update({
                        name: productData.name,
                        description: productData.description,
                        price: productData.price,
                        ...(categoryId ? { category_id: categoryId } : {}),
                        variant_label_1: productData.variantLabel1,
                        variant_label_2: productData.variantLabel2,
                        // Warranty
                        has_warranty: warrantyData.hasWarranty,
                        warranty_type: warrantyData.hasWarranty ? (warrantyData.warrantyType as any) : null,
                        warranty_duration_months: (warrantyData.hasWarranty && warrantyData.warrantyDurationMonths) ? parseInt(warrantyData.warrantyDurationMonths) : null,
                        warranty_provider_name: warrantyData.hasWarranty ? warrantyData.warrantyProviderName || null : null,
                        warranty_provider_contact: warrantyData.hasWarranty ? warrantyData.warrantyProviderContact || null : null,
                        warranty_provider_email: warrantyData.hasWarranty ? warrantyData.warrantyProviderEmail || null : null,
                        warranty_terms_url: warrantyData.hasWarranty ? warrantyData.warrantyTermsUrl || null : null,
                        warranty_policy: warrantyData.hasWarranty ? warrantyData.warrantyPolicy || null : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editProductId)
                    .select()
                    .single();

                if (updateError) {
                    console.error("Supabase Product Update Error:", updateError);
                    throw updateError;
                }

                // ====== VARIANT PERSISTENCE (EDIT MODE) ======
                // 1. Fetch current variants in DB to handle deletions
                const { data: existingVariants } = await supabase
                    .from('product_variants')
                    .select('id')
                    .eq('product_id', editProductId);
                
                const existingIds = existingVariants?.map(v => v.id) || [];
                const currentIds = updatedVariants.map(v => v.id).filter(id => !id.startsWith('var-'));
                const idsToDelete = existingIds.filter(id => !currentIds.includes(id));

                // 2. Delete variants that were removed in UI
                if (idsToDelete.length > 0) {
                    await supabase.from('product_variants').delete().in('id', idsToDelete);
                }

                // 3. Update existing and Insert new variants (Parallelized for speed)
                await Promise.all(updatedVariants.map(async (variant) => {
                    const variantName = [variant.variantLabel1Value, variant.variantLabel2Value]
                        .filter(Boolean)
                        .join(" / ") || "Default";

                    const variantData = {
                        variant_name: variantName,
                        option_1_value: variant.variantLabel1Value || null,
                        option_2_value: variant.variantLabel2Value || null,
                        stock: variant.stock || 0,
                        price: variant.price || 0,
                        sku: variant.sku || "",
                        thumbnail_url: variant.image || null,
                    };

                    if (variant.id.startsWith('var-')) {
                        return supabase.from('product_variants').insert({
                            ...variantData,
                            product_id: editProductId
                        });
                    } else {
                        return productService.updateVariant(variant.id, variantData);
                    }
                }));

                // If the product has no custom variants but we have a base variant to update
                if (variantConfigs.length === 0 || (variantConfigs.length === 1 && variantConfigs[0].variantLabel1Value === "" && variantConfigs[0].variantLabel2Value === "")) {
                    const { data: variants } = await supabase
                        .from('product_variants')
                        .select('id')
                        .eq('product_id', editProductId)
                        .limit(1);
                    
                    if (variants && variants.length > 0) {
                        await productService.updateVariant(variants[0].id, {
                            stock: productData.stock,
                            price: productData.price,
                        });
                    }
                }

                // Image sync: delete existing → re-add (do this BEFORE local store update)
                try {
                    await productService.deleteProductImages(editProductId);
                    if (allImages.length > 0) {
                        await productService.addProductImages(editProductId,
                            allImages.map((url, idx) => ({
                                product_id: editProductId,
                                image_url: url,
                                alt_text: "",
                                sort_order: idx,
                                is_primary: idx === 0,
                            }))
                        );
                    }
                } catch (imgErr) {
                    console.warn('Image update partially failed:', imgErr);
                }

                // BX-OPTIMIZATION: Update local store so UI reflects changes instantly
                // Use set() directly to avoid a redundant DB round-trip via updateProduct
                const { products } = useProductStore.getState();
                const existingProduct = products.find(p => p.id === editProductId);
                if (existingProduct) {
                    const updatedLocal = {
                        ...existingProduct,
                        ...productData,
                        images: allImages,
                        category: productData.category,
                        variants: updatedVariants.map(v => ({
                            id: v.id,
                            variantLabel1Value: v.variantLabel1Value,
                            variantLabel2Value: v.variantLabel2Value,
                            price: v.price,
                            stock: v.stock,
                            image: v.image,
                            sku: v.sku
                        })),
                        updatedAt: new Date().toISOString(),
                    };
                    useProductStore.setState(state => ({
                        products: state.products.map(p => p.id === editProductId ? updatedLocal : p),
                    }));
                }

                // Force a fresh re-fetch from DB so the product list and shop pages
                // pick up the updated images, category, and variants from the joined tables
                if (seller?.id) {
                    useProductStore.getState().fetchProducts({ sellerId: seller.id });
                }


                toast({
                    title: "Product Updated",
                    description: `${formData.name} has been updated successfully.`,
                });
            } else {
                // ====== CREATE FLOW (existing) ======
                await addProduct(productData);
                toast({
                    title: isDraftMode ? "Draft Saved" : "Product Added",
                    description: isDraftMode
                        ? `${formData.name} has been saved as a draft.`
                        : `${formData.name} has been successfully submitted for review.`,
                });
            }

            navigate("/seller/products");
        } catch (error) {
            console.error(isEditMode ? "Failed to update product:" : "Failed to add product:", error);
            toast({
                title: "Error",
                description: isEditMode
                    ? "Failed to update product. Please try again."
                    : "Failed to add product. Please check your connection and try again.",
                variant: "destructive",
            });
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
                                {isEditMode ? "Editing" : "New Listing"}
                            </div>
                            <h1 className="text-3xl font-black text-[var(--text-headline)] mt-2 font-heading tracking-tight">
                                {isEditMode ? "Edit Product" : "Add New Product"}
                            </h1>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">
                                {isEditMode ? "Update your product details." : "Create a compelling product listing to attract buyers."}
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
                                            <img loading="lazy"
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
                                            {variantConfigs.length > 1 &&
                                                Math.min(...variantConfigs.map(v => v.price)) !== Math.max(...variantConfigs.map(v => v.price))
                                                ? `₱${Math.min(...variantConfigs.map(v => v.price)).toLocaleString()} - ₱${Math.max(...variantConfigs.map(v => v.price)).toLocaleString()}`
                                                : `₱${parseInt(formData.price || "0").toLocaleString()}`
                                            }
                                        </span>
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

                                {/* QA Result button — only in edit mode */}
                                {isEditMode && (
                                    <div className="mt-5 pt-4 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setQaResultOpen(true)}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 px-4 transition-all active:scale-[0.98]"
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                            View QA Result
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SAMPLE QA RESULT — Modal (delete when real QA component is ready) */}
                    {isEditMode && (
                        <SampleQAResultModal
                            open={qaResultOpen}
                            onOpenChange={setQaResultOpen}
                            productName={formData.name}
                            sellerName={seller?.storeName || seller?.name}
                        />
                    )}

                    {/* Form Panel */}
                    <div className="lg:col-span-2">
                        <form
                            onSubmit={handleSubmit}
                            className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 space-y-8 border border-gray-100"
                        >
                            {/* Tab Navigation */}
                            <ProductFormTabs activeTab={activeTab} setActiveTab={setActiveTab} />

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
                                    hideCategory={false}
                                    reorderImages={(fromIndex, toIndex) => {
                                        setFormData(prev => {
                                            const newImages = [...prev.images];
                                            const [moved] = newImages.splice(fromIndex, 1);
                                            newImages.splice(toIndex, 0, moved);
                                            return { ...prev, images: newImages };
                                        });
                                    }}
                                    reorderImageFile={(fromIndex, toIndex) => {
                                        setImageFiles(prev => {
                                            const newFiles = [...prev];
                                            const [moved] = newFiles.splice(fromIndex, 1);
                                            newFiles.splice(toIndex, 0, moved);
                                            return newFiles;
                                        });
                                        setImageFileErrors(prev => {
                                            const newErrors = [...prev];
                                            const [moved] = newErrors.splice(fromIndex, 1);
                                            newErrors.splice(toIndex, 0, moved);
                                            return newErrors;
                                        });
                                    }}
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
                                    sizeInput={sizeInput}
                                    setSizeInput={setSizeInput}
                                    addVariation={addVariation}
                                    removeVariation={removeVariation}
                                    addColor={addColor}
                                    removeColor={removeColor}
                                    addSize={addSize}
                                    removeSize={removeSize}
                                    sizeGuideImageUrl={sizeGuideImageUrl}
                                    onSizeGuideImageSelect={handleSizeGuideImageSelect}
                                    errors={errors}
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

                            {/* Warranty Tab */}
                            {activeTab === "warranty" && (
                                <WarrantyTab
                                    formData={warrantyData}
                                    errors={errors}
                                    handleChange={handleWarrantyChange}
                                    setFormData={setWarrantyData}
                                />
                            )}

                            {/* Submit Buttons */}
                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/seller/products")}
                                    className="flex-1 rounded-2xl h-14 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all font-bold text-base"
                                >
                                    Cancel
                                </Button>
                                {!isEditMode && (
                                    <Button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            setIsDraftMode(true);
                                            // Trigger form submit after state update
                                            setTimeout(() => {
                                                const form = document.querySelector('form');
                                                form?.requestSubmit();
                                            }, 0);
                                        }}
                                        className="rounded-2xl h-14 px-6 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:scale-[1.02] transform transition-all font-bold text-base"
                                    >
                                        {isSubmitting && isDraftMode ? "Saving Draft..." : "Save as Draft"}
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    onClick={() => setIsDraftMode(false)}
                                    className={cn(
                                        "flex-1 rounded-2xl h-14 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] transform transition-all font-bold text-base",
                                        isSubmitting && "opacity-80 cursor-not-allowed"
                                    )}
                                >
                                    {isSubmitting && !isDraftMode ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            {isEditMode ? "Saving Changes..." : "Publishing..."}
                                        </div>
                                    ) : (
                                        isEditMode ? "Save Changes" : "Publish Product"
                                    )}
                                </Button>
                            </div>


                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

