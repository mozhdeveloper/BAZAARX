/* eslint-disable @typescript-eslint/no-explicit-any, react-refresh/only-export-components */
import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '../stores/adminStore';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Megaphone, Users, ShoppingBag, AlertTriangle, Info, Tag, Wrench } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AnnouncementType = 'info' | 'promo' | 'urgent' | 'maintenance';
export type AnnouncementAudience = 'all' | 'buyers' | 'sellers';

export interface Announcement {
  id: string;
  admin_id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  image_url?: string | null;
  action_url?: string | null;
  action_data?: any;
  is_active: boolean;
  scheduled_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateAnnouncementPayload {
  title: string;
  message: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  image_url?: string;
  action_url?: string;
  expires_at?: string;
}

// ─── Announcement Service ─────────────────────────────────────────────────

export const announcementService = {
  /** Fetch all announcements ordered newest-first */
  async list(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Create a new announcement and fan-out to buyer/seller notification inboxes */
  async create(adminId: string, payload: CreateAnnouncementPayload): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .insert({ admin_id: adminId, ...payload })
      .select()
      .single();
    if (error) throw error;
    const ann: Announcement = data;

    // Fan-out to per-user notification inboxes in the background
    announcementService.fanOut(ann).catch(err =>
      console.error('[Announcements] fan-out error:', err)
    );

    return ann;
  },

  /** Toggle is_active on an announcement */
  async toggleActive(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  /** Delete an announcement */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Fan-out: bulk-insert rows into buyer_notifications and/or seller_notifications
   * so every buyer/seller sees the announcement in their notification inbox.
   */
  async fanOut(ann: Announcement): Promise<void> {
    const shouldNotifyBuyers = ann.audience === 'all' || ann.audience === 'buyers';
    const shouldNotifySellers = ann.audience === 'all' || ann.audience === 'sellers';

    if (shouldNotifyBuyers) {
      const { data: buyers, error: bErr } = await supabase
        .from('buyers')
        .select('id');
      if (bErr) throw bErr;

      if (buyers && buyers.length > 0) {
        const rows = buyers.map(b => ({
          buyer_id: b.id,
          type: 'announcement',
          title: ann.title,
          message: ann.message,
          action_url: ann.action_url ?? null,
          action_data: { announcement_id: ann.id, announcement_type: ann.type },
          priority: ann.type === 'urgent' ? 'urgent' : ann.type === 'maintenance' ? 'high' : 'normal',
        }));

        // Insert in batches of 500 to avoid payload limits
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase
            .from('buyer_notifications')
            .insert(rows.slice(i, i + 500));
          if (error) console.error('[Announcements] buyer fan-out batch error:', error);
        }
      }
    }

    if (shouldNotifySellers) {
      const { data: sellers, error: sErr } = await supabase
        .from('sellers')
        .select('id');
      if (sErr) throw sErr;

      if (sellers && sellers.length > 0) {
        const rows = sellers.map(s => ({
          seller_id: s.id,
          type: 'announcement',
          title: ann.title,
          message: ann.message,
          action_url: ann.action_url ?? null,
          action_data: { announcement_id: ann.id, announcement_type: ann.type },
          priority: ann.type === 'urgent' ? 'urgent' : ann.type === 'maintenance' ? 'high' : 'normal',
        }));

        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase
            .from('seller_notifications')
            .insert(rows.slice(i, i + 500));
          if (error) console.error('[Announcements] seller fan-out batch error:', error);
        }
      }
    }
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<AnnouncementType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  info: { label: 'Info', color: 'text-blue-700', bg: 'bg-blue-100', icon: <Info className="w-4 h-4" /> },
  promo: { label: 'Promo', color: 'text-green-700', bg: 'bg-green-100', icon: <Tag className="w-4 h-4" /> },
  urgent: { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-100', icon: <AlertTriangle className="w-4 h-4" /> },
  maintenance: { label: 'Maintenance', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: <Wrench className="w-4 h-4" /> },
};

const AUD_META: Record<AnnouncementAudience, { label: string; icon: React.ReactNode }> = {
  all: { label: 'Everyone', icon: <Bell className="w-3.5 h-3.5" /> },
  buyers: { label: 'Buyers', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  sellers: { label: 'Sellers', icon: <Users className="w-3.5 h-3.5" /> },
};

// ─── Component ───────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateAnnouncementPayload = {
  title: '',
  message: '',
  type: 'info',
  audience: 'all',
  image_url: '',
  action_url: '',
  expires_at: '',
};

const AdminAnnouncementsPage: React.FC = () => {
  const { user } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAnnouncementPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await announcementService.list();
      setAnnouncements(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Create ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { setError('Admin session not found'); return; }
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateAnnouncementPayload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        audience: form.audience,
        ...(form.image_url?.trim() && { image_url: form.image_url.trim() }),
        ...(form.action_url?.trim() && { action_url: form.action_url.trim() }),
        ...(form.expires_at?.trim() && { expires_at: new Date(form.expires_at).toISOString() }),
      };
      await announcementService.create(user.id, payload);
      setSuccessMsg('Announcement created and sent to all users!');
      setForm(EMPTY_FORM);
      setShowForm(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      load();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (ann: Announcement) => {
    setTogglingId(ann.id);
    try {
      await announcementService.toggleActive(ann.id, !ann.is_active);
      setAnnouncements(prev =>
        prev.map(a => a.id === ann.id ? { ...a, is_active: !a.is_active } : a)
      );
    } catch (err: any) {
      setError(err?.message ?? 'Failed to toggle announcement');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await announcementService.remove(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete announcement');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-6 mb-2">
            <div className="flex items-center gap-3">
              <Megaphone className="w-6 h-6 text-[var(--brand-primary)]" />
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-1">Announcements</h1>
                <p className="text-[var(--text-muted)]">Send platform-wide notifications to buyers and sellers</p>
              </div>
            </div>
            <button
              onClick={() => { setShowForm(v => !v); setError(null); }}
              className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Announcement
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {successMsg}
            </div>
          )}

          {/* Create Form */}
          {showForm && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Announcement</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value as AnnouncementType }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {(Object.keys(TYPE_META) as AnnouncementType[]).map(t => (
                        <option key={t} value={t}>{TYPE_META[t].label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Audience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                    <select
                      value={form.audience}
                      onChange={e => setForm(f => ({ ...f, audience: e.target.value as AnnouncementAudience }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {(Object.keys(AUD_META) as AnnouncementAudience[]).map(a => (
                        <option key={a} value={a}>{AUD_META[a].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Scheduled maintenance on Dec 25"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe the announcement in detail…"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Action URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Action URL (optional)</label>
                    <input
                      type="url"
                      value={form.action_url}
                      onChange={e => setForm(f => ({ ...f, action_url: e.target.value }))}
                      placeholder="https://bazaarph.com/..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Expires at */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (optional)</label>
                    <input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {submitting ? 'Sending…' : 'Create & Notify Users'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); }}
                    className="border text-gray-600 hover:bg-gray-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Announcements List */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                All Announcements
                {!loading && (
                  <span className="ml-2 text-sm text-gray-400 font-normal">({announcements.length})</span>
                )}
              </h2>
              <button onClick={load} className="text-xs text-gray-500 hover:text-gray-700 underline">Refresh</button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : announcements.length === 0 ? (
              <div className="p-12 text-center">
                <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No announcements yet. Create your first one!</p>
              </div>
            ) : (
              <ul className="divide-y">
                {announcements.map(ann => {
                  const typeMeta = TYPE_META[ann.type];
                  const audMeta = AUD_META[ann.audience];
                  const isExpired = ann.expires_at ? new Date(ann.expires_at) < new Date() : false;

                  return (
                    <li key={ann.id} className={`px-6 py-4 flex gap-4 ${!ann.is_active || isExpired ? 'opacity-60' : ''}`}>
                      {/* Type badge icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${typeMeta.bg} ${typeMeta.color} flex items-center justify-center`}>
                        {typeMeta.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeMeta.bg} ${typeMeta.color}`}>
                            {typeMeta.icon} {typeMeta.label}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {audMeta.icon} {audMeta.label}
                          </span>
                          {!ann.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">Inactive</span>
                          )}
                          {isExpired && ann.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">Expired</span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm truncate">{ann.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{ann.message}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                          <span>Created {new Date(ann.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          {ann.expires_at && (
                            <span>Expires {new Date(ann.expires_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          )}
                          {ann.action_url && (
                            <a href={ann.action_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate max-w-xs">
                              {ann.action_url}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggle(ann)}
                          disabled={togglingId === ann.id}
                          title={ann.is_active ? 'Deactivate' : 'Activate'}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40"
                        >
                          {ann.is_active
                            ? <ToggleRight className="w-5 h-5 text-green-500" />
                            : <ToggleLeft className="w-5 h-5" />
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          disabled={deletingId === ann.id}
                          title="Delete"
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementsPage;
