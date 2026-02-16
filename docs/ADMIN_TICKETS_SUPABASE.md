# Admin Ticketing: Supabase Wiring

## What changed

- Admin tickets page now loads support tickets from Supabase on mount and on Refresh.
- Admin replies are posted to Supabase `ticket_messages` and reflected in the UI conversation.
- Ticket status changes push to Supabase and are reflected locally.
- Added category filter, search (id/name/email/subject), and reverse-chronological sorting in the admin list.
- Conversation panel renders buyer message plus replies; internal notes are excluded.

## Relevant files

- web/src/pages/AdminTickets.tsx
- web/src/stores/supportStore.ts

## Data mapping

- DB status -> UI: `open` -> Open, `in_progress`/`waiting_response` -> In Review, `resolved` -> Resolved, `closed` -> Closed.
- UI status -> DB on update: Open -> `open`, In Review -> `in_progress`, Resolved -> `resolved`, Closed -> `closed`.
- Replies: inserts into `ticket_messages` with `sender_type='admin'` and `is_internal_note=false`; internal notes are ignored in UI.

## Usage

- Loading: page mount and the Refresh button call `loadTickets()` to pull from Supabase.
- Replying: write a response in the detail panel; it calls `sendAdminReply()` and appends to the thread.
- Status updates: buttons set status locally and push the mapped status to Supabase.

## Follow-ups

- If you want a distinct UI state for `waiting_response`, add a UI status and mapping.
- Hook pagination/filters to Supabase if the ticket volume grows.
- Add error toasts for fetch/update failures if desired.
