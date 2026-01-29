# Scripts Directory

This directory is located at `web/src/scripts` and is intended for standalone utility scripts and service testing logic.

## Purpose
- **Service Testing**: Test Supabase services (`productService`, `authService`, etc.) without launching the full web app.
- **Data Utilities**: Scripts to seed data, migrate content, or run bulk operations.
- **Debugging**: Quick "one-off" scripts to verify API responses or database state.

## How to Run Scripts

You should run these scripts from the `web` directory using `vite-node`. This ensures that your `.env` variables and TypeScript imports (like `@/lib/supabase`) work correctly.

### Run via vite-node
```bash
# From the /web directory:
npx vite-node src/scripts/your-script.ts
```

## Creating a new script
1. Create a file in this folder (e.g., `web/src/scripts/test-db.ts`).
2. Import the necessary services (e.g., `import { productService } from '../services/productService'`).
3. Run it using the command above.
