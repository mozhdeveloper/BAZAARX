import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface KPICardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  suffix?: string;
  description?: string;
}

export function KPICard({ label, value, icon, trend, suffix = '', description }: KPICardProps) {
  const trendColor = !trend || trend === 0 ? 'text-slate-400' : trend > 0 ? 'text-emerald-600' : 'text-red-500';
  const TrendIcon = !trend || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="p-5 hover:shadow-md transition-shadow border-slate-200/80 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-600">{icon}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight">
        {value.toLocaleString()}{suffix}
      </p>
      <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
      {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
    </Card>
  );
}
