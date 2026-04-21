import { Users, Megaphone, Workflow, Send, Target, BarChart3, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { KPICard } from './KPICard';
import type { BuyerSegment, MarketingCampaign, AutomationWorkflow } from '@/stores/admin/adminCRMStore';

interface CRMOverviewProps {
  segments: BuyerSegment[];
  campaigns: MarketingCampaign[];
  workflows: AutomationWorkflow[];
  onNavigateTab: (tab: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-50 text-blue-700',
  sending: 'bg-amber-50 text-amber-700',
  sent: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-orange-50 text-orange-700',
  cancelled: 'bg-red-50 text-red-700',
};

const PIE_COLORS = ['#D97706', '#059669', '#3B82F6', '#8B5CF6', '#EF4444', '#6B7280'];

export function CRMOverview({ segments, campaigns, workflows, onNavigateTab }: CRMOverviewProps) {
  const totalSent = campaigns.reduce((a, c) => a + c.total_sent, 0);
  const totalDelivered = campaigns.reduce((a, c) => a + c.total_delivered, 0);
  const totalOpened = campaigns.reduce((a, c) => a + c.total_opened, 0);
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const openRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;

  // Build chart data from campaigns (last 7 campaigns or synthetic)
  const emailChartData = campaigns
    .filter(c => c.total_sent > 0)
    .slice(0, 7)
    .reverse()
    .map(c => ({
      name: c.name.slice(0, 15),
      sent: c.total_sent,
      delivered: c.total_delivered,
      opened: c.total_opened,
    }));

  // Status distribution for pie chart
  const statusMap = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Segments" value={segments.length} icon={<Users className="w-5 h-5" />} />
        <KPICard label="Campaigns" value={campaigns.length} icon={<Megaphone className="w-5 h-5" />} description={`${campaigns.filter(c => c.status === 'sent' || c.status === 'sending').length} active`} />
        <KPICard label="Emails Sent" value={totalSent} icon={<Send className="w-5 h-5" />} suffix="" description={`${deliveryRate}% delivery rate`} />
        <KPICard label="Active Workflows" value={workflows.filter(w => w.is_enabled).length} icon={<Workflow className="w-5 h-5" />} description={`of ${workflows.length} total`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Email Performance Chart */}
        <Card className="lg:col-span-2 p-5 border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Email Performance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Campaign delivery and engagement metrics</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Sent</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Delivered</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Opened</span>
            </div>
          </div>
          {emailChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={emailChartData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="sent" stroke="#D97706" fill="url(#colorSent)" strokeWidth={2} />
                <Area type="monotone" dataKey="delivered" stroke="#059669" fill="url(#colorDelivered)" strokeWidth={2} />
                <Area type="monotone" dataKey="opened" stroke="#3B82F6" fill="url(#colorOpened)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-slate-400">
              <BarChart3 className="w-8 h-8 mb-2" />
              <p className="text-sm">No campaign data yet</p>
              <Button size="sm" variant="outline" onClick={() => onNavigateTab('campaigns')} className="mt-2 text-xs">Create a Campaign</Button>
            </div>
          )}
        </Card>

        {/* Campaign Status Donut */}
        <Card className="p-5 border-slate-200/80">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Campaign Status</h3>
          <p className="text-xs text-slate-500 mb-3">Distribution by status</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
              <Target className="w-8 h-8 mb-2" />
              <p className="text-sm">No campaigns</p>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Campaigns */}
        <Card className="lg:col-span-2 p-5 border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent Campaigns</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('campaigns')} className="text-xs text-amber-700 hover:text-amber-900">View All</Button>
          </div>
          <div className="space-y-1">
            {campaigns.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No campaigns yet.</p>}
            {campaigns.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Megaphone className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500">{c.total_sent} sent</span>
                  <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[c.status] || ''}`}>{c.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions + Top Segments */}
        <div className="space-y-4">
          {/* Top Segments */}
          <Card className="p-5 border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Top Segments</h3>
              <Button variant="ghost" size="sm" onClick={() => onNavigateTab('segments')} className="text-xs text-amber-700 hover:text-amber-900">View All</Button>
            </div>
            {segments.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No segments yet.</p>}
            {[...segments].sort((a, b) => b.buyer_count - a.buyer_count).slice(0, 4).map(seg => (
              <div key={seg.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700 truncate">{seg.name}</span>
                <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">{seg.buyer_count} buyers</Badge>
              </div>
            ))}
          </Card>

          {/* Quick Actions */}
          <Card className="p-5 border-slate-200/80">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start text-xs" onClick={() => onNavigateTab('segments')}>
                <Users className="w-3.5 h-3.5 mr-2 text-amber-600" /> Create Segment
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start text-xs" onClick={() => onNavigateTab('campaigns')}>
                <Megaphone className="w-3.5 h-3.5 mr-2 text-amber-600" /> New Campaign
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start text-xs" onClick={() => onNavigateTab('automation')}>
                <Zap className="w-3.5 h-3.5 mr-2 text-amber-600" /> Add Automation
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Engagement Rates */}
      {campaigns.some(c => c.total_sent > 0) && (
        <Card className="p-5 border-slate-200/80">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Engagement Rates</h3>
          <p className="text-xs text-slate-500 mb-4">Overall performance across all campaigns</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-600 font-medium">Delivery Rate</span>
                <span className="text-slate-900 font-semibold">{deliveryRate}%</span>
              </div>
              <Progress value={deliveryRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-600 font-medium">Open Rate</span>
                <span className="text-slate-900 font-semibold">{openRate}%</span>
              </div>
              <Progress value={openRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-600 font-medium">Click Rate</span>
                <span className="text-slate-900 font-semibold">{totalDelivered > 0 ? Math.round((campaigns.reduce((a, c) => a + c.total_clicked, 0) / totalDelivered) * 100) : 0}%</span>
              </div>
              <Progress value={totalDelivered > 0 ? Math.round((campaigns.reduce((a, c) => a + c.total_clicked, 0) / totalDelivered) * 100) : 0} className="h-2" />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
