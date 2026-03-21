import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ToggleLeft,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useAdminAuth } from '../stores/adminStore';
import { useAdminNotifications, type NotificationSetting, type EmailLog, type SMSLog } from '../stores/admin/adminNotificationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 15;

const EVENT_LABELS: Record<string, string> = {
  order_placed: 'Order Placed',
  order_confirmed: 'Order Confirmed',
  order_shipped: 'Order Shipped',
  order_delivered: 'Order Delivered',
  order_cancelled: 'Order Cancelled',
  order_ready_to_ship: 'Ready to Ship',
  order_out_for_delivery: 'Out for Delivery',
  order_failed_delivery: 'Failed Delivery',
  order_returned: 'Order Returned',
  payment_received: 'Payment Received',
  payment_failed: 'Payment Failed',
  refund_processed: 'Refund Processed',
  partial_refund: 'Partial Refund',
  digital_receipt: 'Digital Receipt',
  welcome: 'Welcome Email',
  marketing_blast: 'Marketing Blast',
  abandoned_cart: 'Abandoned Cart',
  password_reset: 'Password Reset',
};

const CHANNEL_META: Record<string, { icon: React.ReactNode; label: string; badge: string }> = {
  email: { icon: <Mail className="w-4 h-4" />, label: 'Email', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  sms:   { icon: <Smartphone className="w-4 h-4" />, label: 'SMS', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  push:  { icon: <Bell className="w-4 h-4" />, label: 'Push', badge: 'bg-purple-50 text-purple-700 border border-purple-200' },
};

const STATUS_BADGE: Record<string, { icon: React.ReactNode; color: string }> = {
  sent:      { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-green-700 bg-green-50 border border-green-200' },
  delivered: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-green-700 bg-green-50 border border-green-200' },
  failed:    { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-700 bg-red-50 border border-red-200' },
  bounced:   { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-700 bg-red-50 border border-red-200' },
  pending:   { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-700 bg-amber-50 border border-amber-200' },
  queued:    { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-700 bg-amber-50 border border-amber-200' },
  disabled:  { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-gray-500 bg-gray-100 border border-gray-200' },
};

export default function AdminNotificationSettings() {
  const { isAuthenticated } = useAdminAuth();
  const {
    settings, emailLogs, smsLogs, loading, logsLoading, error,
    fetchSettings, toggleSetting, bulkToggleChannel, seedDefaults,
    fetchEmailLogs, fetchSMSLogs,
  } = useAdminNotifications();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'settings' | 'email_logs' | 'sms_logs'>('settings');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);

  useEffect(() => {
    fetchSettings();
    fetchEmailLogs(200);
    fetchSMSLogs(200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  // Group settings by event_type
  const eventTypes = [...new Set(settings.map((s) => s.event_type))];
  const channels = ['email', 'sms', 'push'] as const;

  const getSettingFor = (event: string, channel: string): NotificationSetting | undefined =>
    settings.find((s) => s.event_type === event && s.channel === channel);

  const handleToggle = async (setting: NotificationSetting) => {
    await toggleSetting(setting.id, !setting.is_enabled);
    toast({
      title: `${setting.channel.toUpperCase()} ${!setting.is_enabled ? 'enabled' : 'disabled'}`,
      description: `${EVENT_LABELS[setting.event_type] || setting.event_type} notifications via ${setting.channel}`,
    });
  };

  const handleBulkToggle = async (channel: string, enabled: boolean) => {
    await bulkToggleChannel(channel, enabled);
    toast({
      title: `All ${channel.toUpperCase()} ${enabled ? 'enabled' : 'disabled'}`,
    });
  };

  const channelEnabled = (ch: string) => {
    const chSettings = settings.filter((s) => s.channel === ch);
    return chSettings.length > 0 && chSettings.every((s) => s.is_enabled);
  };

  // Logs filtering & pagination
  const currentLogs: (EmailLog | SMSLog)[] = activeTab === 'email_logs' ? emailLogs : smsLogs;
  const filteredLogs = logSearch
    ? currentLogs.filter(
        (l) =>
          ('recipient_email' in l && l.recipient_email?.toLowerCase().includes(logSearch.toLowerCase())) ||
          ('recipient_phone' in l && l.recipient_phone?.toLowerCase().includes(logSearch.toLowerCase())) ||
          l.event_type.toLowerCase().includes(logSearch.toLowerCase()) ||
          l.status.toLowerCase().includes(logSearch.toLowerCase()),
      )
    : currentLogs;
  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const pagedLogs = filteredLogs.slice((logPage - 1) * ITEMS_PER_PAGE, logPage * ITEMS_PER_PAGE);

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        {/* ── Page Header ── */}
        <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Notification Settings</h1>
              <p className="text-amber-100 text-sm mt-0.5">
                Manage email, SMS, and push notification channels per transaction event.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {channels.map((ch) => (
                <span key={ch} className="flex items-center gap-1.5 bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {CHANNEL_META[ch].icon} {CHANNEL_META[ch].label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-6">

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit shadow-sm">
            {([
              { key: 'settings',   label: 'Channel Toggles', icon: <Bell className="w-4 h-4" /> },
              { key: 'email_logs', label: 'Email Logs',       icon: <Mail className="w-4 h-4" /> },
              { key: 'sms_logs',   label: 'SMS Logs',         icon: <MessageSquare className="w-4 h-4" /> },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key as typeof activeTab); setLogPage(1); setLogSearch(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--brand-accent-light)]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <XCircle className="w-10 h-10 text-red-400" />
                  <p className="text-sm text-red-600 font-medium">Failed to load settings</p>
                  <p className="text-xs text-red-400 max-w-md text-center">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchSettings}>Retry</Button>
                </div>
              ) : settings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Bell className="w-10 h-10 text-gray-300" />
                  <p className="text-sm text-[var(--text-secondary)] font-medium">No notification settings configured yet</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-md text-center">
                    Initialize default settings for all email, SMS, and push notification events.
                    You can toggle each one individually after initialization.
                  </p>
                  <Button
                    onClick={async () => {
                      await seedDefaults();
                      toast({ title: 'Defaults initialized', description: 'All notification channels have been configured with default settings.' });
                    }}
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
                  >
                    Initialize Default Settings
                  </Button>
                </div>
              ) : (
                <>
                  {/* Master toggles */}
                  <div className="flex flex-wrap items-center gap-4 px-6 py-4 bg-[var(--brand-accent-light)]/40 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <ToggleLeft className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span className="text-sm font-semibold text-[var(--text-headline)]">Master Toggles:</span>
                    </div>
                    {channels.map((ch) => (
                      <label key={ch} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[var(--brand-primary)] transition-colors">
                        <Switch
                          checked={channelEnabled(ch)}
                          onCheckedChange={(val) => handleBulkToggle(ch, val)}
                        />
                        <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-headline)]">
                          {CHANNEL_META[ch].icon} {CHANNEL_META[ch].label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Grid */}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wider">Event</th>
                        {channels.map((ch) => (
                          <th key={ch} className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wider">
                            <span className="flex items-center justify-center gap-1.5">
                              {CHANNEL_META[ch].icon} {CHANNEL_META[ch].label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {eventTypes.map((event) => (
                        <motion.tr
                          key={event}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-[var(--text-headline)]">
                              {EVENT_LABELS[event] || event}
                            </span>
                          </td>
                          {channels.map((ch) => {
                            const setting = getSettingFor(event, ch);
                            return (
                              <td key={ch} className="px-6 py-4 text-center">
                                {setting ? (
                                  <Switch
                                    checked={setting.is_enabled}
                                    onCheckedChange={() => handleToggle(setting)}
                                  />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            );
                          })}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* Logs Tabs */}
          {(activeTab === 'email_logs' || activeTab === 'sms_logs') && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 border-gray-200 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                    placeholder={`Search ${activeTab === 'email_logs' ? 'email' : 'SMS'} logs...`}
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => activeTab === 'email_logs' ? fetchEmailLogs(200) : fetchSMSLogs(200)}
                  disabled={logsLoading}
                  className="border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-accent-light)]"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Table */}
              {logsLoading ? (
                <div className="flex justify-center items-center py-20">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Recipient</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Event</th>
                        {activeTab === 'email_logs' && (
                          <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Subject</th>
                        )}
                        <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pagedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                            No logs found.
                          </td>
                        </tr>
                      ) : (
                        pagedLogs.map((log) => {
                          const badge = STATUS_BADGE[log.status] || STATUS_BADGE.pending;
                          return (
                            <motion.tr
                              key={log.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-3 text-sm">
                                {'recipient_email' in log ? (log as EmailLog).recipient_email : (log as SMSLog).recipient_phone}
                              </td>
                              <td className="px-6 py-3 text-sm">
                                {EVENT_LABELS[log.event_type] || log.event_type}
                              </td>
                              {activeTab === 'email_logs' && (
                                <td className="px-6 py-3 text-sm text-[var(--text-secondary)] max-w-xs truncate">
                                  {(log as EmailLog).subject}
                                </td>
                              )}
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                                  {badge.icon}
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-sm text-[var(--text-muted)]">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalLogPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <span className="text-sm text-[var(--text-muted)]">
                        Showing {(logPage - 1) * ITEMS_PER_PAGE + 1}–
                        {Math.min(logPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={logPage >= totalLogPages} onClick={() => setLogPage((p) => p + 1)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
