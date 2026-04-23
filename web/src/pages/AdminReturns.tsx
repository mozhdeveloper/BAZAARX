/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../stores/adminStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import AdminSidebar from "../components/AdminSidebar";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  RotateCcw,
  Truck,
  Eye,
  Coins,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ReturnStatus,
  getStatusLabel,
} from "../services/returnService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdminReturn {
  id: string;
  order_id: string;
  order_number: string;
  buyer_name: string;
  buyer_email: string;
  seller_name: string;
  status: ReturnStatus;
  return_type: string | null;
  resolution_path: string | null;
  return_reason: string | null;
  description: string | null;
  refund_amount: number | null;
  counter_offer_amount: number | null;
  seller_note: string | null;
  rejected_reason: string | null;
  evidence_urls: string[] | null;
  items_json: any[] | null;
  seller_deadline: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  return_tracking_number: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getStatusBadgeColor(status: string): string {
  const m: Record<string, string> = {
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
  return m[status] || "bg-gray-100 text-gray-800";
}

function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
    case "seller_review":
      return <Clock className="w-3.5 h-3.5" />;
    case "counter_offered":
      return <MessageSquare className="w-3.5 h-3.5" />;
    case "approved":
    case "refunded":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "rejected":
      return <XCircle className="w-3.5 h-3.5" />;
    case "escalated":
      return <ShieldAlert className="w-3.5 h-3.5" />;
    case "return_in_transit":
      return <Truck className="w-3.5 h-3.5" />;
    case "return_received":
      return <Package className="w-3.5 h-3.5" />;
    default:
      return <Clock className="w-3.5 h-3.5" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const AdminReturns: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, escalated: 0, pending: 0, refunded: 0 });

  // Detail dialog
  const [selectedReturn, setSelectedReturn] = useState<AdminReturn | null>(null);

  // Admin action dialog
  const [actionType, setActionType] = useState<"approve" | "reject" | "bazcoin" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadReturns = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("refund_return_periods")
        .select(`
          *,
          order:orders(
            id, order_number,
            buyer:buyers(id, profiles(first_name, last_name, email)),
            order_items(product_name, quantity, price, primary_image_url, product:products(seller_id, sellers(store_name)))
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: AdminReturn[] = (data || []).map((row: any) => {
        const buyer = row.order?.buyer;
        const profile = buyer?.profiles;
        const buyerName = profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown"
          : "Unknown";

        const items = row.order?.order_items || [];
        const sellerName =
          items[0]?.product?.sellers?.store_name || "Unknown Seller";

        return {
          id: row.id,
          order_id: row.order_id,
          order_number: row.order?.order_number || "—",
          buyer_name: buyerName,
          buyer_email: profile?.email || "",
          seller_name: sellerName,
          status: row.status,
          return_type: row.return_type,
          resolution_path: row.resolution_path,
          return_reason: row.return_reason,
          description: row.description,
          refund_amount: row.refund_amount ? parseFloat(row.refund_amount) : null,
          counter_offer_amount: row.counter_offer_amount ? parseFloat(row.counter_offer_amount) : null,
          seller_note: row.seller_note,
          rejected_reason: row.rejected_reason,
          evidence_urls: row.evidence_urls,
          items_json: row.items_json,
          seller_deadline: row.seller_deadline,
          escalated_at: row.escalated_at,
          resolved_at: row.resolved_at,
          resolved_by: row.resolved_by,
          return_tracking_number: row.return_tracking_number,
          created_at: row.created_at,
        };
      });

      setReturns(mapped);
      setStats({
        total: mapped.length,
        escalated: mapped.filter((r) => r.status === "escalated").length,
        pending: mapped.filter((r) => ["pending", "seller_review"].includes(r.status)).length,
        refunded: mapped.filter((r) => ["approved", "refunded"].includes(r.status)).length,
      });
    } catch (err) {
      console.error("Failed to load admin returns:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  // Live updates: refresh when refund/return periods change
  useAdminRealtime('refund_return_periods', loadReturns);

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  // Filtering
  const filtered = returns
    .filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.order_number.toLowerCase().includes(q) ||
        r.buyer_name.toLowerCase().includes(q) ||
        r.seller_name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    })
    // Escalated first
    .sort((a, b) => {
      if (a.status === "escalated" && b.status !== "escalated") return -1;
      if (b.status === "escalated" && a.status !== "escalated") return 1;
      return 0;
    });

  // Admin actions
  const handleAdminApprove = async () => {
    if (!selectedReturn) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const isReplacement = selectedReturn.return_type === "replacement";

      await supabase
        .from("refund_return_periods")
        .update({
          status: "approved",
          ...(isReplacement ? {} : { refund_date: now }),
          resolved_at: now,
          resolved_by: "admin",
          seller_note: adminNote || (isReplacement ? "Replacement approved by admin" : "Approved by admin"),
        })
        .eq("id", selectedReturn.id);

      if (isReplacement) {
        // For replacement: mark order as processing, keep payment as-is
        await supabase
          .from("orders")
          .update({ shipment_status: "processing", updated_at: now })
          .eq("id", selectedReturn.order_id);

        await supabase.from("order_status_history").insert({
          order_id: selectedReturn.order_id,
          status: "replacement_approved",
          note: `Admin override: ${adminNote || "Replacement approved — seller will ship a new item"}`,
          changed_by_role: "admin",
        });
      } else {
        // For refund: process refund
        await supabase
          .from("orders")
          .update({ payment_status: "refunded", updated_at: now })
          .eq("id", selectedReturn.order_id);

        await supabase.from("order_status_history").insert({
          order_id: selectedReturn.order_id,
          status: "refund_approved",
          note: `Admin override: ${adminNote || "Refund approved"}`,
          changed_by_role: "admin",
        });
      }

      setReturns((prev) =>
        prev.map((r) => (r.id === selectedReturn.id ? { ...r, status: "approved" as ReturnStatus } : r))
      );
      setActionType(null);
      setSelectedReturn(null);
      setAdminNote("");
    } catch (err) {
      console.error("Admin approve failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminReject = async () => {
    if (!selectedReturn) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      await supabase
        .from("refund_return_periods")
        .update({
          status: "rejected",
          rejected_reason: adminNote || "Rejected by admin",
          resolved_at: now,
          resolved_by: "admin",
        })
        .eq("id", selectedReturn.id);

      await supabase.from("order_status_history").insert({
        order_id: selectedReturn.order_id,
        status: "return_rejected",
        note: `Admin override: ${adminNote || "Return rejected"}`,
        changed_by_role: "admin",
      });

      setReturns((prev) =>
        prev.map((r) => (r.id === selectedReturn.id ? { ...r, status: "rejected" as ReturnStatus } : r))
      );
      setActionType(null);
      setSelectedReturn(null);
      setAdminNote("");
    } catch (err) {
      console.error("Admin reject failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminBazcoin = async () => {
    if (!selectedReturn) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const refundAmt = selectedReturn.refund_amount || 0;
      const bonusAmt = Math.round(refundAmt * 0.1);
      const totalBazcoins = refundAmt + bonusAmt;

      // Resolve the return
      await supabase
        .from("refund_return_periods")
        .update({
          status: "approved",
          refund_date: now,
          resolved_at: now,
          resolved_by: "admin",
          seller_note: `BazCoin compensation: ${totalBazcoins} coins (${refundAmt} + ${bonusAmt} bonus). ${adminNote}`.trim(),
        })
        .eq("id", selectedReturn.id);

      // Get buyer id from order
      const { data: orderData } = await supabase
        .from("orders")
        .select("buyer_id")
        .eq("id", selectedReturn.order_id)
        .single();

      if (orderData?.buyer_id) {
        // Get current bazcoins
        const { data: buyerData } = await supabase
          .from("buyers")
          .select("bazcoins")
          .eq("id", orderData.buyer_id)
          .single();

        const currentBazcoins = buyerData?.bazcoins || 0;
        const newBalance = currentBazcoins + totalBazcoins;

        // Update buyer bazcoins
        await supabase
          .from("buyers")
          .update({ bazcoins: newBalance })
          .eq("id", orderData.buyer_id);

        // Record transaction
        await supabase.from("bazcoin_transactions").insert({
          user_id: orderData.buyer_id,
          amount: totalBazcoins,
          balance_after: newBalance,
          reason: `Return compensation for order #${selectedReturn.order_number} (includes 10% bonus)`,
          reference_id: selectedReturn.id,
          reference_type: "return_refund",
        });
      }

      await supabase
        .from("orders")
        .update({ payment_status: "refunded", updated_at: now })
        .eq("id", selectedReturn.order_id);

      await supabase.from("order_status_history").insert({
        order_id: selectedReturn.order_id,
        status: "refund_approved",
        note: `Admin awarded ${totalBazcoins} BazCoins as compensation`,
        changed_by_role: "admin",
      });

      setReturns((prev) =>
        prev.map((r) => (r.id === selectedReturn.id ? { ...r, status: "approved" as ReturnStatus } : r))
      );
      setActionType(null);
      setSelectedReturn(null);
      setAdminNote("");
    } catch (err) {
      console.error("Admin bazcoin compensation failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusTabs: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "escalated", label: "Escalated" },
    { value: "pending", label: "Pending" },
    { value: "seller_review", label: "Seller Review" },
    { value: "counter_offered", label: "Counter Offered" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "return_in_transit", label: "In Transit" },
    { value: "refunded", label: "Refunded" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">
                  Returns & Refunds Management
                </h1>
                <p className="text-[var(--text-muted)]">
                  Monitor, escalate, and resolve all return requests platform-wide
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Returns", value: stats.total, icon: RotateCcw, color: "blue" },
                { label: "Escalated", value: stats.escalated, icon: ShieldAlert, color: "purple" },
                { label: "Pending Review", value: stats.pending, icon: Clock, color: "orange" },
                { label: "Refunded", value: stats.refunded, icon: DollarSign, color: "green" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl", `bg-${s.color}-100`)}>
                      <s.icon className={cn("w-5 h-5", `text-${s.color}-600`)} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{s.label}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {isLoading ? "..." : s.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <div className="overflow-x-auto scrollbar-hide pb-0.5">
                <div className="inline-flex items-center p-1 bg-white rounded-full border border-gray-200 shadow-sm">
                  {statusTabs.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setStatusFilter(tab.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                        statusFilter === tab.value
                          ? "bg-[var(--brand-primary)] text-white shadow-md"
                          : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                      )}
                    >
                      {tab.label}
                      {tab.value === "escalated" && stats.escalated > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px]">
                          {stats.escalated}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search order #, buyer, seller..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <RotateCcw className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No return requests found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Order #</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((ret) => {
                          const isEscalated = ret.status === "escalated";
                          const isBazcoin = ret.description?.startsWith("[BAZCOIN_COMPENSATION]");

                          return (
                            <TableRow
                              key={ret.id}
                              className={cn(isEscalated && "bg-purple-50/50")}
                            >
                              <TableCell className="font-mono text-xs">
                                {ret.order_number}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{ret.buyer_name}</p>
                                  <p className="text-xs text-gray-400">{ret.buyer_email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {ret.seller_name}
                              </TableCell>
                              <TableCell>
                                <Badge className={cn(
                                  "border-none text-[10px]",
                                  ret.return_type === "replacement"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-orange-100 text-orange-800"
                                )}>
                                  {ret.return_type === "replacement" ? "Replacement" : "Refund"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {ret.return_reason?.replace(/_/g, " ") || "—"}
                              </TableCell>
                              <TableCell>
                                {ret.return_type === "replacement" ? (
                                  <span className="text-sm font-medium text-blue-600 flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5" />
                                    Replacement
                                  </span>
                                ) : isBazcoin ? (
                                  <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                                    <Coins className="w-3.5 h-3.5" />
                                    BazCoin
                                  </span>
                                ) : (
                                  <span className="text-sm font-semibold">
                                    ₱{(ret.refund_amount || 0).toLocaleString()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    getStatusBadgeColor(ret.status),
                                    "border-none flex items-center gap-1 w-fit"
                                  )}
                                >
                                  {getStatusIcon(ret.status)}
                                  {getStatusLabel(ret.status as ReturnStatus)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-gray-400">
                                {new Date(ret.created_at).toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedReturn(ret);
                                      setActionType(null);
                                    }}
                                    className="h-7 px-2 text-xs"
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    View
                                  </Button>
                                  {["pending", "seller_review", "escalated", "counter_offered"].includes(ret.status) && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setSelectedReturn(ret);
                                          setActionType("approve");
                                        }}
                                        className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedReturn(ret);
                                          setActionType("reject");
                                        }}
                                        className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedReturn(ret);
                                          setActionType("bazcoin");
                                        }}
                                        className="h-7 px-2 text-xs border-green-200 text-green-600 hover:bg-green-50"
                                      >
                                        <Coins className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedReturn && !actionType}
        onOpenChange={() => setSelectedReturn(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Request Details</DialogTitle>
            <DialogDescription>
              Order #{selectedReturn?.order_number}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Buyer</p>
                  <p className="text-sm font-medium">{selectedReturn.buyer_name}</p>
                  <p className="text-xs text-gray-400">{selectedReturn.buyer_email}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Seller</p>
                  <p className="text-sm font-medium">{selectedReturn.seller_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Type</p>
                  <Badge className={cn(
                    "mt-1 border-none",
                    selectedReturn.return_type === "replacement"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-orange-100 text-orange-800"
                  )}>
                    {selectedReturn.return_type === "replacement" ? "Return & Replace" : "Return & Refund"}
                  </Badge>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">
                    {selectedReturn.return_type === "replacement" ? "Resolution" : "Refund Amount"}
                  </p>
                  {selectedReturn.return_type === "replacement" ? (
                    <p className="text-sm font-medium text-blue-700 mt-1">Replacement Item</p>
                  ) : (
                    <p className="text-sm font-bold text-[var(--brand-primary)] mt-1">
                      ₱{(selectedReturn.refund_amount || 0).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="text-sm font-medium">
                    {selectedReturn.return_reason?.replace(/_/g, " ") || "—"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Resolution Path</p>
                  <p className="text-sm font-medium">
                    {selectedReturn.resolution_path?.replace(/_/g, " ") || "—"}
                  </p>
                </div>
              </div>

              {selectedReturn.description && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700">{selectedReturn.description}</p>
                </div>
              )}

              {selectedReturn.counter_offer_amount != null && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-600 mb-1">Counter-Offer</p>
                  <p className="text-sm font-bold text-orange-800">
                    ₱{selectedReturn.counter_offer_amount.toLocaleString()}
                  </p>
                  {selectedReturn.seller_note && (
                    <p className="text-xs text-orange-600 mt-1">{selectedReturn.seller_note}</p>
                  )}
                </div>
              )}

              {selectedReturn.rejected_reason && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{selectedReturn.rejected_reason}</p>
                </div>
              )}

              {/* Evidence photos */}
              {selectedReturn.evidence_urls && selectedReturn.evidence_urls.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">
                    Evidence ({selectedReturn.evidence_urls.length} photos)
                  </p>
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedReturn.evidence_urls.map((url, i) => (
                      <img loading="lazy" 
                        key={i}
                        src={url}
                        alt={`Evidence ${i + 1}`}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              {selectedReturn.items_json && selectedReturn.items_json.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Items</p>
                  {selectedReturn.items_json.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      {item.image && (
                        <img loading="lazy" src={item.image} alt="" className="w-8 h-8 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.productName || item.product_name}</p>
                      </div>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                      <p className="text-sm font-medium">₱{(item.price || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-[10px] text-gray-400">Submitted</p>
                  <p className="text-xs font-medium">
                    {new Date(selectedReturn.created_at).toLocaleDateString("en-PH")}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-[10px] text-gray-400">Resolved</p>
                  <p className="text-xs font-medium">
                    {selectedReturn.resolved_at
                      ? new Date(selectedReturn.resolved_at).toLocaleDateString("en-PH")
                      : "—"}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-[10px] text-gray-400">By</p>
                  <p className="text-xs font-medium">{selectedReturn.resolved_by || "—"}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedReturn &&
              ["pending", "seller_review", "escalated", "counter_offered"].includes(
                selectedReturn.status
              ) && (
                <div className="flex gap-2 w-full">
                  <Button
                    size="sm"
                    onClick={() => setActionType("approve")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActionType("reject")}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActionType("bazcoin")}
                    className="border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <Coins className="w-4 h-4 mr-1" />
                    BazCoin
                  </Button>
                </div>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={!!actionType && !!selectedReturn}
        onOpenChange={() => {
          setActionType(null);
          setAdminNote("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? selectedReturn?.return_type === "replacement"
                  ? "Approve Replacement"
                  : "Approve Return & Refund"
                : actionType === "reject"
                  ? "Reject Return Request"
                  : "Award BazCoin Compensation"}
            </DialogTitle>
            <DialogDescription>
              Order #{selectedReturn?.order_number} &middot; {selectedReturn?.buyer_name}
            </DialogDescription>
          </DialogHeader>

          {actionType === "bazcoin" && selectedReturn && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800 mb-1">BazCoin Compensation Breakdown</p>
              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                <div>
                  <p className="text-xs text-green-600">Base Amount</p>
                  <p className="font-bold text-green-800">
                    {(selectedReturn.refund_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-600">10% Bonus</p>
                  <p className="font-bold text-green-800">
                    {Math.round((selectedReturn.refund_amount || 0) * 0.1).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-600">Total BazCoins</p>
                  <p className="font-bold text-green-700 text-lg">
                    {Math.round((selectedReturn.refund_amount || 0) * 1.1).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Admin Note {actionType === "reject" ? "(required)" : "(optional)"}
            </label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={
                actionType === "approve"
                  ? "Reason for approving..."
                  : actionType === "reject"
                    ? "Reason for rejecting..."
                    : "Note for BazCoin compensation..."
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionType(null); setAdminNote(""); }}>
              Cancel
            </Button>
            <Button
              onClick={
                actionType === "approve"
                  ? handleAdminApprove
                  : actionType === "reject"
                    ? handleAdminReject
                    : handleAdminBazcoin
              }
              disabled={isProcessing || (actionType === "reject" && !adminNote.trim())}
              className={cn(
                actionType === "reject"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              {isProcessing
                ? "Processing..."
                : actionType === "approve"
                  ? selectedReturn?.return_type === "replacement"
                    ? "Approve Replacement"
                    : "Approve & Refund"
                  : actionType === "reject"
                    ? "Reject"
                    : "Award BazCoins"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReturns;
