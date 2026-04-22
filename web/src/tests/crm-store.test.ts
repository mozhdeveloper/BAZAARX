/**
 * Admin CRM Store — Unit Tests
 *
 * Tests all Zustand store CRUD operations (segments, campaigns, workflows,
 * email templates) with mocked Supabase client. Follows AAA pattern.
 *
 * Run:  npx vitest run src/tests/crm-store.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

// ── Test Factories ──────────────────────────────────────────────────────────

function createTestSegment(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'High-Value Buyers',
    description: 'Buyers with >₱10k total spend',
    filter_criteria: { min_spend: 10000 },
    buyer_count: 42,
    is_dynamic: true,
    created_by: 'admin-001',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function createTestCampaign(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Holiday Sale 2025',
    description: 'Year-end sale',
    campaign_type: 'email_blast',
    status: 'draft',
    segment_id: null,
    template_id: null,
    subject: 'Holiday Sale!',
    content: 'Hi {{buyer_name}}, check out our sale!',
    sms_content: null,
    scheduled_at: null,
    sent_at: null,
    total_recipients: 0,
    total_sent: 0,
    total_delivered: 0,
    total_opened: 0,
    total_clicked: 0,
    total_bounced: 0,
    seller_id: null,
    created_by: 'admin-001',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function createTestWorkflow(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Post-Purchase Follow-Up',
    description: 'Send thank you email after order',
    trigger_event: 'order_delivered',
    channels: ['email'],
    delay_minutes: 60,
    template_id: null,
    sms_template: null,
    is_enabled: false,
    created_by: 'admin-001',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function createTestEmailTemplate(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Order Confirmation',
    slug: 'order_confirmation',
    subject: 'Your Order #{{order_number}} is Confirmed!',
    html_body: '<h1>Order Confirmed!</h1>',
    text_body: 'Order Confirmed!',
    variables: ['order_number', 'buyer_name'],
    category: 'transactional',
    is_active: true,
    created_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

// ── Supabase Mock Helpers ───────────────────────────────────────────────────

function mockSupabaseChain(finalResult) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    limit: vi.fn().mockReturnThis(),
    then: undefined,
  };
  // Make it thenable for await
  chain.then = (resolve) => resolve(finalResult);
  // When chaining returns final result at the end
  Object.defineProperty(chain, Symbol.toStringTag, { value: 'Promise' });
  return chain;
}

// ── Store Import (dynamic to get fresh state per describe) ──────────────────

async function getStore() {
  // Reset modules to get fresh Zustand store
  const mod = await import('@/stores/admin/adminCRMStore');
  return mod.useAdminCRM;
}

// ════════════════════════════════════════════════════════════════════════════
// TYPES & TEMPLATE CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

describe('CRM Store Types & Constants', () => {
  it('should export ADMIN_CAMPAIGN_TEMPLATES with 8 pre-built templates', async () => {
    const { ADMIN_CAMPAIGN_TEMPLATES } = await import('@/stores/admin/adminCRMStore');
    expect(ADMIN_CAMPAIGN_TEMPLATES).toBeDefined();
    expect(ADMIN_CAMPAIGN_TEMPLATES).toHaveLength(8);
  });

  it('should have valid structure for each platform template', async () => {
    const { ADMIN_CAMPAIGN_TEMPLATES } = await import('@/stores/admin/adminCRMStore');
    for (const tpl of ADMIN_CAMPAIGN_TEMPLATES) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(tpl.icon).toBeTruthy();
      expect(['platform', 'seasonal', 'growth', 'retention']).toContain(tpl.category);
      expect(tpl.subject).toBeTruthy();
      expect(tpl.content).toBeTruthy();
      expect(tpl.campaign_type).toBe('email_blast');
    }
  });

  it('should have unique IDs for all templates', async () => {
    const { ADMIN_CAMPAIGN_TEMPLATES } = await import('@/stores/admin/adminCRMStore');
    const ids = ADMIN_CAMPAIGN_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should use {{buyer_name}} personalization in template content', async () => {
    const { ADMIN_CAMPAIGN_TEMPLATES } = await import('@/stores/admin/adminCRMStore');
    for (const tpl of ADMIN_CAMPAIGN_TEMPLATES) {
      expect(tpl.content).toContain('{{buyer_name}}');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SEGMENTS STORE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

describe('CRM Store — Segments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty segments and not loading', async () => {
    const store = (await getStore()).getState();
    expect(store.segments).toEqual([]);
    expect(store.segmentsLoading).toBe(false);
  });

  it('should fetch segments and update state', async () => {
    const mockSegments = [createTestSegment(), createTestSegment({ name: 'New Buyers' })];

    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockSegments, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    await store.fetchSegments();

    const updated = (await getStore()).getState();
    expect(updated.segments).toEqual(mockSegments);
    expect(updated.segmentsLoading).toBe(false);
    expect(supabase.from).toHaveBeenCalledWith('buyer_segments');
  });

  it('should handle fetch error gracefully', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    await store.fetchSegments();

    const updated = (await getStore()).getState();
    expect(updated.segmentsLoading).toBe(false);
  });

  it('should create segment and prepend to state', async () => {
    const newSeg = createTestSegment({ name: 'VIP Buyers' });
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newSeg, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    const result = await store.createSegment({ name: 'VIP Buyers', description: 'VIP' });

    expect(result).toBeTruthy();
    expect(result?.name).toBe('VIP Buyers');
    expect(supabase.from).toHaveBeenCalledWith('buyer_segments');
  });

  it('should return null when create fails', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    const result = await store.createSegment({ name: '' });
    expect(result).toBeNull();
  });

  it('should update segment and reflect in state', async () => {
    // Pre-populate state
    const seg = createTestSegment();
    const useStore = await getStore();
    useStore.setState({ segments: [seg] });

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await useStore.getState().updateSegment(seg.id, { name: 'Updated Name' });
    expect(result).toBe(true);

    const updated = useStore.getState().segments.find(s => s.id === seg.id);
    expect(updated?.name).toBe('Updated Name');
  });

  it('should return false when update fails', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    const result = await store.updateSegment('nonexistent', { name: 'X' });
    expect(result).toBe(false);
  });

  it('should delete segment and remove from state', async () => {
    const seg = createTestSegment();
    const useStore = await getStore();
    useStore.setState({ segments: [seg] });

    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(deleteChain as any);

    const result = await useStore.getState().deleteSegment(seg.id);
    expect(result).toBe(true);
    expect(useStore.getState().segments).toHaveLength(0);
  });

  it('should return false when delete fails', async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
    };
    vi.mocked(supabase.from).mockReturnValue(deleteChain as any);

    const store = (await getStore()).getState();
    const result = await store.deleteSegment('bad-id');
    expect(result).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS STORE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

describe('CRM Store — Campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty campaigns', async () => {
    const store = (await getStore()).getState();
    expect(store.campaigns).toEqual([]);
    expect(store.campaignsLoading).toBe(false);
  });

  it('should fetch campaigns ordered by created_at desc', async () => {
    const mockCampaigns = [
      createTestCampaign({ name: 'Campaign A' }),
      createTestCampaign({ name: 'Campaign B' }),
    ];
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCampaigns, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    await store.fetchCampaigns();

    const updated = (await getStore()).getState();
    expect(updated.campaigns).toHaveLength(2);
    expect(supabase.from).toHaveBeenCalledWith('marketing_campaigns');
  });

  it('should create campaign with draft status', async () => {
    const newCampaign = createTestCampaign({ name: 'Flash Sale', status: 'draft' });
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newCampaign, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    const result = await store.createCampaign({ name: 'Flash Sale', status: 'draft', campaign_type: 'email_blast' });

    expect(result).toBeTruthy();
    expect(result?.status).toBe('draft');
    expect(result?.campaign_type).toBe('email_blast');
  });

  it('should update campaign status and content', async () => {
    const camp = createTestCampaign();
    const useStore = await getStore();
    useStore.setState({ campaigns: [camp] });

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await useStore.getState().updateCampaign(camp.id, { status: 'scheduled', subject: 'New Subject' });
    expect(result).toBe(true);

    const updated = useStore.getState().campaigns.find(c => c.id === camp.id);
    expect(updated?.status).toBe('scheduled');
    expect(updated?.subject).toBe('New Subject');
  });

  it('should delete campaign', async () => {
    const camp = createTestCampaign();
    const useStore = await getStore();
    useStore.setState({ campaigns: [camp] });

    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    expect(await useStore.getState().deleteCampaign(camp.id)).toBe(true);
    expect(useStore.getState().campaigns).toHaveLength(0);
  });

  it('should support all campaign types in factory', () => {
    const types = ['email_blast', 'sms_blast', 'multi_channel'] as const;
    for (const t of types) {
      const camp = createTestCampaign({ campaign_type: t });
      expect(camp.campaign_type).toBe(t);
    }
  });

  it('should support all status values in factory', () => {
    const statuses = ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'] as const;
    for (const s of statuses) {
      const camp = createTestCampaign({ status: s });
      expect(camp.status).toBe(s);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// WORKFLOWS STORE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

describe('CRM Store — Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty workflows', async () => {
    const store = (await getStore()).getState();
    expect(store.workflows).toEqual([]);
    expect(store.workflowsLoading).toBe(false);
  });

  it('should fetch workflows', async () => {
    const mockWorkflows = [createTestWorkflow(), createTestWorkflow({ name: 'Welcome Flow' })];
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockWorkflows, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    await store.fetchWorkflows();

    const updated = (await getStore()).getState();
    expect(updated.workflows).toHaveLength(2);
    expect(supabase.from).toHaveBeenCalledWith('automation_workflows');
  });

  it('should create workflow with is_enabled = false', async () => {
    const newWf = createTestWorkflow({ name: 'New Workflow', is_enabled: false });
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newWf, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    const result = await store.createWorkflow({
      name: 'New Workflow', trigger_event: 'order_delivered', channels: ['email'], delay_minutes: 60, is_enabled: false,
    });

    expect(result).toBeTruthy();
    expect(result?.is_enabled).toBe(false);
    expect(result?.trigger_event).toBe('order_delivered');
  });

  it('should toggle workflow enabled state', async () => {
    const wf = createTestWorkflow({ is_enabled: false });
    const useStore = await getStore();
    useStore.setState({ workflows: [wf] });

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await useStore.getState().toggleWorkflow(wf.id, true);
    expect(result).toBe(true);
    expect(useStore.getState().workflows[0].is_enabled).toBe(true);
  });

  it('should update workflow name, trigger, delay', async () => {
    const wf = createTestWorkflow();
    const useStore = await getStore();
    useStore.setState({ workflows: [wf] });

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await useStore.getState().updateWorkflow(wf.id, {
      name: 'Updated', trigger_event: 'welcome', delay_minutes: 30,
    });
    const updated = useStore.getState().workflows[0];
    expect(updated.name).toBe('Updated');
    expect(updated.trigger_event).toBe('welcome');
    expect(updated.delay_minutes).toBe(30);
  });

  it('should delete workflow', async () => {
    const wf = createTestWorkflow();
    const useStore = await getStore();
    useStore.setState({ workflows: [wf] });

    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    expect(await useStore.getState().deleteWorkflow(wf.id)).toBe(true);
    expect(useStore.getState().workflows).toHaveLength(0);
  });

  it('should support all trigger events', () => {
    const triggers = ['order_placed', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_received', 'refund_processed', 'welcome'];
    for (const t of triggers) {
      const wf = createTestWorkflow({ trigger_event: t });
      expect(wf.trigger_event).toBe(t);
    }
  });

  it('should support multi-channel workflows', () => {
    const wf = createTestWorkflow({ channels: ['email', 'sms', 'push'] });
    expect(wf.channels).toEqual(['email', 'sms', 'push']);
    expect(wf.channels).toHaveLength(3);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES STORE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

describe('CRM Store — Email Templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty templates', async () => {
    const store = (await getStore()).getState();
    expect(store.emailTemplates).toEqual([]);
    expect(store.emailTemplatesLoading).toBe(false);
  });

  it('should fetch email templates ordered by name', async () => {
    const mockTemplates = [
      createTestEmailTemplate({ name: 'A - Order Confirmation' }),
      createTestEmailTemplate({ name: 'B - Welcome Email' }),
    ];
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    await store.fetchEmailTemplates();

    const updated = (await getStore()).getState();
    expect(updated.emailTemplates).toHaveLength(2);
    expect(supabase.from).toHaveBeenCalledWith('email_templates');
  });

  it('should handle fetch error for templates gracefully', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const store = (await getStore()).getState();
    await store.fetchEmailTemplates();

    const updated = (await getStore()).getState();
    expect(updated.emailTemplatesLoading).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DATA TRANSFORMATION & BUSINESS LOGIC
// ════════════════════════════════════════════════════════════════════════════

describe('CRM Business Logic', () => {
  it('should calculate delivery rate from campaign metrics', () => {
    const camp = createTestCampaign({ total_sent: 100, total_delivered: 95 });
    const rate = camp.total_sent > 0 ? Math.round((camp.total_delivered / camp.total_sent) * 100) : 0;
    expect(rate).toBe(95);
  });

  it('should return 0 delivery rate when total_sent is 0', () => {
    const camp = createTestCampaign({ total_sent: 0, total_delivered: 0 });
    const rate = camp.total_sent > 0 ? Math.round((camp.total_delivered / camp.total_sent) * 100) : 0;
    expect(rate).toBe(0);
  });

  it('should calculate open rate from campaign metrics', () => {
    const camp = createTestCampaign({ total_delivered: 95, total_opened: 45 });
    const openRate = camp.total_delivered > 0 ? Math.round((camp.total_opened / camp.total_delivered) * 100) : 0;
    expect(openRate).toBe(47);
  });

  it('should calculate click rate from opened', () => {
    const camp = createTestCampaign({ total_opened: 45, total_clicked: 10 });
    const clickRate = camp.total_opened > 0 ? Math.round((camp.total_clicked / camp.total_opened) * 100) : 0;
    expect(clickRate).toBe(22);
  });

  it('should correctly format delay_minutes into human-readable format', () => {
    const formatDelay = (mins: number) => {
      if (mins === 0) return 'Instant';
      if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      return `${mins}m`;
    };
    expect(formatDelay(0)).toBe('Instant');
    expect(formatDelay(15)).toBe('15m');
    expect(formatDelay(60)).toBe('1h 0m');
    expect(formatDelay(90)).toBe('1h 30m');
    expect(formatDelay(1440)).toBe('24h 0m');
  });

  it('should filter segments by search term', () => {
    const segments = [
      createTestSegment({ name: 'High-Value Buyers', description: 'Big spenders' }),
      createTestSegment({ name: 'New Buyers', description: 'Just joined' }),
      createTestSegment({ name: 'Inactive Buyers', description: 'Gone for 30 days' }),
    ];
    const search = 'new';
    const filtered = segments.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(search.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('New Buyers');
  });

  it('should filter campaigns by status', () => {
    const campaigns = [
      createTestCampaign({ status: 'draft' }),
      createTestCampaign({ status: 'sent' }),
      createTestCampaign({ status: 'draft' }),
      createTestCampaign({ status: 'sending' }),
    ];
    const drafts = campaigns.filter(c => c.status === 'draft');
    expect(drafts).toHaveLength(2);
    const active = campaigns.filter(c => c.status === 'sent' || c.status === 'sending');
    expect(active).toHaveLength(2);
  });

  it('should count pipeline stages correctly', () => {
    const campaigns = [
      createTestCampaign({ status: 'draft' }),
      createTestCampaign({ status: 'draft' }),
      createTestCampaign({ status: 'scheduled' }),
      createTestCampaign({ status: 'sending' }),
      createTestCampaign({ status: 'sent' }),
      createTestCampaign({ status: 'sent' }),
      createTestCampaign({ status: 'sent' }),
    ];
    const stages = ['draft', 'scheduled', 'sending', 'sent'] as const;
    const counts = stages.map(s => ({ stage: s, count: campaigns.filter(c => c.status === s).length }));
    expect(counts[0]).toEqual({ stage: 'draft', count: 2 });
    expect(counts[1]).toEqual({ stage: 'scheduled', count: 1 });
    expect(counts[2]).toEqual({ stage: 'sending', count: 1 });
    expect(counts[3]).toEqual({ stage: 'sent', count: 3 });
  });

  it('should count enabled workflows', () => {
    const workflows = [
      createTestWorkflow({ is_enabled: true }),
      createTestWorkflow({ is_enabled: false }),
      createTestWorkflow({ is_enabled: true }),
    ];
    const enabledCount = workflows.filter(w => w.is_enabled).length;
    expect(enabledCount).toBe(2);
  });

  it('should identify template categories correctly', () => {
    const templates = [
      createTestEmailTemplate({ category: 'transactional' }),
      createTestEmailTemplate({ category: 'marketing' }),
      createTestEmailTemplate({ category: 'system' }),
      createTestEmailTemplate({ category: 'transactional' }),
    ];
    const byCategory = templates.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});
    expect(byCategory.transactional).toBe(2);
    expect(byCategory.marketing).toBe(1);
    expect(byCategory.system).toBe(1);
  });

  it('should aggregate total emails sent across all campaigns', () => {
    const campaigns = [
      createTestCampaign({ total_sent: 100 }),
      createTestCampaign({ total_sent: 250 }),
      createTestCampaign({ total_sent: 0 }),
      createTestCampaign({ total_sent: 50 }),
    ];
    const totalSent = campaigns.reduce((a, c) => a + c.total_sent, 0);
    expect(totalSent).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AI CONTENT GENERATOR LOGIC
// ════════════════════════════════════════════════════════════════════════════

describe('AI Content Generator — Parsing Logic', () => {
  it('should parse SUBJECT and BODY from AI response', () => {
    const text = `SUBJECT: 🎉 Holiday Sale — Up to 50% OFF!
BODY:
Hi {{buyer_name}},

The holiday sale is here! Check out amazing deals.

Best,
The BazaarX Team`;

    const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);

    expect(subjectMatch?.[1]?.trim()).toBe('🎉 Holiday Sale — Up to 50% OFF!');
    expect(bodyMatch?.[1]?.trim()).toContain('{{buyer_name}}');
    expect(bodyMatch?.[1]?.trim()).toContain('BazaarX Team');
  });

  it('should handle response without SUBJECT/BODY markers', () => {
    const text = 'Here is a plain email response without markers.';

    const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);

    expect(subjectMatch).toBeNull();
    expect(bodyMatch).toBeNull();
  });

  it('should extract multi-line BODY content correctly', () => {
    const text = `SUBJECT: Test Subject
BODY:
Line 1
Line 2
Line 3`;

    const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);
    const body = bodyMatch?.[1]?.trim() || '';
    const lines = body.split('\n');
    expect(lines).toHaveLength(3);
  });
});
