# CRM & Marketing Admin — Modern SaaS Redesign Plan

## Executive Summary

Redesign the `/admin/crm` page from a basic CRUD table layout into a modern, sleek SaaS-grade CRM & Marketing hub inspired by **Shopee Seller Center**, **Lazada Seller Center**, **Mailchimp**, **HubSpot**, and **Klaviyo**. Maintain BazaarX branding (`#D97706` amber/gold) while delivering a professional, intuitive experience with real usability in every feature.

---

## 1. Architecture & Tech Stack

| Layer | Current | After Redesign |
|-------|---------|----------------|
| **UI Framework** | shadcn/ui (partial) | shadcn/ui (full — Card, Badge, Tabs, Table, Tooltip, Progress, Sheet, DropdownMenu, Popover) |
| **Animations** | framer-motion (basic) | framer-motion (micro-interactions, stagger, page transitions) |
| **Charts** | None | Recharts (AreaChart, BarChart, PieChart built from Supabase data) |
| **Icons** | lucide-react | lucide-react (expanded set) |
| **State** | Zustand `adminCRMStore` | Same store — extend with analytics queries |
| **AI** | None | Qwen API for AI campaign content generation |
| **Layout** | Single 850-line monolith | Modular — 1 parent + 5 tab components |

---

## 2. Design Principles (Shopee/Lazada/Klaviyo-Inspired)

### Visual Language
- **Dashboard-first**: Analytics overview on landing (like Shopee Seller Center home)
- **Card-based layouts**: Replace raw HTML tables with shadcn Card + Table combos
- **Soft depth**: `shadow-sm` to `shadow-md` cards floating on `bg-slate-50/80` body
- **Pill navigation**: shadcn Tabs component with animated underline indicator
- **Status badges**: shadcn Badge with semantic color (green=active, amber=scheduled, red=error)
- **Metric cards**: Big numbers with trend arrows (↑12%, ↓3%) like Lazada analytics
- **Empty states**: Illustration + helpful CTA (not just gray text)
- **Skeletons**: Loading shimmer instead of spinner

### Branding Anchors
- Header gradient: `from-amber-600 via-amber-500 to-orange-400` (brand palette)
- Accent: amber-500 for primary buttons, amber-50 for hover backgrounds
- Text: slate-900 headlines, slate-500 secondary, slate-400 muted

---

## 3. Tab-by-Tab Redesign

### 3.1 Overview / Analytics (NEW — Default Landing Tab)

