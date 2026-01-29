# BAZAARX Testing Infrastructure Guide

This directory contains the automated test suite for the BAZAARX web application. We use a hybrid testing strategy to ensure both robust logic and smooth user flows.

## 🏗️ Folder Structure

```text
src/tests/
├── unit/                   # Unit tests for services and business logic (Jest)
│   ├── services/           # Service-specific test suites
│   ├── mocks/              # Mock data and infrastructure mocks
│   │   ├── data/           # Static data fixtures (products, sellers, etc.)
│   │   └── supabase.mock.ts # Supabase client and query builder mocks
│   └── setup.ts            # Global Jest configuration and mocks
├── buyer-seller-flow.test.ts # E2E Integration test for the main marketplace flow (Vitest)
└── pos-order-flow.test.ts    # E2E Integration test for the POS system (Vitest)
```

## 🎯 Purpose of Components

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Unit Tests** | [Jest](https://jestjs.io/) | Fast, isolated testing of individual services (e.g., `ProductService`). Mocks all external dependencies. |
| **Flow Tests** | [Vitest](https://vitest.dev/) | Integration/E2E tests that verify complex interactions between multiple stores (Zustand) and state transitions. |
| **Mocks** | Custom | Modularized mock data and Supabase helpers to ensure tests are deterministic and independent of the live database. |

## 🚀 How to Run Tests

All tests can be executed via `npm` scripts:

### Running Unit Tests (Jest)
```bash
npm run test          # Run all unit tests
npm run test:watch    # Run in watch mode
npm run test:coverage # Generate coverage report
```

### Running Flow Tests (Vitest)
```bash
npm run vitest:all    # Run all integration tests
npm run vitest:ui     # Launch Vitest UI for interactive debugging
```

## 🛠️ How to Extend

### 1. Adding a New Service Test
1. Create a new file in `src/tests/unit/services/[ServiceName].test.ts`.
2. Import `[ServiceName]` and use `jest.mock('@/lib/supabase')` (or rely on the global mock in `setup.ts`).
3. Use the utilities in `mocks/supabase.mock.ts` to simulate database responses.

### 2. Adding Mock Data
1. Add new data fixtures to the appropriate file in `src/tests/unit/mocks/data/`.
2. Export them from `src/tests/unit/mocks/data/index.ts` for easy access.

### 3. Creating a New Flow Test
1. Create a `*.test.ts` file in `src/tests/`.
2. Import `describe, it, expect` from `vitest`.
3. Use the Zustand store hooks directly to simulate user actions and verify state.
