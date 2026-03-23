-- ---------------------------------------------------------------------------
-- Migration 025: Rebrand BazaarPH → BazaarX in all email templates
-- ---------------------------------------------------------------------------

-- Update all occurrences of "BazaarPH" in HTML body content
UPDATE public.email_templates
SET
  html_body  = REPLACE(html_body, 'BazaarPH', 'BazaarX'),
  updated_at = NOW()
WHERE html_body LIKE '%BazaarPH%';

-- Update any occurrences in subject lines
UPDATE public.email_templates
SET
  subject    = REPLACE(subject, 'BazaarPH', 'BazaarX'),
  updated_at = NOW()
WHERE subject LIKE '%BazaarPH%';

-- Update name field
UPDATE public.email_templates
SET
  name       = REPLACE(name, 'BazaarPH', 'BazaarX'),
  updated_at = NOW()
WHERE name LIKE '%BazaarPH%';
