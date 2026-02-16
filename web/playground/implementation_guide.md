# General Implementation and Refactoring Guide

This guide outlines best practices for implementation and refactoring, based on principles applied in recent codebase improvements.

## 1. Component Architecture & Granularity

**Principle:** Break down complex interfaces into small, focused, and reusable components.

*   **Decomposition:** Instead of monolithic components (e.g., a massive `VariantManager`), extract logical sections into sub-components (e.g., `VariantList`, `VariantForm`, `VariantItem`).
*   **Isolation:** Each component should have a single responsibility. This makes the code easier to read, test, and maintain.
*   **Shared Props:** Define shared interfaces (e.g., in a `types.ts` file) so that parent and child components communicate with clear contracts.

## 2. Schema-Driven Development

**Principle:** Align frontend state and logic directly with the database schema.

*   **Consistent Naming:** Use field names that mirror the database columns where possible (e.g., `variant_label_1`, `option_1_value`).
    *   *Avoid:* Creating ad-hoc frontend aliases unless necessary for specific UI requirements.
    *   *Do:* Update service methods and stores to handle schema fields natively.
*   **Normalization:** If the database is normalized, the frontend data structures should reflect that structure to minimize transformation overhead and bugs.

## 3. Centralized Data Mapping

**Principle:** Isolate data transformation logic into dedicated utility files.

*   **Single Source of Truth:** Create a centralized mapper (e.g., `productMapper.ts`) to handle conversions between Database format, Application/Store format, and API format.
*   **Decoupling:** Components and Stores should not contain complex inline mapping logic. They should consume the output of the mapper.
*   **Legacy Support:** When migrating schemas, use the mapper to handle backward compatibility (e.g., falling back to legacy fields like `size`/`color` if new fields are empty) without polluting the core application logic.

## 4. System-Wide Refactoring & Naming Migrations

**Principle:** When renaming core concepts, perform a comprehensive, codebase-wide migration.

*   **Completeness:** Don't just rename in one file. Trace the usage across:
    *   **Stores & State:** ensuring internal data structures are updated.
    *   **Services:** ensuring API payloads use the new names.
    *   **UI Components:** ensuring props and display logic match.
    *   **Types/Interfaces:** updating TypeScript definitions to catch errors.
*   **Search & Replace:** Use global search to find all instances of legacy terms (e.g., `colors`, `sizes`) and replace them systematically.
*   **Verification:** Verify that third-party integrations (e.g., AI services, Registry operations) are also updated to understand the new terminology.

## 5. User Experience (UX) & Validation

**Principle:** Provide immediate, clear feedback to the user.

*   **Inline Validation:** Display errors directly next to the field that caused them (e.g., below the input), rather than just a generic global error.
*   **Real-time Feedback:** Use visual cues for state changes (e.g., stock counters, "Unsaved" badges, live previews).
*   **Guards:** Prevent invalid actions before they happen (e.g., disabling submission if stock is not fully allocated).
*   **Visual Consistency:** Use consistent styling for similar elements (e.g., removing distracting borders, using standard error colors).

## 6. Testing & Documentation

**Principle:** Document changes clearly and verify them with a structured checklist.

*   **Pull Request Descriptions:**
    *   **Summary:** Briefly explain *what* and *why*.
    *   **Changes:** List specific file changes and feature additions.
    *   **Testing Checklist:** Provide a concrete list of manual tests performed (e.g., "Tab switching works", "Stock allocation validation blocks submission"). This proves that the refactor didn't break existing functionality.
*   **Granular Commits:** Structure commits to reflect logical steps (e.g., one commit for component extraction, one for schema alignment, one for naming migration).

## Summary

By following these practices, we ensure that the codebase remains:
*   **Maintainable:** Smaller components and meaningful naming.
*   **Robust:** Type-safe interfaces and centralized logic.
*   **Align:** Frontend and Backend stay in sync.
*   **User-Friendly:** Predictable and helpful UI.
