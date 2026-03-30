import { useEffect, useState } from 'react';
import { Info, Tag, AlertTriangle, Wrench, ExternalLink, Bell, Megaphone } from 'lucide-react';
import { SellerWorkspaceLayout } from '@/components/seller/SellerWorkspaceLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Announcement, AnnouncementType } from './AdminAnnouncementsPage';

// ─── Type display metadata ────────────────────────────────────────────────────
const TYPE_META: Record<AnnouncementType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}> = {
  info:        { label: 'Announcement', icon: <Info className="w-4 h-4" />,          color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  promo:       { label: 'Promotion',    icon: <Tag className="w-4 h-4" />,            color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  urgent:      { label: 'Urgent',       icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  maintenance: { label: 'Maintenance',  icon: <Wrench className="w-4 h-4" />,        color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
};

async function fetchSellerAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .in('audience', ['all', 'sellers'])
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function SellerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSellerAnnouncements()
      .then(setAnnouncements)
      .catch(err => setError(err?.message ?? 'Failed to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SellerWorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* BG blobs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-4 md:p-8 flex-1 overflow-auto relative z-10 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[var(--text-headline)] font-heading tracking-tight">
                  Announcements
                </h1>
                <p className="text-sm text-[var(--text-muted)]">Platform updates, promotions, and notices from BazaarPH</p>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-2/3 mt-1" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            ) : announcements.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-700">No announcements right now</p>
                <p className="text-sm text-gray-400 mt-1">Check back later for platform updates</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map(ann => {
                  const meta = TYPE_META[ann.type];
                  return (
                    <article
                      key={ann.id}
                      className={cn(
                        'bg-white rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md',
                        ann.type === 'urgent' ? 'border-red-200' : 'border-gray-100'
                      )}
                    >
                      {/* Top row: type badge + date */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                          meta.bg, meta.color, meta.border
                        )}>
                          {meta.icon}
                          {meta.label}
                        </span>
                        <time className="text-xs text-gray-400">
                          {new Date(ann.created_at).toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </time>
                      </div>

                      {/* Optional image */}
                      {ann.image_url && (
                        <img loading="lazy" 
                          src={ann.image_url}
                          alt={ann.title}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}

                      {/* Title */}
                      <h2 className="text-base font-bold text-gray-900 mb-1.5">{ann.title}</h2>

                      {/* Message */}
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{ann.message}</p>

                      {/* Expiry notice */}
                      {ann.expires_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          Valid until {new Date(ann.expires_at).toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </p>
                      )}

                      {/* Action button */}
                      {ann.action_url && (
                        <a
                          href={ann.action_url}
                          target={ann.action_url.startsWith('http') ? '_blank' : undefined}
                          rel="noreferrer"
                          className={cn(
                            'inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            meta.bg, meta.color, 'hover:opacity-80'
                          )}
                        >
                          Learn More
                          {ann.action_url.startsWith('http') && <ExternalLink className="w-3.5 h-3.5" />}
                        </a>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </SellerWorkspaceLayout>
  );
}

export default SellerAnnouncementsPage;
