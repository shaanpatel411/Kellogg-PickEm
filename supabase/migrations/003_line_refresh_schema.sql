-- Add columns to support weekly line refresh syncing

alter table public.games
  add column broadcast_network text,
  add column kickoff_slot text check (kickoff_slot in ('thu_night', 'sun_early', 'sun_late', 'sun_night', 'mon_night', 'other'));

alter table public.weeks
  add column lines_snapshot_at timestamptz;
