ALTER TABLE integrations.platform_settings
  ADD COLUMN IF NOT EXISTS twilio_parent_account_sid TEXT;
