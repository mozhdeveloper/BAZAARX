**Role:** Act as a Lead Full Stack Developer with deep expertise in frontend frameworks (React/React Native/Next.js), performance optimization, and Supabase backend architecture.

**Context:** We are building an e-commerce platform (a Shopee clone). We have just blown past our Supabase Free Tier Egress limit, hitting 9.38GB (188% of our 5GB limit). However, our Monthly Active Users (MAU) is only 69, our Database size is a tiny 52MB, and our Storage is only 47MB. 

**The Problem:** Because our user base and database size are so small, this massive egress data drain indicates a severe architectural leak on the frontend. We are likely dealing with unpaginated queries, severe over-fetching of data/images, or an infinite rendering loop causing continuous network requests.

**Your Task:**
1. **Diagnose:** Review our current data-fetching logic, starting with the main product feed, category pages, and cart components. Identify any of the following:
   - Infinite loops (e.g., missing or incorrect dependency arrays in `useEffect` or state updates triggering re-renders).
   - Unpaginated database queries fetching the entire catalog.
   - Over-fetching database columns (using `select('*')` instead of explicitly naming required fields).
   - Unoptimized image loading (fetching massive full-resolution images for grid thumbnails without caching).

2. **Fix & Refactor:** Rewrite the problematic data-fetching code to meet production standards. You must:
   - Implement pagination or infinite scrolling limits (e.g., `.range()`) for all product grids.
   - Explicitly define only the required columns in Supabase queries (e.g., `.select('id, title, price, thumbnail_url')`).
   - Fix any component lifecycle bugs causing redundant API calls.

3. **Explain:** Break down exactly what the root cause of the data drain was and explain how your refactored code solves it, just as a Lead Developer would explain it to their team during a code review.

**Next Steps:** Please acknowledge this briefing and ask me to provide or point you to the specific files related to our product feed rendering and Supabase API services so you can begin the audit.