/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Camera,
  CheckCircle,
  AlertTriangle,
  Package,
  RotateCcw,
  X,
  ShieldCheck,
  Zap,
  Clock,
  Truck,
  Info,
} from "lucide-react";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import { useBuyerStore } from "../stores/buyerStore";
import { useCartStore } from "../stores/cartStore";
import { orderReadService } from "../services/orders/orderReadService";
import {
  returnService,
  ReturnReason,
  ReturnType,
  ReturnItem,
  EVIDENCE_REQUIRED_REASONS,
  computeResolutionPath,
} from "../services/returnService";
import { useToast } from "../hooks/use-toast";

// ---------------------------------------------------------------------------
// Reason options
// ---------------------------------------------------------------------------
const REASON_OPTIONS: { value: ReturnReason; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "damaged", label: "Item Arrived Damaged", description: "Package or product was damaged during delivery", icon: <AlertTriangle className="w-5 h-5" /> },
  { value: "wrong_item", label: "Wrong Item Received", description: "I received a different product than what I ordered", icon: <Package className="w-5 h-5" /> },
  { value: "not_as_described", label: "Not As Described", description: "Product doesn't match the listing details or photos", icon: <Info className="w-5 h-5" /> },
  { value: "defective", label: "Defective / Not Working", description: "Product is faulty or doesn't function properly", icon: <AlertTriangle className="w-5 h-5" /> },
  { value: "missing_parts", label: "Missing Parts / Accessories", description: "Some items or accessories are missing from the package", icon: <Package className="w-5 h-5" /> },
  { value: "changed_mind", label: "Changed My Mind", description: "I no longer want this product", icon: <RotateCcw className="w-5 h-5" /> },
  { value: "duplicate_order", label: "Duplicate Order", description: "I accidentally ordered this twice", icon: <Package className="w-5 h-5" /> },
  { value: "other", label: "Other Reason", description: "Another issue not listed above", icon: <Info className="w-5 h-5" /> },
];

