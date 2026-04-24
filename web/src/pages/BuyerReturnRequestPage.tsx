/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Video,
  CheckCircle,
  AlertTriangle,
  Package,
  RotateCcw,
  X,
  ShieldCheck,
  Zap,
  Clock,
  Truck,
  ChevronDown,
  ChevronUp,
  Info,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { cn } from "@/lib/utils";
import { useBuyerStore } from "../stores/buyerStore";
import { useCartStore } from "../stores/cartStore";
import { orderReadService } from "../services/orders/orderReadService";
import {
  returnService,
  ReturnReason,
  ReturnType,
  ReturnItem,
  computeResolutionPath,
  getEvidenceRequirements,
  getAllowedResolutions,
  getReturnWindowDeadline,
} from "../services/returnService";
import { useToast } from "../hooks/use-toast";

// ---------------------------------------------------------------------------
// Top-level reason groups (3 cards matching mobile)
// ---------------------------------------------------------------------------
type TopLevelReason = "damaged" | "wrong_item" | "item_not_received" | "";

const TOP_LEVEL_REASONS: { value: TopLevelReason; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "damaged", label: "Item Arrived Damaged", description: "Package or product was damaged during delivery", icon: <AlertTriangle className="w-5 h-5" /> },
  { value: "wrong_item", label: "Wrong Item Received", description: "I received a different product than what I ordered", icon: <Package className="w-5 h-5" /> },
  { value: "item_not_received", label: "Item Not Received", description: "I didn't receive my order or items are missing", icon: <RotateCcw className="w-5 h-5" /> },
];

const ITEM_NOT_RECEIVED_SUB_REASONS: { value: ReturnReason; label: string; description: string }[] = [
  { value: "did_not_receive_empty", label: "Empty Parcel", description: "Package arrived but was empty" },
  { value: "did_not_receive_not_delivered", label: "Order Not Delivered", description: "I never received any package" },
  { value: "did_not_receive_missing_items", label: "Some Items Missing", description: "Package arrived but some items were not included" },
];

// ---------------------------------------------------------------------------
// Resolution type options (all 4 types; filtered dynamically per reason)
// ---------------------------------------------------------------------------
const RETURN_TYPE_META: Record<ReturnType, { label: string; description: string; icon: React.ReactNode }> = {
  return_refund: { label: "Return & Refund", description: "Return the item and get a full refund to your original payment method", icon: <RotateCcw className="w-5 h-5" /> },
  refund_only: { label: "Refund Only", description: "Receive a refund without returning the item", icon: <Zap className="w-5 h-5" /> },
  partial_refund: { label: "Partial Refund", description: "Refund only for the missing items selected", icon: <Zap className="w-5 h-5" /> },
  replacement: { label: "Return & Replace", description: "Return the item and receive a brand new replacement at no cost", icon: <Package className="w-5 h-5" /> },
};

