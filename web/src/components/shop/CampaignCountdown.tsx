import React from 'react';
import { useCampaignCountdown } from '../../hooks/useCampaignCountdown';

interface CampaignCountdownProps {
    endsAt: string | null;
    variant?: 'default' | 'large' | 'banner';
}

export const CampaignCountdown: React.FC<CampaignCountdownProps> = ({ endsAt, variant = 'default' }) => {
    const { hours, minutes, seconds, isEnded } = useCampaignCountdown(endsAt);
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (isEnded && variant === 'banner') return <span>Ended</span>;
    if (isEnded) return <span className="text-sm font-bold text-gray-500">Campaign Ended</span>;

    if (variant === 'banner') {
        return (
            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '1.1rem', letterSpacing: '0.1em' }}>
                {pad(hours)}:{pad(minutes)}:{pad(seconds)}
            </span>
        );
    }

    if (variant === 'large') {
        return (
            <div className="flex items-center gap-3">
                <div className="bg-white px-6 py-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center min-w-[90px]">
                    <span className="text-4xl font-black text-[var(--price-flash)] font-mono tracking-tighter leading-none">{pad(hours)}</span>
                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Hrs</span>
                </div>
                <span className="text-2xl font-black text-[var(--price-flash)] mb-7 opacity-30">:</span>
                <div className="bg-white px-6 py-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center min-w-[90px]">
                    <span className="text-4xl font-black text-[var(--price-flash)] font-mono tracking-tighter leading-none">{pad(minutes)}</span>
                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Mins</span>
                </div>
                <span className="text-2xl font-black text-[var(--price-flash)] mb-7 opacity-30">:</span>
                <div className="bg-white px-6 py-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center min-w-[90px]">
                    <span className="text-4xl font-black text-[var(--price-flash)] font-mono tracking-tighter leading-none">{pad(seconds)}</span>
                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Secs</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" /></svg>
            <div className="flex items-center gap-1.5 font-bold font-mono text-base">
                <div className="bg-[#EA580C] text-white rounded-md w-8 h-8 flex items-center justify-center shadow-inner">{pad(hours)}</div>
                <span className="text-[#EA580C] text-lg leading-none pb-0.5">:</span>
                <div className="bg-[#EA580C] text-white rounded-md w-8 h-8 flex items-center justify-center shadow-inner">{pad(minutes)}</div>
                <span className="text-[#EA580C] text-lg leading-none pb-0.5">:</span>
                <div className="bg-[#EA580C] text-white rounded-md w-8 h-8 flex items-center justify-center shadow-inner">{pad(seconds)}</div>
            </div>
        </div>
    );
};