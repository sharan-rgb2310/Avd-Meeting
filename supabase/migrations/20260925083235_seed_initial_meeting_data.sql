insert into public.profiles (id, email, name, role, status, department, title)
values
  ('usr_1', 'admin@avdynamics.com', 'Arun Kumar', 'Admin', 'Activated', 'Sales', 'Head of Revenue Operations'),
  ('usr_2', 'sarah@avdynamics.com', 'Sarah Parker', 'Team Member', 'Activated', 'Product', 'Product Designer'),
  ('usr_3', 'john@avdynamics.com', 'John Doe', 'Team Member', 'Invited', 'Engineering', 'Platform Engineer'),
  ('usr_4', 'maria@avdynamics.com', 'Maria Kim', 'Manager', 'Activated', 'Sales', 'Regional Sales Manager'),
  ('usr_5', 'david@avdynamics.com', 'David Wilson', 'Manager', 'Activated', 'Marketing', 'Growth Lead'),
  ('usr_6', 'jennifer@avdynamics.com', 'Jennifer Taylor', 'Viewer', 'Not Invited', 'HR', 'People Operations Partner'),
  ('usr_7', 'michael@avdynamics.com', 'Michael Lee', 'Team Member', 'Activated', 'IT', 'Infrastructure Engineer')
on conflict (id) do nothing;

insert into public.companies (id, name, industry, status, website, notes)
values
  ('cmp_1', 'ABC Technologies', 'Technology', 'Customer', 'abctech.com', 'Strategic account. Renewal review each quarter.'),
  ('cmp_2', 'XYZ Solutions', 'Financial Services', 'Active', 'xyzsolutions.com', 'Expanding into two more business units.'),
  ('cmp_3', 'Acme Corp', 'Manufacturing', 'Customer', 'acmecorp.com', 'Design system workshop scheduled with their product group.'),
  ('cmp_4', 'Global Tech', 'Technology', 'Active', 'globaltech.com', 'Bi-weekly product sync with their platform team.'),
  ('cmp_5', 'Zenith Inc', 'Financial Services', 'Prospect', 'zenithinc.com', 'Budget review moved to next week at their request.'),
  ('cmp_6', 'SecureIT', 'Security', 'Active', 'secureit.com', 'Annual compliance audit in progress.'),
  ('cmp_7', 'Bright Media', 'Media', 'Inactive', 'brightmedia.com', 'Paused engagement until the next campaign cycle.')
on conflict (id) do nothing;

insert into public.teams (id, name, department, lead_id, status, description)
values
  ('tm_1', 'Direct Sales North America', 'Sales', 'usr_4', 'Active', 'Owns enterprise pipeline and renewals across the US and Canada.'),
  ('tm_2', 'Mobile Experience', 'Product', 'usr_2', 'Active', 'Designs and ships the mobile meeting experience.'),
  ('tm_3', 'Platform Engineering', 'Engineering', 'usr_3', 'Active', 'Core services, integrations and developer tooling.'),
  ('tm_4', 'Corporate Finance & Reporting', 'Finance', 'usr_4', 'Active', 'Budgeting, forecasting and board reporting.'),
  ('tm_5', 'People Ops & Culture', 'HR', 'usr_6', 'Active', 'Hiring, onboarding and workplace programs.'),
  ('tm_6', 'IT Infrastructure', 'IT', 'usr_7', 'Active', 'Identity, endpoints and security compliance.'),
  ('tm_7', 'Growth Marketing', 'Marketing', 'usr_5', 'Active', 'Campaigns, demand generation and brand.')
on conflict (id) do nothing;

