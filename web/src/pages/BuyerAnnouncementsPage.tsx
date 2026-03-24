import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Info, Tag, AlertTriangle, Wrench, ExternalLink, Bell, ChevronLeft } from 'lucide-react';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
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

async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .in('audience', ['all', 'buyers'])
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

const BuyerAnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveAnnouncements()
      .then(setAnnouncements)
      .catch(err => setError(err?.message ?? 'Failed to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-6 pb-16">
        <div className="max-w-3xl mx-auto px-4">

          {/* Back nav */}
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm mb-5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
              <p className="text-sm text-gray-500">Platform updates, promotions, and notices from BazaarPH</p>
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
            <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">No announcements right now</p>
              <p className="text-sm text-gray-400 mt-1">Check back later for updates from BazaarPH</p>
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
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                        meta.bg, meta.color, meta.border, 'border'
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
      </main>
      <BazaarFooter />
    </>
  );
};

export default BuyerAnnouncementsPage;
