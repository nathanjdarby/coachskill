-- Built-in type for "Start a call now" (admin only, 30 minutes, private video room).
INSERT OR IGNORE INTO `event_types` (`name`, `slug`, `duration_minutes`, `buffer_minutes`, `audience`, `location_mode`, `custom_url`, `colour`, `active`, `sort_order`, `created_at`, `updated_at`)
VALUES ('Quick call', 'quick-call', 30, NULL, 'admin_only', 'jitsi', NULL, '#f472b6', 1, 2, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);
