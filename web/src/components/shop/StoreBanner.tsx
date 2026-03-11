import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';

interface StoreBannerProps {
  campaign: {
    id: string;
    name: string;
    badgeText?: string;
    badgeColor?: string;
    discountType: string;
    maxDiscountAmount?: number;
    endsAt: Date | string;
  };
  products?: any[];
}

const CountdownTimer = ({ endsAt }: { endsAt: string }) => {
  const [timeLeft, setTimeLeft] = React.useState({ h: '00', m: '00', s: '00' });

  React.useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ h: '00', m: '00', s: '00' });
      setTimeLeft({
        h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <div className="flex items-center gap-1 font-mono text-white font-bold text-lg">
      <span className="bg-white/20 rounded px-1.5 py-0.5">{timeLeft.h}</span>
      <span className="opacity-60">:</span>
      <span className="bg-white/20 rounded px-1.5 py-0.5">{timeLeft.m}</span>
      <span className="opacity-60">:</span>
      <span className="bg-white/20 rounded px-1.5 py-0.5">{timeLeft.s}</span>
    </div>
  );
};

export const StoreBanner: React.FC<StoreBannerProps> = ({ campaign, products = [] }) => {
  const badgeColor = campaign.badgeColor || '#DC2626';
  const badgeText = campaign.badgeText || 'SALE';
  const endsAtStr = typeof campaign.endsAt === 'string' ? campaign.endsAt : campaign.endsAt.toISOString();
  const discountLabel =
    campaign.discountType === 'percentage'
      ? `Up to ${campaign.discountValue}% off`
      : `₱${campaign.discountValue} off`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden shadow-lg mb-6 flex flex-col"
      style={{ background: `linear-gradient(135deg, ${badgeColor}, ${badgeColor}dd)` }}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 md:px-8 py-5 md:py-6">
        <div className="flex items-center gap-3 text-white">
          <Zap className="h-6 w-6 fill-white" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg uppercase tracking-wide">{badgeText}</span>
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {campaign.name}
              </span>
            </div>
            <p className="text-white/80 text-sm font-medium mt-0.5">
              {discountLabel}
              {campaign.maxDiscountAmount ? ` (max ₱${Number(campaign.maxDiscountAmount).toLocaleString()})` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-white">
          <Clock className="h-4 w-4 text-white/70" />
          <span className="text-xs font-bold uppercase text-white/70 tracking-wider">Ends in</span>
          <CountdownTimer endsAt={endsAtStr} />
        </div>
      </div>

      {products.length > 0 && (
        <div className="px-6 md:px-8 pb-6">
          <h4 className="text-white/90 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" /> Eligible Products
          </h4>
          <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-2 snap-x">
            {products.map(product => (
              <div 
                key={product.id} 
                className="snap-start shrink-0 w-32 md:w-40 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group flex flex-col"
                onClick={() => window.location.href = `/product/${product.id}`}
              >
                <div className="relative aspect-square">
                  <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                  <div className="absolute top-2 left-2 bg-[#DC2626] text-white px-1.5 py-0.5 rounded text-[10px] font-black uppercase shadow-sm">
                    {product.discountBadgePercent}% OFF
                  </div>
                </div>
                <div className="p-2.5 flex flex-col flex-1 bg-white">
                  <h5 className="text-xs font-bold text-gray-900 line-clamp-1 mb-1 group-hover:text-[var(--brand-primary)]">{product.name}</h5>
                  <div className="mt-auto flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-sm font-black text-[#DC2626]">₱{product.price.toLocaleString()}</span>
                    {(product.originalPrice || 0) > product.price && (
                      <span className="text-[10px] text-gray-400 line-through">₱{product.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StoreBanner;