insert into public.meetings (id, ref, title, company_id, team_id, department, date, start_time, type, status, created_by, responsible_id, agenda, notes, decisions, action_items_text, remarks, reschedule_reason)
values
  ('mtg_1', 'MTG-001', 'Q3 Strategy Alignment', 'cmp_1', 'tm_1', 'Sales', '2026-09-25', '10:30', 'Virtual', 'In Progress', 'usr_1', 'usr_1', 'Review Q3 targets, pipeline coverage and the roadmap commitments for the next quarter.', 'Prepared updated sales deck and market analysis ahead of the call.', 'Align on Q3 targets and reallocate two engineers to the integrations track.', 'Send the revised Q3 target sheet\nShare the resourcing plan with Engineering', 'Pipeline coverage in the East region needs a closer look next week.', null),
  ('mtg_2', 'MTG-002', 'Customer Feedback Session', 'cmp_2', 'tm_2', 'Product', '2026-09-25', '14:00', 'Virtual', 'Scheduled', 'usr_2', 'usr_2', 'Walk through the latest onboarding research and prioritise the top three fixes.', 'Send the research summary 24 hours before the session.', '', '', '', null),
  ('mtg_3', 'MTG-003', 'Design System Workshop', 'cmp_3', 'tm_2', 'Product', '2026-09-26', '11:00', 'In Person', 'Scheduled', 'usr_2', 'usr_2', 'Audit component coverage and agree the token naming convention.', 'Bring printed component inventory.', '', '', '', null),
  ('mtg_4', 'MTG-004', 'Bi-Weekly Product Sync', 'cmp_4', 'tm_3', 'Engineering', '2026-09-28', '08:30', 'Virtual', 'Scheduled', 'usr_3', 'usr_3', 'Sprint review, integration status and blockers.', '', '', '', '', null),
  ('mtg_5', 'MTG-005', 'Budget Review - FY27 Q1', 'cmp_5', 'tm_4', 'Finance', '2026-09-30', '11:00', 'Hybrid', 'Rescheduled', 'usr_4', 'usr_4', 'Departmental budget submissions and headcount plan.', 'Moved at the customer request - finance lead was travelling.', '', '', '', 'Customer finance lead unavailable on the original date.'),
  ('mtg_6', 'MTG-006', 'Security Compliance Audit', 'cmp_6', 'tm_6', 'IT', '2026-10-02', '14:30', 'Virtual', 'Scheduled', 'usr_7', 'usr_7', 'SOC 2 evidence walkthrough and access review.', '', '', '', '', null),
  ('mtg_7', 'MTG-007', 'Marketing Campaign Planning', 'cmp_7', 'tm_7', 'Marketing', '2026-09-19', '19:30', 'Virtual', 'Completed', 'usr_5', 'usr_5', 'Channel mix, creative direction and launch dates.', 'Creative brief approved with minor copy changes.', 'Launch the paid social flight two weeks earlier than planned.', '', '', null),
  ('mtg_8', 'MTG-008', 'Board Meeting Prep', 'cmp_4', 'tm_4', 'Finance', '2026-09-23', '15:30', 'In Person', 'Completed', 'usr_1', 'usr_1', 'Narrative, metrics pack and Q&A rehearsal.', 'Metrics pack still missing the retention cohort slide.', 'Present the retention story before the revenue section.', '', '', null)
on conflict (id) do nothing;

insert into public.meeting_participants (meeting_id, user_id, participant_type)
values
  ('mtg_1', 'usr_1', 'Organizer'), ('mtg_1', 'usr_2', 'Team Member'), ('mtg_1', 'usr_3', 'Team Member'), ('mtg_1', 'usr_4', 'Team Member'),
  ('mtg_2', 'usr_2', 'Organizer'), ('mtg_2', 'usr_5', 'Team Member'),
  ('mtg_3', 'usr_2', 'Organizer'), ('mtg_3', 'usr_3', 'Team Member'), ('mtg_3', 'usr_7', 'Optional'),
  ('mtg_4', 'usr_3', 'Organizer'), ('mtg_4', 'usr_7', 'Team Member'),
  ('mtg_5', 'usr_4', 'Organizer'), ('mtg_5', 'usr_1', 'Team Member'),
  ('mtg_6', 'usr_7', 'Organizer'), ('mtg_6', 'usr_3', 'Team Member'),
  ('mtg_7', 'usr_5', 'Organizer'), ('mtg_7', 'usr_2', 'Team Member'),
  ('mtg_8', 'usr_1', 'Organizer'), ('mtg_8', 'usr_4', 'Team Member'), ('mtg_8', 'usr_5', 'Optional')
on conflict (meeting_id, user_id) do nothing;;
