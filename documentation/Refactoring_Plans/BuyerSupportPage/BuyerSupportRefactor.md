# BuyerSupport Refactor Notes

## Scope

- Extracted the ticket modal into a standalone component.
- Extracted service card and chat chip UI elements into standalone components.

## Files Added

- web/src/components/BuyerTicketModal.tsx
- web/src/components/SupportServiceCard.tsx
- web/src/components/SupportChatChip.tsx

## Files Updated

- web/src/pages/BuyerSupport.tsx

## Behavioral Notes

- No state or handler logic moved; the page still owns all state.
- UI structure and styling are unchanged; only component boundaries changed.

## Follow-up Ideas

- Consider moving shared support UI components into a dedicated folder (e.g. web/src/components/support/).
- If required, add unit tests for the modal props and open/close behavior.
