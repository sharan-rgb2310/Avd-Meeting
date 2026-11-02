create table if not exists public.meeting_reminders (
  meeting_id text not null references public.meetings(id) on delete cascade,
  scheduled_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (meeting_id, scheduled_at)
);

alter table public.meeting_reminders enable row level security;
revoke all on public.meeting_reminders from public, anon, authenticated;

create index if not exists meeting_reminders_sent_at_idx
  on public.meeting_reminders(sent_at desc);
