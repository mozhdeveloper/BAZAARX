import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import ProductCard from '../ProductCard';

interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: any[];
  actionLabel?: string;
  actionLink?: string;
  onActionClick?: () => void;
  isFlash?: boolean;
  countdownEndDate?: Date;
}

const FlashCountdown = ({ endDate }: { endDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = endDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-2 my-4">
      <span className="text-sm font-semibold text-red-600 uppercase tracking-wider">Ends in</span>
      <div className="flex gap-1">
        {[
          { val: timeLeft.hours, label: 'h' },
          { val: timeLeft.minutes, label: 'm' },
          { val: timeLeft.seconds, label: 's' },
        ].map(({ val, label }) => (
          <div key={label} className="bg-red-600 text-white rounded-md px-2 py-1 text-center min-w-[40px]">
            <span className="text-lg font-bold font-mono">{pad(val)}</span>
            <span className="text-[10px] ml-0.5 uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductRail: React.FC<ProductRailProps> = ({
  title,
  subtitle,
  products,
  actionLabel = "View All",
  actionLink,
  onActionClick,
  isFlash,
  countdownEndDate
}) => {
  return (
    <section className="py-20 bg-transparent overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left Side: Product Cards (Appears second on mobile) */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  isFlash={isFlash}
                />
              ))}
            </div>
          </div>

          {/* Right Side: Descriptive Content (Appears first on mobile) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-4 order-1 lg:order-2 mb-8 lg:mb-0"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text-headline)] mb-6 tracking-tight">
                {title}
              </h2>
            </motion.div>
            {subtitle && (
              <p className="text-xl text-[var(--text-primary)] mb-8 leading-relaxed font-medium">
                {subtitle}
              </p>
            )}

            {countdownEndDate && <FlashCountdown endDate={countdownEndDate} />}

            <Link
              to={actionLink || "#"}
              onClick={(e) => {
                if (!actionLink) {
                  e.preventDefault();
                  onActionClick?.();
                }
              }}
              className="group flex items-center gap-2 text-[var(--text-headline)] font-medium text-lg hover:text-[var(--brand-primary)] transition-colors mt-6"
            >
              <span className="transition-all">{actionLabel}</span>
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="group-hover:translate-x-1 transition-transform"
              >
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </Link>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default ProductRail;