**Inspiration**: Shopee Seller Center dashboard, Mailchimp reports

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  KPI Cards Row (4 cards)                                │
│  [Total Buyers] [Campaigns Sent] [Open Rate] [Revenue]  │
├─────────────────────────────────────────────────────────┤
│  [Email Performance Chart]     │  [Campaign Status Pie] │
│  (Recharts AreaChart 30-day)   │  (Donut chart)         │
├─────────────────────────────────────────────────────────┤
│  [Recent Campaigns List]       │  [Top Segments]        │
│  (5 latest with status badges) │  (sorted by buyer_cnt) │
├─────────────────────────────────────────────────────────┤
│  [Active Automations]          │  [Quick Actions]       │
│  (running workflows)           │  (CTA buttons)         │
└─────────────────────────────────────────────────────────┘
```

**KPI Cards**: 
- Total Segments → count + trend
- Total Campaigns → count + active/draft breakdown
- Emails Sent → sum across campaigns + delivery rate %
- Active Workflows → count + enabled vs total

### 3.2 Buyer Segments

**Inspiration**: Shopee targeted audience, Klaviyo segments

**Improvements over current**:
1. **Segment Builder**: Visual filter builder (not just name/description)
   - Filter criteria: `total_orders`, `total_spent`, `last_order_date`, `city`, `signup_date`  
   - Rule groups: AND/OR combinators
   - Live "Estimated buyers" count preview
2. **Segment Cards View**: Toggle between table and card grid
3. **Quick Segment Presets**: Pre-built segments (High-Value, New Buyers, Inactive 30d, Repeat Buyers)
4. **Segment Detail Sheet**: Side panel showing member list preview when clicking a segment

**Form fields**:
- Name, Description
- Filter rules (dynamic rule builder)  
- Type: Dynamic (auto-refresh) / Static (snapshot)

### 3.3 Marketing Campaigns

**Inspiration**: Lazada marketing center, Mailchimp campaign builder

**Improvements**:
1. **Campaign Cards**: Card layout with status badges, sent/delivery stats inline
2. **Multi-step campaign wizard** (Sheet/Dialog):
   - Step 1: Name + Type (Email/SMS/Multi)
   - Step 2: Select audience (segment picker)
   - Step 3: Select or create template  
   - Step 4: AI content generation with Qwen
   - Step 5: Schedule or send immediately
3. **AI Content Generator**: Button "✨ Generate with AI" → calls Qwen API to draft subject+body from campaign context
4. **Campaign Status Pipeline**: Visual kanban or status bar (Draft → Scheduled → Sending → Sent)
5. **A/B Testing placeholder**: Subject line A vs B (future)

### 3.4 Email Templates

**Improvements**:
1. **Template Gallery**: Card grid with preview thumbnail
2. **Platform Templates Section**: Existing 8 templates styled as full cards with categories
3. **Saved Templates Section**: DB templates with active/inactive toggle
4. **Template Preview**: Full HTML preview in a modal with device-frame toggle (Desktop/Mobile)
5. **Quick Apply**: One-click to jump to campaign creation with template pre-loaded

### 3.5 Automation Workflows  

**Inspiration**: Klaviyo flows, HubSpot workflows

**Improvements**:
1. **Visual flow cards**: Each workflow shows trigger → delay → action as a mini-flowchart
2. **Workflow Builder Sheet**: Side panel with:
   - Trigger Selector (event-based dropdown)
   - Channel Checkboxes (Email | SMS | Push)
   - Delay config (minutes, hours, days)
   - Template Selection
3. **Status indicators**: Green pulse dot for enabled, gray for disabled
4. **Performance metrics**: Sent count, delivery rate per workflow
5. **Pre-built workflows**: "Post-Purchase Follow-up", "Abandoned Cart", "Welcome Series"

---

## 4. AI Integration (Qwen API)

**Use Cases**:
1. **Campaign Content Generation**: Input: campaign name, target segment, goal → Output: subject line + email body
2. **Segment Name Suggestions**: AI suggests segment names from filter criteria
3. **Subject Line Optimizer**: Generate 3 subject line variants ranked by predicted open rate

**Implementation**:
```typescript
// Call Qwen via edge function or direct API
const generateCampaignContent = async (prompt: string) => {
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: 'You are a marketing copywriter for BazaarX, a Philippine marketplace. Write engaging, professional email campaign content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });
  return response.json();
};
```

---

## 5. File Structure (Modular Breakdown)

```
web/src/pages/AdminCRM.tsx                     ← Main page (shell + tabs)
web/src/components/admin/crm/
  ├── CRMOverview.tsx                          ← Analytics dashboard tab
  ├── CRMSegments.tsx                          ← Buyer segments tab  
  ├── CRMCampaigns.tsx                         ← Campaigns tab
  ├── CRMTemplates.tsx                         ← Templates gallery tab
  ├── CRMAutomation.tsx                        ← Automation workflows tab
  ├── SegmentBuilderDialog.tsx                 ← Segment filter builder modal
  ├── CampaignWizardSheet.tsx                  ← Multi-step campaign creator
  ├── WorkflowBuilderSheet.tsx                 ← Workflow creation sheet
  ├── AIContentGenerator.tsx                   ← Qwen-powered content tool
  ├── CampaignCard.tsx                         ← Reusable campaign card
  ├── TemplatePreviewDialog.tsx                ← HTML preview modal
  └── KPICard.tsx                              ← Metric card with trend
web/src/stores/admin/adminCRMStore.ts          ← Extend with analytics
```

---

## 6. Implementation Order

### Phase 1: Core Redesign (This PR)
1. ✅ Create modular file structure
2. ✅ Redesign AdminCRM.tsx as shell with shadcn Tabs
3. ✅ Build CRMOverview with KPI cards + chart placeholders
4. ✅ Redesign CRMSegments with improved table + builder dialog
5. ✅ Redesign CRMCampaigns with cards + wizard
6. ✅ Redesign CRMTemplates as gallery
7. ✅ Redesign CRMAutomation with visual flow cards
8. ✅ Add AI content generation with Qwen
9. ✅ Verify all existing functionality preserved

### Phase 2: Advanced (Future)
- Recharts integration for real analytics
- A/B testing
- SMS provider integration
- Push notification scheduling
- Segment auto-refresh cron

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Keep all 5 tabs | Maps to Shopee/Lazada CRM structure |
| Move Analytics to first tab | Dashboard-first pattern — SaaS standard |
| Card layouts over tables | Better visual hierarchy, mobile-friendly |
| Sheet for builders | Side panels feel faster than full-page navigations |
| AI as enhancement, not required | Content gen is optional — forms still work manually |
| Preserve existing store | No API changes — pure UI refactor with store extensions |

---

## 8. Branding Reference

```css
--brand-primary: #D97706;     /* amber-600 */
--brand-primary-dark: #B45309; /* amber-700 */
--brand-accent: #E58C1A;      /* warm amber */
--brand-accent-light: #FDE8C8; /* amber-50ish */
```

All components use these CSS variables for consistency. shadcn components get amber accent via className overrides.

---

## 9. No Breaking Changes

- All existing CRUD operations preserved
- Same Zustand store, same Supabase queries
- Same route `/admin/crm` with same auth guard
- Existing campaign templates kept intact
- Modal-based create/edit/delete flows preserved (upgraded to Sheet for builders)