// ---------------------------------------------------------------------------
// Evidence descriptions per reason (matching mobile)
// ---------------------------------------------------------------------------
const EVIDENCE_DESCRIPTIONS: Partial<Record<ReturnReason, string>> = {
  damaged: "Upload photos and/or a video showing the damage to the item",
  wrong_item: "Upload photos and/or a video showing the incorrect item received",
  did_not_receive_empty: "Upload photos and/or an unboxing video showing the empty parcel",
  did_not_receive_missing_items: "Upload photos and/or a video showing the incomplete contents",
};

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------
type Step = "reason" | "evidence" | "type" | "method" | "review";
const STEPS: Step[] = ["reason", "evidence", "type", "method", "review"];
const STEP_LABELS: Record<Step, string> = {
  reason: "Reason for Return",
  evidence: "Details & Evidence",
  type: "Preferred Resolution",
  method: "Return Method",
  review: "Order Summary",
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
  // Reason
  const [topLevelReason, setTopLevelReason] = useState<TopLevelReason>("");
  const [subReason, setSubReason] = useState<ReturnReason | "">("");
  const [selectedType, setSelectedType] = useState<ReturnType | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; reason?: string }>>(new Map());
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // Return method
  const [returnMethod, setReturnMethod] = useState<"pickup" | "self_ship" | "">("");
  // Deadline banner
  const [returnDeadline, setReturnDeadline] = useState<Date | null>(null);
  // Seller info for self-ship
  const [sellerAddress, setSellerAddress] = useState<string>("");
  const [sellerName, setSellerName] = useState<string>("");
  const [sellerPhone, setSellerPhone] = useState<string>("");
  // Buyer info for pickup
  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerPhone, setBuyerPhone] = useState<string>("");

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

        // Extract buyer contact info from profile
        const bName = `${(profile as any)?.firstName ?? (profile as any)?.first_name ?? ""} ${(profile as any)?.lastName ?? (profile as any)?.last_name ?? ""}`.trim();
        const bPhone = (profile as any)?.phone ?? (profile as any)?.phoneNumber ?? "";
        setBuyerName(bName || "You");
        setBuyerPhone(bPhone);

        // Check return window
        const dbId = detail.order?.dbId || detail.order?.id;
        const withinWindow = await returnService.isWithinReturnWindow(dbId);
        setIsWithinWindow(withinWindow);

        // Fetch deadline date for banner
        const deadline = await getReturnWindowDeadline(dbId);
        setReturnDeadline(deadline);

        // Check for existing return
        const existing = await returnService.getReturnForOrder(dbId);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSelectedImageIndex(null);
  }, [currentStep]);

  // No auto-select — user must explicitly click items to select them

  // Fetch seller info for self-ship when entering method step
  useEffect(() => {
    if (currentStep !== "method" || sellerAddress) return;
    const sellerId = orderData?.sellerId || items?.[0]?.sellerId;
    if (!sellerId) return;
    import("@/lib/supabase").then(({ supabase }) => {
      supabase
        .from("sellers")
        .select("store_name, seller_business_profiles(address_line_1, city, province, postal_code), profiles(phone)")
        .eq("id", sellerId)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) {
            setSellerName(data.store_name || "Seller");
            const bp = Array.isArray(data.seller_business_profiles)
              ? data.seller_business_profiles[0]
              : data.seller_business_profiles;
            if (bp) setSellerAddress(`${bp.address_line_1 ?? ""}, ${bp.city ?? ""}, ${bp.province ?? ""} ${bp.postal_code ?? ""}`.trim().replace(/^,\s*/, ""));
            const ph = Array.isArray(data.profiles) ? data.profiles[0]?.phone : data.profiles?.phone;
            if (ph) setSellerPhone(ph);
          }
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Derived
  const orderData = order?.order;
  // Inject a stable per-item ID using array index as fallback — prevents collision when
  // items share productId/id of 0 or lack both fields entirely
  const items: any[] = (orderData?.items || []).map((item: any, idx: number) => ({
    ...item,
    // Always append idx so two items with the same productId/name are never the same key
    _stableId: `${item.productId || item.id || item.name || 'item'}_${idx}`,
  }));
  const getItemId = (item: any) => item._stableId || String(item.productId || item.id || item.name || "");

  const orderDbId = orderData?.dbId || orderData?.id || "";
  const orderStatus = orderData?.status || "";
  const isEligible =
    (orderStatus === "delivered" || orderStatus === "received") && isWithinWindow && !existingReturn;

  // Effective reason (top-level card → sub-reason for item_not_received)
  const effectiveReason: ReturnReason | null =
    topLevelReason === "item_not_received"
      ? (subReason || null)
      : topLevelReason
        ? (topLevelReason as ReturnReason)
        : null;

  const evidenceReqs = effectiveReason ? getEvidenceRequirements(effectiveReason) : null;
  // Filter out 'replacement' — not yet available
  const allowedResolutions = effectiveReason
    ? getAllowedResolutions(effectiveReason).filter(r => r !== "replacement")
    : [];
  const isItemSelectionStep = !!(evidenceReqs as any)?.itemSelectionRequired;

  const selectedItemsTotal = Array.from(selectedItems.entries()).reduce((sum, [itemId, sel]) => {
    const item = items.find((i: any) => getItemId(i) === itemId);
    return sum + (item ? Number(item.price || 0) * sel.quantity : 0);
  }, 0);

  const totalOrderAmount = orderData?.total ?? orderData?.totalAmount ?? 0;
  const isReplacement = selectedType === "replacement";
  const isPartialRefund = selectedType === "partial_refund";

  // Resolution path preview
  const resolutionPath = effectiveReason
    ? computeResolutionPath(effectiveReason, selectedItemsTotal, evidenceFiles.length > 0)
    : null;

  // Stepper
  const currentStepIndex = STEPS.indexOf(currentStep);

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case "reason":
        // needs top-level + sub-reason if item_not_received
        if (!topLevelReason) return false;
        if (topLevelReason === "item_not_received" && !subReason) return false;
        return true;
      case "type":
        if (!selectedType) return false;
        // Partial refund + item selection requires at least one item chosen
        if (selectedType === "partial_refund" && isItemSelectionStep && selectedItems.size === 0) return false;
        return true;
      case "method":
        return returnMethod !== "";
      case "evidence": {
        // description required
        if (!description.trim()) return false;
        // minimum 2 photos + 1 video always required
        const imageCount = evidenceFiles.filter(f => f.type.startsWith("image/")).length;
        const hasVideo = evidenceFiles.some(f => f.type.startsWith("video/"));
        if (imageCount < 2 || !hasVideo) return false;
        return true;
      }
      case "review":
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    let nextIdx = idx + 1;
    if (nextIdx < STEPS.length && STEPS[nextIdx] === "method" && selectedType !== "return_refund") nextIdx += 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(currentStep);
    let prevIdx = idx - 1;
    if (prevIdx >= 0 && STEPS[prevIdx] === "method" && selectedType !== "return_refund") prevIdx -= 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx]);
  };

  // Evidence handling
  const IMAGE_MAX = 10 * 1024 * 1024;  // 10 MB
  const VIDEO_MAX = 50 * 1024 * 1024; // 50 MB

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 6 - evidenceFiles.length;
    if (remaining <= 0) return;
    const candidates = Array.from(files).slice(0, remaining);
    const accepted: File[] = [];
    for (const file of candidates) {
      const isVideo = file.type.startsWith("video/");
      const limit = isVideo ? VIDEO_MAX : IMAGE_MAX;
      if (file.size > limit) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${isVideo ? "50 MB video" : "10 MB image"} limit and was not added.`,
          variant: "destructive",
        });
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;
    setEvidenceFiles((prev) => [...prev, ...accepted]);
    for (const file of accepted) {
      if (file.type.startsWith("video/")) {
        // createObjectURL keeps video playable; DataURL for large videos fails in browsers
        const url = URL.createObjectURL(file);
        setEvidencePreviews((prev) => [...prev, url]);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEvidencePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    }
    // reset input so same file can be re-selected after removal
    e.target.value = "";
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
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Submit
  const handleSubmit = async () => {
    if (!effectiveReason || !selectedType) return;
    if (isItemSelectionStep && selectedItems.size === 0) return;
    setIsSubmitting(true);

    try {
      // Upload evidence if any
      let evidenceUrls: string[] = [];
      if (evidenceFiles.length > 0) {
        evidenceUrls = await returnService.uploadEvidence(orderDbId, evidenceFiles);
      }

      // Map return items — for partial refund use selected subset; otherwise all order items
      const returnItems: ReturnItem[] = isItemSelectionStep
        ? Array.from(selectedItems.entries()).map(([itemId, sel]) => {
          const item = items.find((i: any) => getItemId(i) === itemId);
          return {
            productId: itemId,
            productName: item?.name || "Unknown",
            quantity: sel.quantity,
            price: Number(item?.price || 0),
            image: item?.image || null,
            reason: sel.reason,
          };
        })
        : items.map((item: any) => ({
          productId: getItemId(item),
          productName: item?.name || "Unknown",
          quantity: item?.quantity || 1,
          price: Number(item?.price || 0),
          image: item?.image || null,
        }));

      const refundAmount = isReplacement ? 0
        : isPartialRefund ? selectedItemsTotal
          : totalOrderAmount; // refund_only / return_refund → full total

      await returnService.submitReturnRequest({
        orderDbId,
        reason: effectiveReason,
        returnType: selectedType as ReturnType,
        description,
        refundAmount,
        items: returnItems,
        evidenceUrls,
      });

      // Optimistically update the order in the Zustand store
      if (orderId) {
        updateOrderWithReturnRequest(orderId, {
          reason: effectiveReason,
          solution: selectedType ?? "return_refund",
          comments: description,
          files: evidenceFiles,
          refundAmount,
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
          <span className="text-sm font-medium">Back to Order Details</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-1">Request Return / Refund</h1>
        <p className="text-sm text-gray-500 mb-6">
          Order #{orderData?.orderNumber || orderId}
          {returnDeadline && (
            <> &middot; You can request return/refund until{" "}
              <span className="font-semibold text-amber-600">
                {returnDeadline.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </>
          )}
          {!returnDeadline && <> &middot; Follow the steps below</>}
        </p>

        {/* Main Layout: Vertical Steps on Left + Content on Right */}
        <div className="flex gap-8">
          {/* Step Progress - Vertical Sidebar */}
          <div className="w-37 flex-shrink-0 flex flex-col pt-12">
            <div className="flex flex-col gap-6 justify-center">
              {STEPS.map((step, i) => {
                const isSkipped = step === "method" && selectedType !== "return_refund" && selectedType !== null;
                return (
                  <div key={step} className="relative">
                    <button
                      onClick={() => {
                        if (i <= currentStepIndex && !isSkipped) setCurrentStep(step);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-all text-left",
                        isSkipped
                          ? "bg-gray-50 border-dashed border-gray-200 opacity-40 cursor-not-allowed"
                          : i < currentStepIndex
                            ? "bg-green-50 border-green-300 hover:border-green-400"
                            : i === currentStepIndex
                              ? "bg-orange-50 border-[var(--brand-primary)] shadow-sm"
                              : "bg-gray-50 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                        isSkipped
                          ? "bg-gray-200 text-gray-400"
                          : i < currentStepIndex
                            ? "bg-green-500 text-white"
                            : i === currentStepIndex
                              ? "bg-[var(--brand-primary)] text-white shadow-md"
                              : "bg-gray-300 text-white"
                      )}>
                        {!isSkipped && i < currentStepIndex ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs font-semibold line-clamp-2 leading-tight",
                        isSkipped ? "text-gray-400" : i === currentStepIndex ? "text-gray-900" : "text-gray-600"
                      )}>
                        {STEP_LABELS[step]}
                      </p>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={cn(
                        "absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-12",
                        i < currentStepIndex ? "bg-green-300" : "bg-gray-300"
                      )} />
                    )}
                  </div>
                );
              })}
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
                    <div className="grid grid-cols-1 gap-3">
                      {TOP_LEVEL_REASONS.map((opt) => {
                        const isSelected = topLevelReason === opt.value;
                        const isItemNotReceived = opt.value === "item_not_received";
                        return (
                          <div key={opt.value}>
                            <button
                              onClick={() => {
                                setTopLevelReason(opt.value as TopLevelReason);
                                if (opt.value !== "item_not_received") setSubReason("");
                                // Reset downstream
                                setSelectedType(null);
                                setReturnMethod("");
                                setEvidenceFiles([]);
                                setEvidencePreviews([]);
                                setSelectedItems(new Map());
                              }}
                              className={cn(
                                "w-full flex gap-2.5 p-3 rounded-lg border-2 transition-all text-left items-center",
                                isSelected
                                  ? "border-[var(--brand-primary)] bg-orange-50/50 shadow-sm"
                                  : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                              )}
                            >
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center",
                                isSelected ? "bg-[var(--brand-primary)] text-white" : "bg-gray-100 text-gray-500"
                              )}>
                                {opt.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                              </div>
                              <div className="flex-shrink-0">
                                {isSelected && isItemNotReceived
                                  ? <ChevronUp className="w-4 h-4 text-[var(--brand-primary)]" />
                                  : isSelected
                                    ? <CheckCircle className="w-4 h-4 text-[var(--brand-primary)]" />
                                    : isItemNotReceived
                                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                      : null
                                }
                              </div>
                            </button>
                            {/* Sub-reasons for Item Not Received */}
                            {isSelected && isItemNotReceived && (
                              <div className="mt-2 ml-4 border-l-2 border-orange-200 pl-3 space-y-2">
                                {ITEM_NOT_RECEIVED_SUB_REASONS.map((sub) => (
                                  <button
                                    key={sub.value}
                                    onClick={() => setSubReason(sub.value)}
                                    className={cn(
                                      "w-full flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all text-left",
                                      subReason === sub.value
                                        ? "border-[var(--brand-primary)] bg-orange-50"
                                        : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900">{sub.label}</p>
                                      <p className="text-xs text-gray-500">{sub.description}</p>
                                    </div>
                                    {subReason === sub.value && (
                                      <CheckCircle className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2: Preferred Solution */}
                {currentStep === "type" && (
                  <div className="space-y-3">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">Preferred Solution</h2>
                    <p className="text-xs text-gray-500 mb-4">How would you like this resolved?</p>
                    {allowedResolutions.length === 1 && (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-800 mb-3">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>Resolution automatically determined based on your issue.</span>
                      </div>
                    )}
                    <div className={cn("grid gap-3", allowedResolutions.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
                      {allowedResolutions.map((type) => {
                        const opt = RETURN_TYPE_META[type];
                        // auto-select when only 1 option
                        if (allowedResolutions.length === 1 && selectedType !== type) {
                          setSelectedType(type);
                        }
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              setSelectedType(type);
                              // Clear item selection if switching away from partial_refund
                              if (type !== "partial_refund") setSelectedItems(new Map());
                            }}
                            className={cn(
                              "relative flex gap-2.5 p-3 rounded-lg border-2 transition-all text-left items-center",
                              selectedType === type
                                ? "border-[var(--brand-primary)] bg-orange-50/50 shadow-sm"
                                : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                            )}
                          >
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center",
                              selectedType === type ? "bg-[var(--brand-primary)] text-white" : "bg-gray-100 text-gray-500"
                            )}>
                              {opt.icon}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5 break-words whitespace-normal">{opt.description}</p>
                            </div>
                            {selectedType === type && (
                              <CheckCircle className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Select Missing Items — shown only when Partial Refund is chosen and reason requires item selection */}
                    {selectedType === "partial_refund" && isItemSelectionStep && (
                      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 mb-0.5">Select Missing Items</p>
                          <p className="text-xs text-gray-500">Choose the items that were missing from your package. Your partial refund will be based on the selected items.</p>
                        </div>
                        <div className="grid gap-2">
                          {items.map((item: any) => {
                            const itemId = getItemId(item);
                            const isSelected = selectedItems.has(itemId);
                            return (
                              <label key={itemId} className={cn("flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all cursor-pointer", isSelected ? "border-[var(--brand-primary)] bg-orange-50/50" : "border-gray-100 hover:border-orange-200")}>
                                <input type="checkbox" checked={isSelected} onChange={() => toggleItem(itemId, item.quantity || 1)} className="sr-only" />
                                <div className={cn("w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors", isSelected ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]" : "border-gray-300 bg-white")}>
                                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <img loading="lazy" src={item.image || "/placeholder.png"} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm break-words line-clamp-2">{item.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity || 1}</p>
                                  <p className="text-xs font-semibold text-[var(--brand-primary)]">&#8369;{Number(item.price || 0).toLocaleString()}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {selectedItems.size > 0 && (
                          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                            <p className="text-sm font-semibold text-gray-800">{selectedItems.size} item{selectedItems.size > 1 ? "s" : ""} selected</p>
                            <p className="text-xs text-gray-500 mt-0.5">Partial Refund: <span className="text-[var(--brand-primary)] font-bold text-sm">&#8369;{selectedItemsTotal.toLocaleString()}</span></p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Return Method */}
                {currentStep === "method" && (
                  <div className="space-y-3">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">Return Method</h2>
                    <p className="text-xs text-gray-500 mb-4">How will you return the item?</p>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Pickup */}
                      <button onClick={() => setReturnMethod("pickup")} className={cn("flex gap-3 p-4 rounded-lg border-2 transition-all text-left", returnMethod === "pickup" ? "border-[var(--brand-primary)] bg-orange-50/50 shadow-sm" : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30")}>
                        <div className={cn("w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5", returnMethod === "pickup" ? "bg-[var(--brand-primary)] text-white" : "bg-gray-100 text-gray-500")}><Truck className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 text-sm">Pickup</p><p className="text-xs text-gray-500 mt-0.5">Our courier will pick up the item from your delivery address.</p></div>
                        {returnMethod === "pickup" && <CheckCircle className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-1" />}
                      </button>
                      {returnMethod === "pickup" && (
                        <div className="rounded-xl border border-orange-100 bg-white p-4 space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Pickup Details</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" /><span className="font-medium text-gray-900">{buyerName || "—"}</span></div>
                              {buyerPhone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" /><span className="text-gray-700">{buyerPhone}</span></div>}
                            </div>
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Pickup Address</p>
                            <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" /><span className="text-gray-700">{orderData?.shippingAddress ? [orderData.shippingAddress.street, orderData.shippingAddress.city, orderData.shippingAddress.province, orderData.shippingAddress.postalCode].filter(Boolean).join(", ") : "Delivery address not available"}</span></div>
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">How Pickup Works</p>
                            {["Courier will pick up from the delivery address shown above.", "System books a courier for collection.", "Courier collects the parcel from your address.", "System tracks shipment until delivery to seller."].map((s, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 mb-2"><div className="w-5 h-5 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</div><p className="text-xs text-gray-700">{s}</p></div>
                            ))}
                          </div>
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                            <p className="text-xs font-bold text-amber-800 mb-1">Important</p>
                            <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                              <li>Pickup is subject to courier availability.</li>
                              <li>Item must be packed and ready when courier arrives.</li>
                              <li>Failed pickup attempts require rescheduling.</li>
                            </ul>
                          </div>
                        </div>
                      )}
                      {/* Self-Ship */}
                      <button onClick={() => setReturnMethod("self_ship")} className={cn("flex gap-3 p-4 rounded-lg border-2 transition-all text-left", returnMethod === "self_ship" ? "border-[var(--brand-primary)] bg-orange-50/50 shadow-sm" : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30")}>
                        <div className={cn("w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5", returnMethod === "self_ship" ? "bg-[var(--brand-primary)] text-white" : "bg-gray-100 text-gray-500")}><Package className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 text-sm">Self-Ship</p><p className="text-xs text-gray-500 mt-0.5">Ship the item yourself to the seller's return address.</p></div>
                        {returnMethod === "self_ship" && <CheckCircle className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-1" />}
                      </button>
                      {returnMethod === "self_ship" && (
                        <div className="rounded-xl border border-orange-100 bg-white p-4 space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Return Details</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" /><span className="font-medium text-gray-900">{sellerName || "—"}</span></div>
                              {sellerPhone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" /><span className="text-gray-700">{sellerPhone}</span></div>}
                            </div>
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Return Address</p>
                            <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" /><span className="text-gray-700">{sellerAddress || "Loading seller address..."}</span></div>
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">How Self-Ship Works</p>
                            {["Review the seller return address above.", "Ship the item to the seller address.", "Submit tracking details and proof of shipment from the Return Detail page.", "System tracks the shipment until delivery."].map((s, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 mb-2"><div className="w-5 h-5 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</div><p className="text-xs text-gray-700">{s}</p></div>
                            ))}
                          </div>
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                            <p className="text-xs font-bold text-amber-800 mb-1">Important</p>
                            <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                              <li>You are responsible for arranging and paying for shipment.</li>
                              <li>A valid tracking number is required for processing.</li>
                              <li>Failure to provide tracking may delay or void the request.</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                {/* STEP 2: Details & Evidence */}
                {currentStep === "evidence" && (
                  <div className="space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">Details &amp; Evidence</h2>

                    {/* Description — required, always shown first */}
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-800 block">
                        Describe the Issue
                      </label>
                      <p className="text-xs text-gray-500 mb-1.5">Provide a detailed description of the problem with your order.</p>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. The item arrived with a visible crack on the side. The packaging was intact but the product inside was damaged."
                        rows={4}
                        className="resize-none text-sm"
                      />
                    </div>


                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-1">Upload Evidence</p>
                      <p className="text-xs text-gray-500 mb-2">
                        {evidenceReqs?.photoRequired || evidenceReqs?.videoRequired ? "Evidence is required for your selected reason." : "Evidence is optional but helps speed up the process."}
                      </p>
                    </div>

                    {/* Per-reason description */}
                    {effectiveReason && EVIDENCE_DESCRIPTIONS[effectiveReason as ReturnReason] && (
                      <p className="text-xs text-gray-600 mb-3">{EVIDENCE_DESCRIPTIONS[effectiveReason as ReturnReason]}</p>
                    )}

                    {/* Upload requirements notice */}
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-xs text-blue-800">
                      <Video className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                      <span>At least <strong>2 photos</strong> and <strong>1 video</strong> are required. Max 6 files total. Photos: JPG/PNG up to 10 MB &middot; Videos: MP4/MOV up to 50 MB.</span>
                    </div>

                    {/* Upload area — hidden when at 6-file cap */}
                    {evidenceFiles.length < 6 && (
                      <label className="block w-full border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors border-orange-200 hover:border-[var(--brand-primary)] hover:bg-orange-50/30">
                        <input type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime" multiple onChange={handleEvidenceUpload} className="hidden" />
                        <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">Click to upload photos or videos</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {evidenceFiles.length}/6 files &middot; {evidenceFiles.filter(f => f.type.startsWith("image/")).length}/2 photos &middot; {evidenceFiles.some(f => f.type.startsWith("video/")) ? "✓" : "0"}/1 video
                        </p>
                      </label>
                    )}

                    {/* Previews — horizontal scroll strip with arrow nav */}
                    {evidencePreviews.length > 0 && (
                      <div className="relative">
                        <div id="evidence-scroll" className="flex gap-2 overflow-x-auto scroll-smooth pb-1 pt-3 px-1 scrollbar-hide">
                          {evidencePreviews.map((preview, i) => (
                            <div key={i} className="relative group flex-shrink-0">
                              <button onClick={() => setSelectedImageIndex(i)} className="cursor-pointer hover:opacity-80 transition-opacity block">
                                {evidenceFiles[i]?.type.startsWith("video/") ? (
                                  <div className="w-24 h-24 rounded-lg bg-gray-900 flex flex-col items-center justify-center border border-gray-200">
                                    <Video className="w-6 h-6 text-white" />
                                    <p className="text-[8px] text-white/70 mt-1 truncate px-1 w-full text-center">{evidenceFiles[i].name}</p>
                                  </div>
                                ) : (
                                  <img loading="lazy" src={preview} alt={`Evidence ${i + 1}`} className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                                )}
                              </button>
                              <button onClick={() => removeEvidence(i)} className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {evidencePreviews.length > 3 && (
                          <div className="flex justify-end gap-1 mt-1">
                            <button onClick={() => { const el = document.getElementById('evidence-scroll'); if (el) el.scrollLeft -= 200; }} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                              <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                            <button onClick={() => { const el = document.getElementById('evidence-scroll'); if (el) el.scrollLeft += 200; }} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Media Preview Modal — rendered via portal so no parent click handler can interfere */}
                    {selectedImageIndex !== null && (currentStep === "evidence" || currentStep === "review") && createPortal(
                      <div
                        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
                        onClick={() => setSelectedImageIndex(null)}
                      >
                        <div
                          style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 25px 50px rgba(0,0,0,0.3)", width: "100%", maxWidth: "900px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
                            <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                              {evidenceFiles[selectedImageIndex]?.name || `File ${selectedImageIndex + 1}`}
                            </p>
                            <button
                              type="button"
                              onClick={() => setSelectedImageIndex(null)}
                              style={{ marginLeft: "16px", flexShrink: 0, width: "32px", height: "32px", borderRadius: "50%", background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <X className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>

                          {/* Body: left arrow | media | right arrow */}
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 16px 8px", flex: 1, minHeight: 0 }}>
                            {/* Left arrow */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(Math.max(0, selectedImageIndex - 1)); }}
                              disabled={selectedImageIndex === 0}
                              style={{ flexShrink: 0, width: "40px", height: "40px", borderRadius: "50%", background: "#f3f4f6", border: "none", cursor: selectedImageIndex === 0 ? "not-allowed" : "pointer", opacity: selectedImageIndex === 0 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, position: "relative" }}
                            >
                              <ChevronLeft className="w-5 h-5 text-gray-700" />
                            </button>

                            {/* Media — overflow hidden prevents any bleed, stops event propagation */}
                            <div
                              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", borderRadius: "12px", overflow: "hidden", maxHeight: "60vh" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {evidenceFiles[selectedImageIndex]?.type.startsWith("video/") ? (
                                <video
                                  key={selectedImageIndex}
                                  src={evidencePreviews[selectedImageIndex]}
                                  controls
                                  preload="auto"
                                  style={{ width: "100%", maxHeight: "60vh", display: "block", background: "#000" }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <img
                                  src={evidencePreviews[selectedImageIndex]}
                                  alt={`Evidence ${selectedImageIndex + 1}`}
                                  style={{ maxWidth: "100%", maxHeight: "60vh", display: "block", objectFit: "contain" }}
                                />
                              )}
                            </div>

                            {/* Right arrow */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(Math.min(evidencePreviews.length - 1, selectedImageIndex + 1)); }}
                              disabled={selectedImageIndex === evidencePreviews.length - 1}
                              style={{ flexShrink: 0, width: "40px", height: "40px", borderRadius: "50%", background: "#f3f4f6", border: "none", cursor: selectedImageIndex === evidencePreviews.length - 1 ? "not-allowed" : "pointer", opacity: selectedImageIndex === evidencePreviews.length - 1 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, position: "relative" }}
                            >
                              <ChevronRight className="w-5 h-5 text-gray-700" />
                            </button>
                          </div>

                          {/* Footer: status pill at lower right */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "10px 20px", flexShrink: 0 }}>
                            <span style={{ fontSize: "12px", color: "#6b7280", background: "#f3f4f6", padding: "4px 12px", borderRadius: "999px", fontWeight: 500 }}>
                              {evidenceFiles[selectedImageIndex]?.type.startsWith("video/") ? "Video" : "Photo"} {selectedImageIndex + 1} of {evidencePreviews.length}
                            </span>
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                )}

                {/* STEP 6: Review */}
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
                          {topLevelReason === "item_not_received"
                            ? `Item Not Received → ${ITEM_NOT_RECEIVED_SUB_REASONS.find(s => s.value === subReason)?.label || subReason}`
                            : TOP_LEVEL_REASONS.find(r => r.value === topLevelReason)?.label || topLevelReason
                          }
                        </p>
                      </div>

                      {/* Resolution type */}
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-500 mb-0.5">Preferred Solution</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedType ? RETURN_TYPE_META[selectedType]?.label : selectedType}
                        </p>
                      </div>

                      {/* Return method (only for return_refund) */}
                      {selectedType === "return_refund" && returnMethod && (
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="text-xs text-gray-500 mb-0.5">Return Method</p>
                          <p className="text-xs font-medium text-gray-900">
                            {returnMethod === "pickup" ? "Pickup (courier collects from you)" : "Self-Ship (drop off at courier branch)"}
                          </p>
                        </div>
                      )}

                      {/* Items */}
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Items ({isItemSelectionStep ? selectedItems.size : items.length})</p>
                        {(isItemSelectionStep
                          ? Array.from(selectedItems.entries()).map(([itemId, sel]) => ({ item: items.find((i: any) => getItemId(i) === itemId), sel }))
                          : items.map((item: any) => ({ item, sel: { quantity: item.quantity || 1 } }))
                        ).map(({ item, sel }: any) => item ? (
                          <div key={getItemId(item)} className="flex items-center gap-2 py-0.5">
                            <img loading="lazy" src={item?.image || "/placeholder.png"} alt={item?.name} className="w-8 h-8 rounded object-cover" />
                            <div className="flex-1 min-w-0"><p className="text-xs text-gray-900 truncate">{item?.name}</p><p className="text-[10px] text-gray-500">Qty: {sel.quantity}</p></div>
                            <p className="text-xs font-semibold text-gray-900">₱{(Number(item?.price || 0) * sel.quantity).toLocaleString()}</p>
                          </div>
                        ) : null)}
                      </div>

                      {/* Evidence */}
                      {evidencePreviews.length > 0 && (
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="text-sm font-semibold text-gray-900 mb-3">Evidence ({evidencePreviews.length} file{evidencePreviews.length > 1 ? "s" : ""})</p>
                          <div className="flex gap-3 overflow-x-auto">
                            {evidencePreviews.map((p, i) => (
                              <button key={i} onClick={() => setSelectedImageIndex(i)} className="relative group flex-shrink-0 hover:scale-105 transition-transform">
                                {evidenceFiles[i]?.type.startsWith("video/") ? (
                                  <div className="w-24 h-24 rounded-lg bg-gray-900 flex flex-col items-center justify-center border-2 border-gray-200 group-hover:border-[var(--brand-primary)] shadow-md">
                                    <Video className="w-6 h-6 text-white" />
                                    <p className="text-[8px] text-white/70 mt-1 truncate px-1 w-full text-center">{evidenceFiles[i].name}</p>
                                  </div>
                                ) : (
                                  <img loading="lazy" src={p} alt={`Evidence ${i + 1}`} className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 group-hover:border-[var(--brand-primary)] shadow-md" />
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Click any file to preview</p>
                        </div>
                      )}

                      {/* Description */}
                      {description && (
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="text-xs text-gray-500 mb-0.5">Additional Details</p>
                          <p className="text-xs text-gray-700">{description}</p>
                        </div>
                      )}

                      {/* Refund amount — after evidence */}
                      {isReplacement ? (
                        <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-blue-800">Replacement Item</p>
                              <p className="text-[10px] text-blue-600 mt-0.5">The seller will ship a brand new replacement once approved.</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border bg-orange-50 border-orange-200">
                          <p className="text-[16px] font-bold mb-1">Refund Amount</p>
                          <p className="text-2xl font-bold text-[var(--brand-primary)]">&#8369;{(isItemSelectionStep ? selectedItemsTotal : totalOrderAmount).toLocaleString()}</p>
                          {isItemSelectionStep && selectedItems.size > 0 && <p className="text-[10px] text-gray-500 mt-0.5">Sum of {selectedItems.size} selected item{selectedItems.size > 1 ? 's' : ''}</p>}
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
                            <p className="text-[16px] font-semibold text-gray-900">
                              {resolutionPath === "instant"
                                ? "Instant Refund"
                                : resolutionPath === "seller_review"
                                  ? "Seller Review (48h)"
                                  : "Return Required"}
                            </p>
                            <p className="text-[13px] text-gray-600 mt-0.5">
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



            {/* Navigation buttons */}
            <div className={cn("flex items-center mt-3 gap-2", currentStepIndex > 0 ? "justify-between" : "justify-end")}>
              {currentStepIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="px-3 text-[11px]"
                  size="sm"
                >
                  <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                  Back
                </Button>
              )}

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
