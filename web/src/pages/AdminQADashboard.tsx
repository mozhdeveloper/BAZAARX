import React, { useState, useEffect, useRef } from 'react';
import { handleImageError } from '@/utils/imageUtils';
import { Navigate } from 'react-router-dom';
import {
    CheckCircle,
    Clock,
    FileCheck,
    BadgeCheck,
    XCircle,
    RefreshCw,
    Search,
    Eye,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Store,
    X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { qaTeamService, type QAAssessmentItem, type QADashboardStats } from '../services/qaTeamService';
import QAForm from '../components/QAForm';

type QATab = 'digital' | 'verified' | 'revision' | 'rejected';

const AdminQADashboard = () => {
    const { isAuthenticated, user } = useAdminAuth();
    const { toast } = useToast();

    const [assessments, setAssessments] = useState<QAAssessmentItem[]>([]);
    const [stats, setStats] = useState<QADashboardStats>({
        pendingAdminReview: 0,
        pendingDigitalReview: 0,
        verified: 0,
        forRevision: 0,
        rejected: 0,
        assignedToMe: 0,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<QATab>('digital');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<QAAssessmentItem | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showQAForm, setShowQAForm] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [allAssessments, dashStats] = await Promise.all([
                qaTeamService.getAssessments(),
                qaTeamService.getDashboardStats(),
            ]);
            setAssessments(allAssessments);
            setStats(dashStats);
        } catch (error) {
            console.error('Error loading QA data:', error);
            toast({ title: 'Error', description: 'Failed to load QA data', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    const getFilteredAssessments = () => {
        let filtered = assessments;

        if (activeTab === 'digital') {
            filtered = assessments.filter(a => a.status === 'pending_digital_review');
        } else if (activeTab === 'verified') {
            filtered = assessments.filter(a => a.status === 'verified');
        } else if (activeTab === 'revision') {
            filtered = assessments.filter(a => a.status === 'for_revision');
        } else if (activeTab === 'rejected') {
            filtered = assessments.filter(a => a.status === 'rejected');
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.product?.name?.toLowerCase().includes(query) ||
                a.product?.seller?.store_name?.toLowerCase().includes(query) ||
                a.product_id.toLowerCase().includes(query)
            );
        }

        return filtered;
    };

    const filteredAssessments = getFilteredAssessments();

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: string; icon: any }> = {
            pending_digital_review: { label: 'QA Review', variant: 'bg-blue-50/95 text-blue-800 border-blue-200', icon: FileCheck },
            verified: { label: 'Verified', variant: 'bg-green-50/95 text-green-800 border-green-200', icon: BadgeCheck },
            for_revision: { label: 'Revision', variant: 'bg-orange-50/95 text-orange-800 border-orange-200', icon: RefreshCw },
            rejected: { label: 'Rejected', variant: 'bg-red-50/95 text-red-800 border-red-200', icon: XCircle },
        };
        const info = statusMap[status] || { label: status, variant: 'bg-white/90 text-gray-800 border-gray-200', icon: Clock };
        const StatusIcon = info.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm shadow-sm ${info.variant}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {info.label}
            </span>
        );
    };

    return (
        <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
            <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
            <main className="flex-1 p-6 lg:p-8 overflow-auto">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-headline)] flex items-center gap-2">
                                QA Dashboard
                            </h1>
                            <p className="text-[var(--text-muted)] mt-2 text-sm">
                                Review and ensure the quality of products before they go live.
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-center gap-3">
                            <Button
                                onClick={loadData}
                                disabled={isLoading}
                                variant="outline"
                                className="border-[var(--btn-border)] text-[var(--text-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)] hover:bg-base transition-all rounded-xl shadow-sm h-10 px-4"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh Data
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-10">
                        {[
                            { label: 'QA Review', count: stats.pendingDigitalReview, icon: FileCheck, color: 'text-blue-400 group-hover:text-blue-500' },
                            { label: 'Verified', count: stats.verified, icon: BadgeCheck, color: 'text-green-400 group-hover:text-green-500' },
                            { label: 'Revision required', count: stats.forRevision, icon: RefreshCw, color: 'text-orange-400 group-hover:text-orange-500' },
                            { label: 'Rejected', count: stats.rejected, icon: XCircle, color: 'text-red-400 group-hover:text-red-500' },
                            { label: 'Assigned to you', count: stats.assignedToMe, icon: Store, color: 'text-primary' },
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(217,119,6,0.15)] relative overflow-hidden group transition-all duration-300 border border-gray-100/50 hover:border-[var(--brand-primary)]/20"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--brand-accent-light)]/30 to-[var(--brand-primary)]/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-[var(--brand-accent-light)]/50 transition-colors" />
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className={cn("transition-all duration-300", stat.color)}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="relative z-10 flex items-center justify-between gap-4">
                                    <h3 className="text-gray-500 text-sm font-medium group-hover:text-[var(--brand-primary)] transition-colors duration-300">{stat.label}</h3>
                                    <p className="text-3xl font-black text-gray-900 font-heading group-hover:text-[var(--brand-primary)] transition-all duration-300">{stat.count}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-4">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QATab)} className="w-full lg:w-auto">
                            <TabsList className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-full h-auto">
                                {[
                                    { id: 'digital', label: 'QA Review', count: stats.pendingDigitalReview },
                                    { id: 'verified', label: 'Verified', count: stats.verified },
                                    { id: 'revision', label: 'For Revision', count: stats.forRevision },
                                    { id: 'rejected', label: 'Rejected', count: stats.rejected },
                                ].map((tab) => (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className="rounded-full px-4 text-xs transition-all data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-[var(--text-muted)] data-[state=inactive]:hover:text-[var(--brand-primary)] h-8"
                                    >
                                        {tab.label}
                                        <span className={cn("ml-1.5 text-[11px] transition-colors opacity-80", activeTab === tab.id ? "text-white" : "text-[var(--text-muted)]")}>
                                            ({tab.count})
                                        </span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <div className="relative w-full lg:w-[350px] group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[var(--brand-primary)]" />
                            <Input
                                placeholder="Search products, sellers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white rounded-xl border border-gray-200 shadow-sm focus:border-[var(--brand-primary)] placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {!isLoading && filteredAssessments.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-xl font-semibold text-gray-900 mb-1">No products found</p>
                            <p className="text-gray-500 max-w-sm mx-auto">There are currently no products in this queue. You're all caught up!</p>
                        </div>
                    )}

                    {!isLoading && filteredAssessments.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                            {filteredAssessments.map((assessment) => {
                                const product = assessment.product;
                                const primaryImage = product?.images?.find((i: any) => i.is_primary)?.image_url
                                    || product?.images?.[0]?.image_url
                                    || 'https://placehold.co/400x300?text=Product+Image';

                                return (
                                    <Card key={assessment.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 border-gray-200/60 bg-white group relative">
                                        <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={primaryImage}
                                                alt={product?.name || 'Product'}
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={handleImageError}
                                            />
                                        </div>
                                        <div className="absolute top-3 right-3 z-10">
                                            {getStatusBadge(assessment.status)}
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col">
                                            <h3 className="font-bold text-gray-900 line-clamp-1 mb-1 text-lg">{product?.name || 'Unknown Product'}</h3>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xl font-bold text-[var(--brand-primary)]">
                                                    ₱{product?.price?.toLocaleString() || '0'}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(assessment.submitted_at || assessment.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {product?.seller?.store_name && (
                                                <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-4">
                                                    <Store className="w-4 h-4 opacity-60" />
                                                    <span className="truncate">{product.seller.store_name}</span>
                                                </div>
                                            )}
                                            <div className="mt-auto pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full border-[var--(btn-border)] hover:border-gray-300 text-[var(--text-muted)] hover:text-gray-600 hover:bg-gray-50"
                                                    onClick={() => { setSelectedProduct(assessment); setShowDetailModal(true); setCurrentImageIndex(0); }}
                                                >
                                                    <Eye className="w-4 h-4 mr-1.5" /> View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    <Dialog open={showDetailModal} onOpenChange={(open) => {
                        setShowDetailModal(open);
                        if (!open) {
                            setShowQAForm(false);
                        }
                    }}>
                        <DialogContent className={cn(
                            "max-h-[95vh] p-0 flex flex-col overflow-hidden border-none shadow-2xl transition-all duration-500 ease-in-out",
                            showQAForm ? "sm:max-w-[1200px]" : "sm:max-w-[700px]"
                        )}>
                            <div className="flex h-full overflow-hidden">
                                {/* Product Details Column */}
                                <div className={cn(
                                    "flex flex-col h-[95vh] transition-all duration-500",
                                    showQAForm ? "w-1/2" : "w-full"
                                )}>
                                    <div className="sticky top-0 z-40 px-6 py-4 bg-white/95 backdrop-blur-md flex flex-col gap-1 border-b border-gray-50">
                                        <div className="flex justify-between items-start">
                                            <DialogTitle className="text-xl text-[var(--text-headline)] pr-8">{selectedProduct?.product?.name || 'Product Details'}</DialogTitle>
                                            {!showQAForm && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full absolute right-4 top-4 hover:bg-base" onClick={() => setShowDetailModal(false)}>
                                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                                                </Button>
                                            )}
                                        </div>
                                        <DialogDescription className="text-[var(--text-muted)]">Review product information, variants, and timeline history.</DialogDescription>
                                    </div>

                                    <div className="flex-1 overflow-y-auto scrollbar-hide px-10">
                                        {selectedProduct && (
                                            <div className="space-y-4 pt-4 pb-8">
                                                <div className="flex flex-col md:flex-row gap-8">
                                                    <div className="w-full md:w-1/2 relative">
                                                        <div className="absolute top-4 left-4 z-20">{getStatusBadge(selectedProduct.status)}</div>
                                                        {selectedProduct.product?.images && (
                                                            <div className="relative rounded-2xl border border-gray-100 bg-gray-50/50 p-2 shadow-sm overflow-hidden">
                                                                <div className="h-64 sm:h-80 bg-white rounded-xl overflow-hidden flex items-center justify-center">
                                                                    <img src={selectedProduct.product.images[currentImageIndex]?.image_url} alt="Product" className="h-full w-full object-contain" />
                                                                </div>
                                                                {selectedProduct.product.images.length > 1 && (
                                                                    <div className="flex justify-between items-center mt-3 px-2">
                                                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-[var(--btn-border)] text-[var(--text-muted)] hover:bg-base hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)] transition-all" onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))} disabled={currentImageIndex === 0}>
                                                                            <ChevronLeft className="w-4 h-4" />
                                                                        </Button>
                                                                        <span className="text-sm font-medium text-gray-500 font-inter">{currentImageIndex + 1} / {selectedProduct.product.images.length}</span>
                                                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-[var(--btn-border)] text-[var(--text-muted)] hover:bg-base hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)] transition-all" onClick={() => setCurrentImageIndex(Math.min(selectedProduct.product.images.length - 1, currentImageIndex + 1))} disabled={currentImageIndex === selectedProduct.product.images.length - 1}>
                                                                            <ChevronRight className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="w-full md:w-1/2 flex flex-col justify-center space-y-4 py-2">
                                                        {[
                                                            { label: 'Seller', value: selectedProduct.product?.seller?.store_name },
                                                            { label: 'Category', value: selectedProduct.product?.category?.name },
                                                            { label: 'Price', value: `₱${selectedProduct.product?.price?.toLocaleString()}`, isPrice: true }
                                                        ].map(item => (
                                                            <div key={item.label} className="space-y-0.5">
                                                                <Label className="text-[var(--text-headline)] font-bold text-lg">{item.label}</Label>
                                                                <p className={cn("text-md", item.isPrice ? "text-2xl font-bold text-[var(--brand-primary)]" : "text-[var(--text-secondary)]")}>{item.value || 'N/A'}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <hr className="my-6 border-gray-100" />
                                                <div>
                                                    <Label className="text-lg font-semibold text-gray-900 mb-3 block">Description</Label>
                                                    <p className="text-sm text-gray-600 leading-relaxed">{selectedProduct.product?.description}</p>
                                                </div>

                                                {selectedProduct.product?.variants && selectedProduct.product.variants.length > 0 && (
                                                    <>
                                                        <hr className="my-6 border-gray-100" />
                                                        <div>
                                                            <Label className="text-lg font-semibold text-gray-900 mb-3 block">Variants</Label>
                                                            <div className="grid sm:grid-cols-2 gap-2">
                                                                {selectedProduct.product.variants.map((v: any) => (
                                                                    <div key={v.id} className="flex flex-col text-sm bg-white border border-gray-100 shadow-sm rounded-lg p-3">
                                                                        <span className="font-medium text-gray-900 mb-1">{v.variant_name}</span>
                                                                        <span className="text-gray-500 flex justify-between">
                                                                            <span className="text-[var(--brand-primary)] font-medium">₱{v.price?.toLocaleString()}</span>
                                                                            <span>Stock: {v.stock}</span>
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                <hr className="my-6 border-gray-100" />
                                                <div>
                                                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
                                                        <div className="relative flex items-center justify-between md:flex-row-reverse group is-active mb-4">
                                                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-primary shadow shrink-0 md:order-1 text-white/0"></div>
                                                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="font-semibold text-sm text-gray-900">Submitted</div>
                                                                    <div className="text-xs text-gray-500">{new Date(selectedProduct.submitted_at || selectedProduct.created_at).toLocaleString()}</div>
                                                                </div>
                                                            </div>
                                                            <div className="hidden md:block w-[calc(50%-1.5rem)] md:order-2">
                                                                <Label className="text-lg font-semibold text-gray-900 mb-0">Timeline</Label>
                                                            </div>
                                                        </div>

                                                        {selectedProduct.admin_accepted_at && (
                                                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-white/0"></div>
                                                                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="font-semibold text-sm text-gray-900">Admin Accepted</div>
                                                                        <div className="text-xs text-gray-500">{new Date(selectedProduct.admin_accepted_at).toLocaleString()}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedProduct.revision_requested_at && (
                                                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-orange-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-white/0"></div>
                                                                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-orange-500">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="font-semibold text-sm text-gray-900">Revision Requested</div>
                                                                        <div className="text-xs text-gray-500">{new Date(selectedProduct.revision_requested_at).toLocaleString()}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedProduct.verified_at && (
                                                            <div className="relative flex items-center justify-between md:justify-normal md:flex-row-reverse group is-active">
                                                                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-green-500 shadow shrink-0 md:order-1 md:-translate-x-1/2 text-white/0"></div>
                                                                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="font-semibold text-sm text-gray-900">QA Verified</div>
                                                                        <div className="text-xs text-gray-500">{new Date(selectedProduct.verified_at).toLocaleString()}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!showQAForm && (
                                        <div className="sticky bottom-0 z-30 px-6 py-4 bg-gray-50/95 backdrop-blur-md border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                                            {selectedProduct?.status === 'pending_digital_review' && (
                                                <Button className="bg-base text-gray-600 hover:text-[var(--brand-accent)] hover:bg-base" onClick={() => setShowQAForm(true)}>
                                                    Assess Product<ChevronRight className='h-4 w-4 ml-1 -mr-2'></ChevronRight>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* QA Form Column */}
                                {showQAForm && selectedProduct && (
                                    <QAForm
                                        selectedProduct={selectedProduct}
                                        onCloseForm={() => setShowQAForm(false)}
                                        onCloseModal={() => setShowDetailModal(false)}
                                        onSubmitSuccess={async () => {
                                            await loadData();
                                            setShowDetailModal(false);
                                        }}
                                    />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Removed unused modals */}
                </div>
            </main>
        </div>
    );
};

export default AdminQADashboard;
