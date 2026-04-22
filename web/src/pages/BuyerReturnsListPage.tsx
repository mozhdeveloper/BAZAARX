/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  DollarSign,
  Truck,
  ShieldAlert,
  MessageSquare,
  ChevronRight,
  Coins,
  Search,
} from "lucide-react";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import { useBuyerStore } from "../stores/buyerStore";
import {
  returnService,
  ReturnRequest,
  ReturnStatus,
  getStatusLabel,
} from "../services/returnService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useToast } from "../hooks/use-toast";
import { ReturnMessageThread } from "../components/returns/ReturnMessageThread";
import { Textarea } from "../components/ui/textarea";

// ---------------------------------------------------------------------------
// Status icon helper
// ---------------------------------------------------------------------------
function getStatusIcon(status: ReturnStatus) {
  switch (status) {
    case "pending":
    case "seller_review":
      return <Clock className="w-4 h-4" />;
    case "counter_offered":
      return <MessageSquare className="w-4 h-4" />;
    case "approved":
    case "refunded":
      return <CheckCircle className="w-4 h-4" />;
    case "rejected":
      return <XCircle className="w-4 h-4" />;
    case "escalated":
      return <ShieldAlert className="w-4 h-4" />;
    case "return_in_transit":
      return <Truck className="w-4 h-4" />;
    case "return_received":
      return <Package className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

// ---------------------------------------------------------------------------
// Status badge color
// ---------------------------------------------------------------------------
function getStatusBadgeColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    seller_review: "bg-blue-100 text-blue-800",
    counter_offered: "bg-orange-100 text-orange-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    escalated: "bg-purple-100 text-purple-800",
    return_in_transit: "bg-indigo-100 text-indigo-800",
    return_received: "bg-teal-100 text-teal-800",
    refunded: "bg-green-100 text-green-800",
  };
  return colorMap[status] || "bg-gray-100 text-gray-800";
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------
type FilterTab = "all" | "active" | "completed";

export default function BuyerReturnsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useBuyerStore();

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Messaging thread open state (tracks which return has its thread expanded)
  const [msgOpenId, setMsgOpenId] = useState<string | null>(null);

  // Counter-offer dialog
  const [counterOfferReturn, setCounterOfferReturn] = useState<ReturnRequest | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Mark-as-shipped dialog (return_required path after seller approval)
  const [shipReturn, setShipReturn] = useState<ReturnRequest | null>(null);
  const [shipTracking, setShipTracking] = useState('');
  const [isShipping, setIsShipping] = useState(false);

  // Load returns
  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return;
      setIsLoading(true);
      try {
        const data = await returnService.getReturnRequestsByBuyer(profile.id);
        setReturns(data);
      } catch (err) {
        console.error("Failed to load returns:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [profile?.id]);

  // Filtered results
  const activeStatuses: ReturnStatus[] = ["pending", "seller_review", "counter_offered", "escalated", "return_in_transit"];
  const completedStatuses: ReturnStatus[] = ["approved", "rejected", "refunded", "return_received"];

  const filtered = returns.filter((r) => {
    if (filter === "active") return activeStatuses.includes(r.status);
    if (filter === "completed") return completedStatuses.includes(r.status);
    return true;
  }).filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.orderNumber?.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.returnReason?.toLowerCase().includes(q)
    );
  });

  const activeCt = returns.filter((r) => activeStatuses.includes(r.status)).length;
  const completedCt = returns.filter((r) => completedStatuses.includes(r.status)).length;

  // Counter-offer actions
  const handleAcceptCounterOffer = async () => {
    if (!counterOfferReturn) return;
    setIsAccepting(true);
    try {
      await returnService.acceptCounterOffer(counterOfferReturn.id);
      toast({ title: "Counter-offer accepted", description: "Your partial refund will be processed shortly." });
      setReturns((prev) => prev.map((r) => r.id === counterOfferReturn.id ? { ...r, status: "approved" as ReturnStatus } : r));
      setCounterOfferReturn(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to accept", variant: "destructive" });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineCounterOffer = async () => {
    if (!counterOfferReturn) return;
    setIsDeclining(true);
    try {
      await returnService.declineCounterOffer(counterOfferReturn.id);
      toast({ title: "Counter-offer declined", description: "Your request has been escalated to admin review." });
      setReturns((prev) => prev.map((r) => r.id === counterOfferReturn.id ? { ...r, status: "escalated" as ReturnStatus } : r));
      setCounterOfferReturn(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to decline", variant: "destructive" });
    } finally {
      setIsDeclining(false);
    }
  };

  // Escalation
  const handleEscalate = async (returnId: string) => {
    try {
      await returnService.escalateReturn(returnId, "Buyer escalated due to no seller response");
      toast({ title: "Escalated", description: "Your request has been escalated to admin review." });
      setReturns((prev) => prev.map((r) => r.id === returnId ? { ...r, status: "escalated" as ReturnStatus } : r));
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to escalate", variant: "destructive" });
    }
  };

  // Mark return as shipped (buyer must enter carrier tracking number)
  const handleConfirmShipped = async () => {
    if (!shipReturn) return;
    const tracking = shipTracking.trim();
    if (tracking.length < 4) {
      toast({ title: 'Tracking number required', description: 'Enter the courier tracking number for the return shipment.', variant: 'destructive' });
      return;
    }
    setIsShipping(true);
    try {
      await returnService.confirmReturnShipment(shipReturn.id, tracking);
      toast({ title: 'Return marked as shipped', description: 'The seller will confirm receipt and process your refund.' });
      setReturns((prev) => prev.map((r) => r.id === shipReturn.id ? { ...r, status: 'return_in_transit' as ReturnStatus, returnTrackingNumber: tracking, buyerShippedAt: new Date().toISOString() } : r));
      setShipReturn(null);
      setShipTracking('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to record shipment', variant: 'destructive' });
    } finally {
      setIsShipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate("/orders")}
              className="flex items-center text-sm text-gray-500 hover:text-[var(--brand-primary)] mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Orders
            </button>
            <h1 className="text-2xl font-bold text-gray-900">My Returns & Refunds</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track and manage your return requests</p>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="inline-flex items-center p-1 bg-white rounded-full border border-orange-100/50 shadow-sm">
            {([
              { value: "all" as FilterTab, label: "All", count: returns.length },
              { value: "active" as FilterTab, label: "Active", count: activeCt },
              { value: "completed" as FilterTab, label: "Completed", count: completedCt },
            ]).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                  filter === tab.value
                    ? "bg-[var(--brand-primary)] text-white shadow-md"
                    : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn("ml-1", filter === tab.value ? "text-white/80" : "text-gray-400")}>
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-orange-200 bg-white rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No Returns Found</h3>
              <p className="text-sm text-gray-500">
                {filter !== "all"
                  ? "No returns match this filter."
                  : "You haven't made any return requests yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((ret) => {
              const deadline = ret.sellerDeadline;
              const deadlineRemaining = deadline ? returnService.formatDeadlineRemaining(deadline) : null;
              const deadlineExpired = deadline ? returnService.getDeadlineRemainingMs(deadline) <= 0 : false;
              const isBazcoin = ret.description?.startsWith("[BAZCOIN_COMPENSATION]");

              return (
                <Card
                  key={ret.id}
                  className="overflow-hidden hover:shadow-md transition-shadow border-orange-100/50"
                >
                  <CardContent className="p-0">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">Order #{ret.orderNumber || "—"}</span>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-400">{new Date(ret.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <Badge className={cn(getStatusBadgeColor(ret.status), "border-none flex items-center gap-1")}>
                        {getStatusIcon(ret.status)}
                        {getStatusLabel(ret.status)}
                      </Badge>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                      {/* Items */}
                      <div className="flex items-start gap-3 mb-3">
                        {ret.items && ret.items.length > 0 ? (
                          <img loading="lazy" 
                            src={ret.items[0].image || "/placeholder.png"}
                            alt=""
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ret.items && ret.items.length > 0
                              ? ret.items[0].productName
                              : "Return Request"}
                            {ret.items && ret.items.length > 1 && (
                              <span className="text-gray-400 text-xs ml-1">
                                +{ret.items.length - 1} more
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Reason: {ret.returnReason?.replace(/_/g, " ") || "N/A"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {isBazcoin ? (
                              <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5" />
                                BazCoin Compensation
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-[var(--brand-primary)]">
                                ₱{(ret.refundAmount || 0).toLocaleString()}
                              </span>
                            )}
                            {ret.returnType && (
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {ret.returnType.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Counter-offer notice */}
                      {ret.status === "counter_offered" && ret.counterOfferAmount != null && (
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 mb-3">
                          <p className="text-sm font-medium text-orange-800 mb-1">
                            Seller Counter-Offer: ₱{ret.counterOfferAmount.toLocaleString()}
                          </p>
                          {ret.sellerNote && (
                            <p className="text-xs text-orange-600 mb-2">{ret.sellerNote}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setCounterOfferReturn(ret)}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCounterOfferReturn(ret)}
                              className="text-xs h-7 px-3 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Decline & Escalate
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Deadline warning */}
                      {ret.status === "seller_review" && deadlineRemaining && (
                        <div className={cn(
                          "p-2 rounded-lg text-xs flex items-center gap-2 mb-3",
                          deadlineExpired
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        )}>
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            Seller deadline: {deadlineExpired ? "Expired — " : deadlineRemaining}
                          </span>
                          {deadlineExpired && (
                            <Button
                              size="sm"
                              onClick={() => handleEscalate(ret.id)}
                              className="ml-auto text-[10px] h-6 px-2 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <ShieldAlert className="w-3 h-3 mr-1" />
                              Escalate
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Return shipping info */}
                      {ret.status === "return_in_transit" && ret.returnTrackingNumber && (
                        <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 flex items-center gap-2 mb-3">
                          <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                          Tracking: {ret.returnTrackingNumber}
                        </div>
                      )}

                      {/* Refunded notice */}
                      {ret.status === "refunded" && (
                        <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2 mb-3">
                          <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                          Refund processed on {ret.refundDate ? new Date(ret.refundDate).toLocaleDateString("en-PH") : "N/A"}
                        </div>
                      )}

                      {/* Action: buyer must ship the item back */}
                      {ret.status === "approved" && ret.resolutionPath === "return_required" && !ret.buyerShippedAt && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                          <div className="flex items-start gap-2 mb-2">
                            <Truck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-amber-900">Ship the item back to complete your refund</p>
                              {ret.returnLabelUrl && (
                                <a href={ret.returnLabelUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-700 hover:underline">Download return label</a>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => { setShipReturn(ret); setShipTracking(''); }}
                            className="text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <Truck className="w-3 h-3 mr-1" /> Mark as Shipped
                          </Button>
                        </div>
                      )}

                      {/* Message thread toggle */}
                      <button
                        onClick={() => setMsgOpenId(msgOpenId === ret.id ? null : ret.id)}
                        className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1 mb-2"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {msgOpenId === ret.id ? "Hide" : "View"} messages
                        <ChevronRight className={cn("w-3 h-3 transition-transform", msgOpenId === ret.id && "rotate-90")} />
                      </button>

                      {msgOpenId === ret.id && (
                        <ReturnMessageThread
                          returnId={ret.id}
                          senderRole="buyer"
                          className="mb-3"
                        />
                      )}

                      {/* View details link */}
                      <button
                        onClick={() => navigate(`/order/${ret.orderId}`)}
                        className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                      >
                        View Order Details
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Counter-offer dialog */}
      <Dialog open={!!counterOfferReturn} onOpenChange={() => setCounterOfferReturn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seller Counter-Offer</DialogTitle>
            <DialogDescription>
              The seller has offered ₱{counterOfferReturn?.counterOfferAmount?.toLocaleString()} as a partial refund instead of the full amount.
            </DialogDescription>
          </DialogHeader>
          {counterOfferReturn?.sellerNote && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              <p className="text-xs text-gray-500 mb-1">Seller's message:</p>
              {counterOfferReturn.sellerNote}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 p-3 bg-orange-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Original Amount</p>
              <p className="font-semibold text-gray-900">₱{(counterOfferReturn?.refundAmount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Counter-Offer</p>
              <p className="font-semibold text-[var(--brand-primary)]">₱{counterOfferReturn?.counterOfferAmount?.toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDeclineCounterOffer}
              disabled={isDeclining}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              {isDeclining ? "Declining..." : "Decline & Escalate"}
            </Button>
            <Button
              onClick={handleAcceptCounterOffer}
              disabled={isAccepting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isAccepting ? "Accepting..." : "Accept Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark-as-shipped dialog */}
      <Dialog open={!!shipReturn} onOpenChange={(open) => { if (!open) { setShipReturn(null); setShipTracking(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Return as Shipped</DialogTitle>
            <DialogDescription>
              Enter the tracking number from your courier so the seller can confirm receipt and process your refund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Carrier Tracking Number</label>
              <input
                type="text"
                value={shipTracking}
                onChange={(e) => setShipTracking(e.target.value)}
                placeholder="e.g. JT0123456789PH"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300"
              />
            </div>
            {shipReturn?.returnLabelUrl && (
              <a href={shipReturn.returnLabelUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--brand-primary)] hover:underline">
                Download return shipping label
              </a>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShipReturn(null); setShipTracking(''); }}>Cancel</Button>
            <Button
              onClick={handleConfirmShipped}
              disabled={isShipping || shipTracking.trim().length < 4}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isShipping ? 'Saving...' : 'Confirm Shipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BazaarFooter />
    </div>
  );
}
