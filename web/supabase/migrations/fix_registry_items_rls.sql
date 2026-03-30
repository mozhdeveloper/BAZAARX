-- Fix RLS policy for registry_items to allow access when registry privacy is 'link' or 'public'
-- This allows shared registry pages to display products for link-only registries

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Enable read access for public registries" ON registry_items;
DROP POLICY IF EXISTS "Allow public access to registry items" ON registry_items;
DROP POLICY IF EXISTS "Allow access to registry items for link/public registries" ON registry_items;

-- Create new policy that allows SELECT when parent registry has privacy 'link' or 'public'
CREATE POLICY "Allow access to registry items for link/public registries"
ON registry_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM registries
    WHERE registries.id = registry_items.registry_id
    AND registries.privacy IN ('link', 'public')
  )
);

-- Verify the policy was created
COMMENT ON POLICY "Allow access to registry items for link/public registries" ON registry_items IS 
  'Allows anyone to read registry items when the registry privacy is link-only or public';