// ---------------------------------------------------------------------------
// Return type options (Lazada PH standard: 2 options only)
// ---------------------------------------------------------------------------
const RETURN_TYPE_OPTIONS: {
  value: ReturnType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  { value: "return_refund", label: "Return & Refund", description: "Return the item and get a full refund to your original payment method", icon: <RotateCcw className="w-5 h-5" /> },
  { value: "replacement", label: "Return & Replace", description: "Return the item and receive a brand new replacement at no cost", icon: <Package className="w-5 h-5" /> },
];

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------
type Step = "reason" | "type" | "items" | "evidence" | "review";
const STEPS: Step[] = ["reason", "type", "items", "evidence", "review"];
const STEP_LABELS: Record<Step, string> = {
  reason: "Select Reason",
  type: "Preferred Solution",
  items: "Select Items",
  evidence: "Upload Evidence",
  review: "Review & Submit",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BuyerReturnRequestPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useBuyerStore();
  const { updateOrderWithReturnRequest } = useCartStore();

  // Order data
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithinWindow, setIsWithinWindow] = useState(true);
  const [existingReturn, setExistingReturn] = useState(false);

  // Form state
  const [currentStep, setCurrentStep] = useState<Step>("reason");
  const [selectedReason, setSelectedReason] = useState<ReturnReason | null>(null);
  const [selectedType, setSelectedType] = useState<ReturnType | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; reason?: string }>>(new Map());
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Load order
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      setIsLoading(true);
      try {
        const detail = await orderReadService.getOrderDetail({
          orderIdOrNumber: orderId,
          buyerId: profile?.id,
        });
        if (!detail) {
          toast({ title: "Order not found", description: "Cannot find this order.", variant: "destructive" });
          navigate("/orders");
          return;
        }
        setOrder(detail);

        // Check return window
        const withinWindow = await returnService.isWithinReturnWindow(detail.order?.dbId || detail.order?.id);
        setIsWithinWindow(withinWindow);

        // Check for existing return
        const existing = await returnService.getReturnForOrder(detail.order?.dbId || detail.order?.id);
        if (existing) setExistingReturn(true);
      } catch (err) {
        console.error("Error loading order:", err);
        toast({ title: "Error", description: "Failed to load order details.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadOrder();
  }, [orderId, profile?.id, navigate, toast]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedImageIndex(null); // Close modal when navigating steps
  }, [currentStep]);

  // Derived
  const orderData = order?.order;
  const items: any[] = orderData?.items || [];
  const orderDbId = orderData?.dbId || orderData?.id || "";
  const orderStatus = orderData?.status || "";
  const isEligible =
    (orderStatus === "delivered" || orderStatus === "received") && isWithinWindow && !existingReturn;

  const needsEvidence = selectedReason ? EVIDENCE_REQUIRED_REASONS.includes(selectedReason) : false;

  const selectedItemsTotal = Array.from(selectedItems.entries()).reduce((sum, [itemId, sel]) => {
    const item = items.find((i: any) => (i.productId || i.id) === itemId);
    return sum + (item ? Number(item.price || 0) * sel.quantity : 0);
  }, 0);

  const isReplacement = selectedType === "replacement";

  // Resolution path preview
  const resolutionPath = selectedReason
    ? computeResolutionPath(selectedReason, selectedItemsTotal, evidenceFiles.length > 0)
    : null;

  // Stepper
  const currentStepIndex = STEPS.indexOf(currentStep);

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case "reason":
        return !!selectedReason;
      case "type":
        return !!selectedType;
      case "items":
        return selectedItems.size > 0;
      case "evidence":
        return !needsEvidence || evidenceFiles.length > 0;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

  // Evidence handling
  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - evidenceFiles.length);
    setEvidenceFiles((prev) => [...prev, ...newFiles]);

    // Create previews
    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle item selection
  const toggleItem = useCallback(
    (itemId: string, maxQty: number) => {
      setSelectedItems((prev) => {
        const next = new Map(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.set(itemId, { quantity: maxQty });
        }
        return next;
      });
    },
    []
  );

  // Submit
  const handleSubmit = async () => {
    if (!selectedReason || !selectedType || selectedItems.size === 0) return;
    setIsSubmitting(true);

    try {
      // Upload evidence if any
      let evidenceUrls: string[] = [];
      if (evidenceFiles.length > 0) {
        evidenceUrls = await returnService.uploadEvidence(orderDbId, evidenceFiles);
      }

      // Map selected items
      const returnItems: ReturnItem[] = Array.from(selectedItems.entries()).map(([itemId, sel]) => {
        const item = items.find((i: any) => (i.productId || i.id) === itemId);
        return {
          productId: itemId,
          productName: item?.name || "Unknown",
          quantity: sel.quantity,
          price: Number(item?.price || 0),
          image: item?.image || null,
          reason: sel.reason,
        };
      });

      await returnService.submitReturnRequest({
        orderDbId,
        reason: selectedReason,
        returnType: selectedType as ReturnType,
        description,
        refundAmount: isReplacement ? 0 : selectedItemsTotal,
        items: returnItems,
        evidenceUrls,
      });

      // Optimistically update the order in the Zustand store so it immediately
      // appears under the Return/Refund tab without waiting for a re-fetch.
      if (orderId) {
        updateOrderWithReturnRequest(orderId, {
          reason: selectedReason,
          solution: selectedType ?? "return_refund",
          comments: description,
          files: evidenceFiles,
          refundAmount: isReplacement ? 0 : selectedItemsTotal,
          submittedAt: new Date(),
          status: resolutionPath === "instant" ? "refunded" : "seller_review",
        });
      }

      toast({
        title: "Return Request Submitted!",
        description:
          resolutionPath === "instant"
            ? "Your refund has been auto-approved and will be processed shortly."
            : "Your request has been submitted. The seller has 48 hours to respond.",
      });
      // Navigate to My Orders → Return/Refund tab so the user sees the change immediately
      navigate("/orders?status=returned");
    } catch (error: any) {
      console.error("Submit return error:", error);
      toast({
        title: "Failed to Submit",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--brand-wash)]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-primary)]" />
        </div>
      </div>
    );
  }

  if (!isEligible) {
    return (
      <div className="min-h-screen bg-[var(--brand-wash)]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Return Not Available</h2>
              <p className="text-gray-500 mb-6">
                {existingReturn
                  ? "A return request already exists for this order."
                  : !isWithinWindow
                    ? "The 7-day return window has expired for this order."
                    : "This order is not eligible for return at this time."}
              </p>
              <Button onClick={() => navigate(-1)} variant="outline">
                <ChevronLeft
                  size={20}
                  className="group-hover:-translate-x-0.5 transition-transform"
                />
                <span className="text-sm font-medium">Back to Order</span>
              </Button>
            </CardContent>
          </Card>
        </div>
        <BazaarFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 pb-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
        >
          <ChevronLeft
            size={20}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span className="text-sm font-medium">Go Back</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-1">Request Return / Refund</h1>
        <p className="text-sm text-gray-500 mb-6">
          Order #{orderData?.orderNumber || orderId} &middot; Follow the steps below
        </p>

        {/* Main Layout: Vertical Steps on Left + Content on Right */}
        <div className="flex gap-8">
          {/* Step Progress - Vertical Sidebar */}
          <div className="w-37 flex-shrink-0 flex flex-col pt-12">
            <div className="flex flex-col gap-6 justify-center">
              {STEPS.map((step, i) => (
                <div key={step} className="relative">
                  {/* Step Box */}
                  <button
                    onClick={() => {
                      if (i <= currentStepIndex) setCurrentStep(step);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-all text-left",
                      i < currentStepIndex
                        ? "bg-green-50 border-green-300 hover:border-green-400"
                        : i === currentStepIndex
                          ? "bg-orange-50 border-[var(--brand-primary)] shadow-sm"
                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {/* Step Icon/Number Circle */}
                    <div className={cn(
                      "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                      i < currentStepIndex
                        ? "bg-green-500 text-white"
                        : i === currentStepIndex
                          ? "bg-[var(--brand-primary)] text-white shadow-md"
                          : "bg-gray-300 text-white"
                    )}>
                      {i < currentStepIndex ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    
                    {/* Step Label */}
                    <p className={cn(
                      "text-xs font-semibold line-clamp-2 leading-tight",
                      i === currentStepIndex ? "text-gray-900" : "text-gray-600"
                    )}>
                      {STEP_LABELS[step]}
                    </p>
                  </button>
                  
                  {/* Vertical Connector to Next Step */}
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      "absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-12",
                      i < currentStepIndex ? "bg-green-300" : "bg-gray-300"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content - Right Side */}
          <div className="flex-1">

        {/* Step Content */}
        <Card className="shadow-sm border-orange-100/50">
          <CardContent className="p-5">
            {/* STEP 1: Reason */}
            {currentStep === "reason" && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 mb-1">What went wrong?</h2>
                <p className="text-xs text-gray-500 mb-4">Select the reason for your return or refund request.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REASON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedReason(opt.value)}
                      className={cn(
                        "relative flex gap-2.5 p-3 rounded-lg border-2 transition-all text-left items-center",
                        selectedReason === opt.value
                          ? "border-[var(--brand-primary)] bg-orange-50/50 shadow-sm pr-8"
                          : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center",
                        selectedReason === opt.value ? "bg-[var(--brand-primary)] text-white" : "bg-gray-100 text-gray-500"
                      )}>
                        {opt.icon}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{opt.description}</p>
                      </div>
                      {selectedReason === opt.value && (
                        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '20px', height: '100%' }}>
                          <CheckCircle className="w-4 h-4 text-[var(--brand-primary)]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Return Type */}
            {currentStep === "type" && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Preferred Solution</h2>
                <p className="text-xs text-gray-500 mb-4">How would you like this resolved?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {RETURN_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedType(opt.value)}
                      className={cn(
                        "relative flex gap-2.5 p-3 rounded-lg border-2 transition-all text-left items-center",
                        selectedType === opt.value
                          ? "border-[var(--brand-primary)] bg-orange-50/50 shadow-sm pr-8"
                          : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center",
                        selectedType === opt.value ? "bg-[var(--brand-primary)] text-white" : "bg-gray-100 text-gray-500"
                      )}>
                        {opt.icon}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                          {(opt as any).badge && (
                            <Badge className="bg-green-100 text-green-700 border-none text-[8px] px-1 py-0">
                              {(opt as any).badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 break-words whitespace-normal">{opt.description}</p>
                      </div>
                      {selectedType === opt.value && (
                        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '20px', height: '100%' }}>
                          <CheckCircle className="w-4 h-4 text-[var(--brand-primary)]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Resolution path hint */}
                {resolutionPath && (
                  <div className={cn(
                    "mt-2 p-2 rounded-lg border flex items-start gap-2",
                    resolutionPath === "instant"
                      ? "bg-green-50 border-green-200"
                      : resolutionPath === "seller_review"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-amber-50 border-amber-200"
                  )}>
                    {resolutionPath === "instant" ? (
                      <Zap className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : resolutionPath === "seller_review" ? (
                      <Clock className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className={cn(
                        "text-[15px] font-semibold",
                        resolutionPath === "instant" ? "text-green-700" : resolutionPath === "seller_review" ? "text-blue-700" : "text-amber-700"
                      )}>
                        {resolutionPath === "instant"
                          ? "Instant Refund"
                          : resolutionPath === "seller_review"
                            ? "Seller Review (48h)"
                            : "Return Required"}
                      </p>
                      <p className={cn(
                        "text-[12px] mt-0.5",
                        resolutionPath === "instant" ? "text-green-600" : resolutionPath === "seller_review" ? "text-blue-600" : "text-amber-600"
                      )}>
                        {resolutionPath === "instant"
                          ? "Refund processed automatically."
                          : resolutionPath === "seller_review"
                            ? "Seller has 48h to respond, auto-escalates if no response."
                            : "Ship item back before refund."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Select Items */}
            {currentStep === "items" && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Which items are affected?</h2>
                <p className="text-xs text-gray-500 mb-4">Select the items you want to return or get a refund for.</p>
                <div className="grid gap-2.5">
                  {items.map((item: any) => {
                    const itemId = item.productId || item.id;
                    const isSelected = selectedItems.has(itemId);
                    return (
                      <button
                        key={itemId}
                        onClick={() => toggleItem(itemId, item.quantity || 1)}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "border-[var(--brand-primary)] bg-orange-50/50"
                            : "border-gray-100 hover:border-orange-200"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <img loading="lazy" 
                            src={item.image || "/placeholder.png"}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm break-words line-clamp-2">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity || 1}</p>
                          <p className="text-xs font-semibold text-[var(--brand-primary)]">
                            ₱{Number(item.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedItems.size > 0 && (
                  <div className="mt-3 p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-xs font-semibold text-gray-700">
                      {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""} selected
                      {!isReplacement && (
                        <> &middot; Refund: <span className="text-[var(--brand-primary)]">₱{selectedItemsTotal.toLocaleString()}</span></>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Evidence */}
            {currentStep === "evidence" && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Upload Evidence</h2>
                <p className="text-xs text-gray-500 mb-3">
                  {needsEvidence
                    ? "Photos are required for your selected reason. Please upload clear images showing the issue."
                    : "Photos are optional but help speed up the process."}
                </p>

                {/* Upload area */}
                <label
                  className={cn(
                    "block w-full border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
                    evidenceFiles.length >= 5
                      ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                      : "border-orange-200 hover:border-[var(--brand-primary)] hover:bg-orange-50/30"
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEvidenceUpload}
                    className="hidden"
                    disabled={evidenceFiles.length >= 5}
                  />
                  <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-gray-700">
                    {evidenceFiles.length >= 5 ? "Maximum 5 photos reached" : "Click to upload photos"}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Up to 5 photos &middot; JPG, PNG</p>
                </label>

                {/* Previews */}
                {evidencePreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {evidencePreviews.map((preview, i) => (
                      <div key={i} className="relative group">
                        <button
                          onClick={() => setSelectedImageIndex(i)}
                          className="w-full cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <img loading="lazy" 
                            src={preview}
                            alt={`Evidence ${i + 1}`}
                            className="w-full aspect-square rounded-lg object-cover border border-gray-200"
                          />
                        </button>
                        <button
                          onClick={() => removeEvidence(i)}
                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image Modal - Show on evidence and review steps */}
                {selectedImageIndex !== null && (currentStep === "evidence" || currentStep === "review") && (
                  <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedImageIndex(null)}
                  >
                    <div 
                      className="relative bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={evidencePreviews[selectedImageIndex]}
                        alt={`Evidence ${selectedImageIndex + 1}`}
                        className="w-full h-auto max-h-[75vh] object-contain"
                      />
                      <button
                        onClick={() => setSelectedImageIndex(null)}
                        className="absolute top-4 right-4 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-700" />
                      </button>
                      <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
                        {selectedImageIndex + 1} of {evidencePreviews.length}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Additional Details (optional)
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* STEP 5: Review */}
            {currentStep === "review" && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Review Your Request</h2>
                <p className="text-xs text-gray-500 mb-4">Please confirm the details below before submitting.</p>

                {/* Summary cards */}
                <div className="grid gap-2">
                  {/* Reason */}
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Reason</p>
                    <p className="text-xs font-medium text-gray-900">
                      {REASON_OPTIONS.find((r) => r.value === selectedReason)?.label || selectedReason}
                    </p>
                  </div>

                  {/* Resolution type */}
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Preferred Solution</p>
                    <p className="text-xs font-medium text-gray-900">
                      {RETURN_TYPE_OPTIONS.find((t) => t.value === selectedType)?.label || selectedType}
                    </p>
                  </div>

                  {/* Items */}
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Items ({selectedItems.size})</p>
                    {Array.from(selectedItems.entries()).map(([itemId, sel]) => {
                      const item = items.find((i: any) => (i.productId || i.id) === itemId);
                      return (
                        <div key={itemId} className="flex items-center gap-2 py-0.5">
                          <img loading="lazy" 
                            src={item?.image || "/placeholder.png"}
                            alt={item?.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 truncate">{item?.name}</p>
                            <p className="text-[10px] text-gray-500">Qty: {sel.quantity}</p>
                          </div>
                          <p className="text-xs font-semibold text-gray-900">
                            ₱{(Number(item?.price || 0) * sel.quantity).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Refund amount — only for Return & Refund, not Replacement */}
                  {!isReplacement ? (
                    <div className="p-3 rounded-lg border bg-orange-50 border-orange-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-700">Refund Amount</p>
                        <p className="text-sm font-bold text-[var(--brand-primary)]">
                          ₱{selectedItemsTotal.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-800">Replacement Item</p>
                          <p className="text-[10px] text-blue-600 mt-0.5">
                            The seller will ship a brand new replacement once approved.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Evidence */}
                  {evidencePreviews.length > 0 && (
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 mb-3">Evidence ({evidencePreviews.length} photos)</p>
                      <div className="flex gap-3 overflow-x-auto">
                        {evidencePreviews.map((p, i) => (
                          <button key={i} onClick={() => setSelectedImageIndex(i)} className="relative group flex-shrink-0 hover:scale-105 transition-transform">
                            <img loading="lazy" src={p} alt={`Evidence ${i + 1}`} className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 group-hover:border-[var(--brand-primary)] shadow-md" />
                            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-5 h-5 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Click any photo to view full size</p>
                    </div>
                  )}

                  {/* Description */}
                  {description && (
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-0.5">Additional Details</p>
                      <p className="text-xs text-gray-700">{description}</p>
                    </div>
                  )}

                  {/* Resolution path */}
                  {resolutionPath && (
                    <div className={cn(
                      "p-2 rounded-lg border flex items-start gap-2",
                      resolutionPath === "instant"
                        ? "bg-green-50 border-green-200"
                        : resolutionPath === "seller_review"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-amber-50 border-amber-200"
                    )}>
                      <ShieldCheck className={cn(
                        "w-4 h-4 mt-0.5 flex-shrink-0",
                        resolutionPath === "instant" ? "text-green-600" : resolutionPath === "seller_review" ? "text-blue-600" : "text-amber-600"
                      )} />
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          {resolutionPath === "instant"
                            ? "Instant Refund"
                            : resolutionPath === "seller_review"
                              ? "Seller Review (48h)"
                              : "Return Required"}
                        </p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          {resolutionPath === "instant"
                            ? "Your refund will be processed immediately."
                            : resolutionPath === "seller_review"
                              ? "Seller has 48 hours to respond. Auto-escalates if no response."
                              : "You'll receive a return label to ship back the item."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Modal - Show on evidence and review steps */}
        {selectedImageIndex !== null && (currentStep === "evidence" || currentStep === "review") && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImageIndex(null)}
          >
            <div 
              className="relative bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={evidencePreviews[selectedImageIndex]}
                alt={`Evidence ${selectedImageIndex + 1}`}
                className="w-full h-auto max-h-[75vh] object-contain"
              />
              <button
                onClick={() => setSelectedImageIndex(null)}
                className="absolute top-4 right-4 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
                {selectedImageIndex + 1} of {evidencePreviews.length}
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-3 gap-2">
          <Button
            variant="outline"
            onClick={currentStepIndex === 0 ? () => navigate(-1) : goBack}
            className="px-3 text-[11px]"
            size="sm"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform"/>
            {currentStepIndex === 0 ? "Cancel" : "Back"}
          </Button>

          {currentStep === "review" ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 text-[11px] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-md"
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white mr-1.5" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-2.5 h-2.5 mr-1" />
                  Submit Report
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className="px-5 text-[11px] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-md disabled:opacity-50"
              size="sm"
            >
              Continue
            </Button>
          )}
        </div>
          </div>
        </div>
      </div>
      <BazaarFooter />
    </div>
  );
}
