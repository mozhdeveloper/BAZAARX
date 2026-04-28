// ========== SAMPLE QA RESULT — START ==========
// This is a HARDCODED SAMPLE QA Result modal used as a placeholder.
// All data displayed is STATIC/FAKE for demonstration purposes.
// 
// When the real QA Result API and component are ready:
// 1. Delete this entire file
// 2. Replace the import in SellerProducts.tsx with the real component
// 3. Pass actual product assessment data instead of hardcoded values
//
// Search for "SAMPLE QA RESULT" across the codebase to find all references.
// ========== SAMPLE QA RESULT — START ==========

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Shield, CheckCircle2, AlertTriangle, Package, Store, Calendar, User } from 'lucide-react';

interface SampleQAResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  sellerName?: string;
}

export function SampleQAResultModal({ open, onOpenChange, productName, sellerName }: SampleQAResultModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `QA-Result-Sample-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open print dialog
      window.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl p-0 bg-white border-none shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>QA Result</DialogTitle>
        </DialogHeader>

        <div ref={cardRef} className="bg-white">
          {/* Header — Green gradient */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-semibold tracking-wider uppercase opacity-90">Quality Assurance</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight">GRADE A <span className="text-emerald-200 font-medium text-base">(Premium OEM)</span></h2>
                <p className="text-emerald-200 text-xs mt-1">BazaarX Quality Assurance</p>
              </div>
              {/* QR code placeholder */}
              <div className="w-16 h-16 bg-white rounded-lg p-1 flex-shrink-0">
                <div className="w-full h-full bg-emerald-100 rounded flex items-center justify-center">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 text-emerald-800">
                    <rect x="2" y="2" width="12" height="12" fill="currentColor" rx="1" />
                    <rect x="26" y="2" width="12" height="12" fill="currentColor" rx="1" />
                    <rect x="2" y="26" width="12" height="12" fill="currentColor" rx="1" />
                    <rect x="16" y="16" width="8" height="8" fill="currentColor" rx="1" />
                    <rect x="28" y="28" width="8" height="8" fill="currentColor" rx="1" />
                    <rect x="16" y="28" width="8" height="4" fill="currentColor" rx="1" />
                    <rect x="28" y="16" width="8" height="4" fill="currentColor" rx="1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex gap-8 mt-4 relative z-10">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">Verification ID</p>
                <p className="font-bold text-sm">#QC-2847</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">Batch ID</p>
                <p className="font-bold text-sm">BATCH-PWR-2026-A0142</p>
              </div>
            </div>
          </div>

          {/* Product Metadata */}
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Product Metadata</h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Product Name</p>
                  <p className="text-sm font-semibold text-gray-800">{productName || 'PowerMax Pro 20000mAh Power Bank'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Store className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Seller</p>
                  <p className="text-sm font-semibold text-gray-800">{sellerName || 'TechGear Solutions'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">QC Date</p>
                  <p className="text-sm font-semibold text-gray-800">March 4, 2026</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Quality Checker</p>
                  <p className="text-sm font-semibold text-gray-800">QC-Agent-047</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gap Analysis + Durability — side by side landscape */}
          <div className="grid grid-cols-2 gap-0">
            {/* Gap Analysis */}
            <div className="p-5 border-r border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-gray-800">Gap Analysis: Claimed vs. Verified</h3>
              </div>
              <div className="space-y-2">
                {[
                  { claimed: '20,000mAh Battery Capacity', verified: '18,500mAh', note: '(Acceptable Variance: -7.5%)', pass: true },
                  { claimed: 'Fast Charging (18W)', verified: '✓ Confirmed: 18.2W', note: '', pass: true },
                  { claimed: 'Dual USB Output', verified: '✓ Confirmed', note: '', pass: true },
                ].map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-2.5">
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Claimed</p>
                      <p className="text-xs font-semibold text-red-800">{item.claimed}</p>
                    </div>
                    <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Verified</p>
                      <p className="text-xs font-semibold text-emerald-800">{item.verified}</p>
                      {item.note && <p className="text-[10px] text-emerald-600 mt-0.5">{item.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Durability Score */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-gray-800">Durability Score</h3>
              </div>
              <div className="space-y-2">
                {[
                  { test: 'Drop Test (3x from 1m height)', result: 'PASS - No visible damage, all functions operational' },
                  { test: 'Charging Cycle Test (10 cycles)', result: 'PASS - Consistent performance, no degradation' },
                  { test: 'Temperature Test (0-45°C)', result: 'PASS - Safe operation across temperature range' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-800">{item.test}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.result}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sample watermark */}
          <div className="bg-amber-50 border-t border-amber-200 px-5 py-3 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Sample QA Result — For Demonstration Only</span>
          </div>
        </div>

        {/* Download button */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <Button
            onClick={handleDownload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 h-10 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all gap-2"
          >
            <Download className="w-4 h-4" />
            Download Result
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== SAMPLE QA RESULT — END ==========
