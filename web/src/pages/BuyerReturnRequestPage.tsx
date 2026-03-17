/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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

      toast({
        title: "Return Request Submitted!",
        description:
          resolutionPath === "instant"
            ? "Your refund has been auto-approved and will be processed shortly."
            : "Your request has been submitted. The seller has 48 hours to respond.",
      });
      navigate("/returns");
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
              <Button onClick={() => navigate(`/order/${orderId}`)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Order
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
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* Back button */}
        <button
          onClick={() => navigate(`/order/${orderId}`)}
          className="flex items-center text-sm text-gray-500 hover:text-[var(--brand-primary)] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Order #{orderData?.orderNumber || orderId}
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Request Return / Refund</h1>
        <p className="text-sm text-gray-500 mb-6">
          Order #{orderData?.orderNumber || orderId} &middot; Follow the steps below
        </p>

        {/* Step Progress */}
        <div className="flex items-center mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => {
                  if (i <= currentStepIndex) setCurrentStep(step);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  i < currentStepIndex
                    ? "bg-green-100 text-green-700"
                    : i === currentStepIndex
                      ? "bg-[var(--brand-primary)] text-white shadow-md"
                      : "bg-gray-100 text-gray-400"
                )}
              >
                {i < currentStepIndex ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                )}
                {STEP_LABELS[step]}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("w-6 h-0.5 mx-1", i < currentStepIndex ? "bg-green-300" : "bg-gray-200")} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="shadow-sm border-orange-100/50">
          <CardContent className="p-6">
            {/* STEP 1: Reason */}
            {currentStep === "reason" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">What went wrong?</h2>
                <p className="text-sm text-gray-500 mb-4">Select the reason for your return or refund request.</p>
                <div className="grid gap-3">
                  {REASON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedReason(opt.value)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        selectedReason === opt.value
                          ? "border-[var(--brand-primary)] bg-orange-50/50 shadow-sm"
                          : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 p-2 rounded-lg",
                        selectedReason === opt.value ? "bg-[var(--brand-primary)] text-white" : "bg-gray-100 text-gray-500"
                      )}>
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                      </div>
                      {selectedReason === opt.value && (
                        <CheckCircle className="w-5 h-5 text-[var(--brand-primary)] mt-1 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Return Type */}
            {currentStep === "type" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Preferred Solution</h2>
                <p className="text-sm text-gray-500 mb-4">How would you like this resolved?</p>
                <div className="grid gap-3">
                  {RETURN_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedType(opt.value)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left relative",
                        selectedType === opt.value
                          ? "border-[var(--brand-primary)] bg-orange-50/50 shadow-sm"
                          : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 p-2 rounded-lg",
                        selectedType === opt.value ? "bg-[var(--brand-primary)] text-white" : "bg-gray-100 text-gray-500"
                      )}>
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{opt.label}</p>
                          {(opt as any).badge && (
                            <Badge className="bg-green-100 text-green-700 border-none text-[10px] px-1.5 py-0.5">
                              {(opt as any).badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                      </div>
                      {selectedType === opt.value && (
                        <CheckCircle className="w-5 h-5 text-[var(--brand-primary)] mt-1 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Resolution path hint */}
                {resolutionPath && (
                  <div className={cn(
                    "mt-4 p-3 rounded-lg border flex items-start gap-3",
                    resolutionPath === "instant"
                      ? "bg-green-50 border-green-200"
                      : resolutionPath === "seller_review"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-amber-50 border-amber-200"
                  )}>
                    {resolutionPath === "instant" ? (
                      <Zap className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : resolutionPath === "seller_review" ? (
                      <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Truck className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className={cn(
                        "text-xs font-semibold",
                        resolutionPath === "instant" ? "text-green-700" : resolutionPath === "seller_review" ? "text-blue-700" : "text-amber-700"
                      )}>
                        {resolutionPath === "instant"
                          ? "Instant Refund"
                          : resolutionPath === "seller_review"
                            ? "Seller Review (48h)"
                            : "Return Required"}
                      </p>
                      <p className={cn(
                        "text-[11px] mt-0.5",
                        resolutionPath === "instant" ? "text-green-600" : resolutionPath === "seller_review" ? "text-blue-600" : "text-amber-600"
                      )}>
                        {resolutionPath === "instant"
                          ? "Your refund will be processed automatically."
                          : resolutionPath === "seller_review"
                            ? "Seller has 48 hours to respond. If no response, it auto-escalates to admin."
                            : "You'll need to ship the item back before the refund is processed."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Select Items */}
            {currentStep === "items" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Which items are affected?</h2>
                <p className="text-sm text-gray-500 mb-4">Select the items you want to return or get a refund for.</p>
                <div className="grid gap-3">
                  {items.map((item: any) => {
                    const itemId = item.productId || item.id;
                    const isSelected = selectedItems.has(itemId);
                    return (
                      <button
                        key={itemId}
                        onClick={() => toggleItem(itemId, item.quantity || 1)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                          isSelected
                            ? "border-[var(--brand-primary)] bg-orange-50/50"
                            : "border-gray-100 hover:border-orange-200"
                        )}
                      >
                        <div className="relative">
                          <img
                            src={item.image || "/placeholder.png"}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                          <p className="text-sm font-semibold text-[var(--brand-primary)]">
                            ₱{Number(item.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedItems.size > 0 && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-sm font-medium text-gray-700">
                      {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""} selected
                      {!isReplacement && (
                        <> &middot; Refund: <span className="text-[var(--brand-primary)] font-bold">₱{selectedItemsTotal.toLocaleString()}</span></>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Evidence */}
            {currentStep === "evidence" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload Evidence</h2>
                <p className="text-sm text-gray-500">
                  {needsEvidence
                    ? "Photos are required for your selected reason. Please upload clear images showing the issue."
                    : "Photos are optional but help speed up the process."}
                </p>

                {/* Upload area */}
                <label
                  className={cn(
                    "block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
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
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {evidenceFiles.length >= 5 ? "Maximum 5 photos reached" : "Click to upload photos"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Up to 5 photos &middot; JPG, PNG</p>
                </label>

                {/* Previews */}
                {evidencePreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {evidencePreviews.map((preview, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={preview}
                          alt={`Evidence ${i + 1}`}
                          className="w-full aspect-square rounded-lg object-cover border border-gray-200"
                        />
                        <button
                          onClick={() => removeEvidence(i)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Additional Details (optional)
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 5: Review */}
            {currentStep === "review" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Review Your Request</h2>
                <p className="text-sm text-gray-500 mb-4">Please confirm the details below before submitting.</p>

                {/* Summary cards */}
                <div className="grid gap-3">
                  {/* Reason */}
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Reason</p>
                    <p className="text-sm font-medium text-gray-900">
                      {REASON_OPTIONS.find((r) => r.value === selectedReason)?.label || selectedReason}
                    </p>
                  </div>

                  {/* Resolution type */}
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Preferred Solution</p>
                    <p className="text-sm font-medium text-gray-900">
                      {RETURN_TYPE_OPTIONS.find((t) => t.value === selectedType)?.label || selectedType}
                    </p>
                  </div>

                  {/* Items */}
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Items ({selectedItems.size})</p>
                    {Array.from(selectedItems.entries()).map(([itemId, sel]) => {
                      const item = items.find((i: any) => (i.productId || i.id) === itemId);
                      return (
                        <div key={itemId} className="flex items-center gap-3 py-1">
                          <img
                            src={item?.image || "/placeholder.png"}
                            alt={item?.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{item?.name}</p>
                            <p className="text-xs text-gray-500">Qty: {sel.quantity}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            ₱{(Number(item?.price || 0) * sel.quantity).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Refund amount — only for Return & Refund, not Replacement */}
                  {!isReplacement ? (
                    <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Refund Amount</p>
                        <p className="text-lg font-bold text-[var(--brand-primary)]">
                          ₱{selectedItemsTotal.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-blue-800">Replacement Item</p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            The seller will ship a brand new replacement once the return is approved. No cash refund will be issued.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Evidence */}
                  {evidencePreviews.length > 0 && (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Evidence ({evidencePreviews.length} photos)</p>
                      <div className="flex gap-2 overflow-x-auto">
                        {evidencePreviews.map((p, i) => (
                          <img key={i} src={p} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {description && (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-0.5">Additional Details</p>
                      <p className="text-sm text-gray-700">{description}</p>
                    </div>
                  )}

                  {/* Resolution path */}
                  {resolutionPath && (
                    <div className={cn(
                      "p-3 rounded-lg border flex items-start gap-3",
                      resolutionPath === "instant"
                        ? "bg-green-50 border-green-200"
                        : resolutionPath === "seller_review"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-amber-50 border-amber-200"
                    )}>
                      <ShieldCheck className={cn(
                        "w-5 h-5 mt-0.5 flex-shrink-0",
                        resolutionPath === "instant" ? "text-green-600" : resolutionPath === "seller_review" ? "text-blue-600" : "text-amber-600"
                      )} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {resolutionPath === "instant"
                            ? "Instant Refund — Your refund will be processed immediately."
                            : resolutionPath === "seller_review"
                              ? "Seller Review — The seller has 48 hours to respond. Auto-escalates to admin if no response."
                              : "Return Required — You'll receive a return label to ship the item back."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={currentStepIndex === 0 ? () => navigate(`/order/${orderId}`) : goBack}
            className="px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStepIndex === 0 ? "Cancel" : "Back"}
          </Button>

          {currentStep === "review" ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className="px-8 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-md disabled:opacity-50"
            >
              Continue
            </Button>
          )}
        </div>
      </div>
      <BazaarFooter />
    </div>
  );
}
