import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { BazaarFooter } from '@/components/ui/bazaar-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommentSection } from '@/components/requests/CommentSection';
import { RequestTimeline } from '@/components/requests/RequestTimeline';
import { SupportWidget } from '@/components/requests/SupportWidget';
import { AdminRequestActions } from '@/components/admin/AdminRequestActions';
import { RequestAuditLog } from '@/components/admin/RequestAuditLog';
import { SupplierOffersList } from '@/components/admin/SupplierOffersList';
import { useAdminAuth } from '@/stores/adminStore';
import {
  ChevronLeft,
  MessageSquare,
  TrendingUp,
  Loader2,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { productRequestService, type ProductRequest } from '@/services/productRequestService';
import { supabase } from '@/lib/supabase';

/* ── Status labels matching the pipeline ────────────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; emoji: string; badgeBg: string; message: string }> = {
  new:                    { label: 'New',                   emoji: '🆕', badgeBg: 'bg-gray-50 border-gray-300 text-gray-700',         message: 'Your request has been received and will be reviewed soon.' },
  under_review:           { label: 'Under Review',          emoji: '👀', badgeBg: 'bg-blue-50 border-blue-300 text-blue-700',         message: 'Our team is evaluating this request.' },
  approved_for_sourcing:  { label: 'Sourcing',              emoji: '🔍', badgeBg: 'bg-amber-50 border-amber-300 text-amber-700',     message: 'Suppliers are being contacted and samples evaluated.' },
  already_available:      { label: 'Already Available',     emoji: '🛒', badgeBg: 'bg-green-50 border-green-300 text-green-700',     message: 'This product already exists on BazaarX.' },
  on_hold:                { label: 'On Hold',               emoji: '⏸', badgeBg: 'bg-amber-50 border-amber-300 text-amber-800',     message: 'We need more information before proceeding.' },
  rejected:               { label: 'Not Accepted',          emoji: '❌', badgeBg: 'bg-red-50 border-red-300 text-red-700',           message: 'This request did not meet our sourcing criteria.' },
  converted_to_listing:   { label: 'Listed',                emoji: '🎉', badgeBg: 'bg-emerald-50 border-emerald-300 text-emerald-700', message: 'Now available on BazaarX!' },
  // legacy
  pending:                { label: 'Gathering Interest',    emoji: '📍', badgeBg: 'bg-amber-50 border-amber-300 text-amber-700',     message: 'Community is gathering interest.' },
  in_progress:            { label: 'In Sourcing',           emoji: '🔍', badgeBg: 'bg-blue-50 border-blue-300 text-blue-700',         message: 'Suppliers being contacted.' },
  approved:               { label: 'Verified',              emoji: '✅', badgeBg: 'bg-emerald-50 border-emerald-300 text-emerald-700', message: 'Lab-verified.' },
};

/* ── Next stage milestones ──────────────────────────────────────────── */

const NEXT_STAGE: Record<string, { label: string; threshold: number }> = {
  pending:     { label: 'Sourcing', threshold: 200 },
  in_progress: { label: 'Testing',  threshold: 400 },
  approved:    { label: 'Live',     threshold: 500 },
  rejected:    { label: 'N/A',      threshold: 1   },
};

type DetailTab = 'discussion' | 'pipeline';

const ProductRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<ProductRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('discussion');
  const [refreshKey, setRefreshKey] = useState(0);

  const { isAuthenticated: isAdmin } = useAdminAuth();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setViewerUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const found = await productRequestService.getRequestById(id);
        setRequest(found);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Request not found</h2>
          <Button variant="outline" onClick={() => navigate('/requests')}>
            <ChevronLeft size={16} className="mr-1" /> Back to pipeline
          </Button>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
  const heatScore = request.votes + request.estimatedDemand;
  const nextStage = NEXT_STAGE[request.status] ?? NEXT_STAGE.approved;
  const progressPct = Math.min(100, Math.round((heatScore / nextStage.threshold) * 100));
  const toGo = Math.max(0, nextStage.threshold - heatScore);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 font-medium"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ═══════ LEFT: Main Content ═══════ */}
          <div className="flex-1 space-y-6">
            {/* Request card */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 border-purple-200 shadow-sm overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  {/* Top row: Status + Founder */}
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={`${cfg.badgeBg} border rounded-full text-xs font-bold px-3 py-1`}>
                      {cfg.emoji} {cfg.label}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-gray-400">👤</span>
                      <span className="text-gray-400">Founded by</span>
                      <span className="text-[var(--brand-primary)] font-semibold">{request.requestedBy}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 leading-tight">
                    {request.productName}
                  </h1>

                  {/* Description */}
                  {request.description && (
                    <p className="text-gray-600 leading-relaxed mb-4">{request.description}</p>
                  )}

                  {/* Meta: category + date */}
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                    <Badge variant="outline" className="rounded-full text-xs font-normal border-gray-300">
                      {request.category}
                    </Badge>
                    <span>Created on {new Date(request.requestDate).toISOString().slice(0, 10)}</span>
                  </div>

                  {/* Status message box */}
                  {cfg.message && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
                      <p className="text-sm text-gray-600">{cfg.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Lifecycle timeline */}
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <RequestTimeline
                  status={request.status}
                  sourcingStage={request.sourcingStage}
                  rejectionReason={request.rejectionHoldReason}
                />
              </CardContent>
            </Card>

            {/* Matched-product CTA */}
            {request.linkedProductId && (
              <Card className="border-2 border-green-300 bg-green-50/50 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-900">
                      {request.status === 'converted_to_listing' ? '🎉 Now available on BazaarX' : '🛒 We found a matching product'}
                    </p>
                    <p className="text-xs text-green-700 mt-1">Tap to view the product page</p>
                  </div>
                  <Button onClick={() => navigate(`/product/${request.linkedProductId}`)} className="bg-green-600 hover:bg-green-700">
                    <ExternalLink className="h-4 w-4 mr-1" /> View Product
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Discussion / Lab Pipeline tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('discussion')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'discussion'
                    ? 'border-gray-800 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Discussion ({request.comments})
              </button>
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'pipeline'
                    ? 'border-gray-800 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Lab Pipeline
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'discussion' && (
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-4">Contribute to this Request</h3>
                  <CommentSection
                    requestId={request.id}
                    viewerUserId={viewerUserId}
                    isAdminViewer={false}
                    showForm
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === 'pipeline' && (
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-4">Lab Pipeline Progress</h3>

                  {/* Pipeline stages */}
                  <div className="space-y-4">
                    {[
                      { emoji: '📍', label: 'Gathering Interest', key: 'pending',     desc: 'Community is voting and pledging to show demand.' },
                      { emoji: '🔍', label: 'Sourcing',           key: 'in_progress', desc: 'Suppliers contacted, samples ordered and negotiated.' },
                      { emoji: '🧪', label: 'Lab Testing',        key: 'testing',     desc: 'Bend tests, spec checks, durability testing underway.' },
                      { emoji: '✅', label: 'Verified',            key: 'approved',    desc: 'All tests passed — ready for marketplace listing.' },
                      { emoji: '🚀', label: 'Live',               key: 'live',        desc: 'Product is live and available for purchase.' },
                    ].map(({ emoji, label, key, desc }) => {
                      const stages = ['pending', 'in_progress', 'testing', 'approved', 'live'];
                      const currentIdx = stages.indexOf(request.status);
                      const stageIdx = stages.indexOf(key);
                      const isPast = stageIdx < currentIdx;
                      const isCurrent = stageIdx === currentIdx;

                      return (
                        <div
                          key={key}
                          className={`flex items-start gap-4 p-4 rounded-xl border ${
                            isCurrent
                              ? 'border-purple-300 bg-purple-50'
                              : isPast
                              ? 'border-green-200 bg-green-50/50'
                              : 'border-gray-100 bg-gray-50/50'
                          }`}
                        >
                          <span className="text-2xl">{emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{label}</span>
                              {isPast && <span className="text-xs text-green-600 font-medium">✓ Complete</span>}
                              {isCurrent && <span className="text-xs text-purple-600 font-bold">← Current</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ═══════ RIGHT SIDEBAR: Heat Score ═══════ */}
          <div className="lg:w-72 shrink-0 space-y-4">
            {/* Heat Score card */}
            <Card className="border-2 border-gray-900 shadow-sm overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Heat Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Flame className="h-8 w-8 text-[var(--brand-primary)]" />
                      <span className="text-4xl font-extrabold text-[var(--brand-primary)]">{heatScore}</span>
                    </div>
                  </div>
                  {request.status !== 'rejected' && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Next</p>
                      <p className="text-xl font-extrabold text-gray-700 italic">{nextStage.label}</p>
                      <p className="text-xs text-gray-400">{toGo} to go</p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progressPct}%`,
                        background: 'linear-gradient(90deg, #D97706, #E58C1A)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                    <span>{heatScore} / {nextStage.threshold}</span>
                    <span className="font-bold text-[var(--brand-primary)]">{progressPct}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support / Stake widget */}
            <SupportWidget
              requestId={request.id}
              demandCount={request.demandCount}
              stakedBazcoins={request.stakedBazcoins}
              onSupported={reload}
            />

            {/* Admin notes (public-friendly) */}
            {request.adminNotes && (
              <Card className="border border-blue-200">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">Team Update</p>
                  <p className="text-sm text-gray-700">{request.adminNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Admin-only panels */}
            {isAdmin && (
              <>
                <AdminRequestActions request={request} onChanged={reload} />
                <SupplierOffersList requestId={request.id} isAdmin />
                <RequestAuditLog requestId={request.id} refreshKey={refreshKey} />
              </>
            )}
          </div>
        </div>
      </main>

      <BazaarFooter />
    </div>
  );
};

export default ProductRequestDetailPage;
