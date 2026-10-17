# AV DYNAMICS · Meeting Management

An enterprise meeting management, CRM and productivity workspace built with React and Vite. Without Supabase configuration, accounts and records stay in this browser. With Supabase configured, accounts use Supabase Auth and workspace records sync to a private per-account database store.

---

## Features

**Authentication**
- Premium two-column login page with the AV DYNAMICS brand panel
- Inline email/password validation, password visibility toggle, loading and disabled button states
- Persistent Supabase Auth sessions, protected and public-only routes, logout
- LocalStorage/sessionStorage authentication when Supabase is not configured
- Supabase email-based password recovery with a dedicated reset page

**Dashboard**
- Three highlighted meeting cards — Today's (blue), Tomorrow's (green) and Upcoming (amber, after tomorrow) — computed live from the meetings store; each opens the Meetings list filtered to the same set
- Recent meetings and recent action items
- Recharts analytics: meetings by status, meeting activity over time, action item completion

**Companies & CRM**
- Table with search, industry filter, status filter, sortable columns, pagination
- Create / edit modals, delete confirmation
- Company details page: contact block, recent meetings, open action items, documents, activity timeline

**Meetings**
- List with search, department / company / status / date filters, sorting, pagination, bulk selection; columns for date & time, company, department, responsible, created by and status
- Create and edit forms: title, company (pick one or type a name that isn't listed), department, date, start time, status, type, responsible, created by (automatic), participants, agenda, notes, decisions, action items and remarks
- Meeting details with Meeting / Action Items / Documents tabs, agenda, notes, decisions, action items, remarks
- Add and remove participants, reschedule modal (sets status to Rescheduled), cancel, delete, save draft

**Action Items**
- Four-column Kanban (To Do, In Progress, Blocked, Done) with drag-and-drop **and** a status dropdown fallback
- Priorities (Low / Medium / High / Critical), assignment, due dates, meeting and company links, full CRUD

**Documents**
- Upload files to the private Supabase Storage bucket (or browser IndexedDB in local-only mode)
- Search, meeting / company / type filters, preview for images, PDFs and videos, Blob-based download, rename, delete
- Owners can manage documents; explicitly shared users and participants in the linked meeting can view and download them

**Teams & Users**
- Team CRUD, department assignment, team lead, members, team details with meetings and action items
- User CRUD with roles (Manager, Group Manager, Editor, Manual Add; existing accounts keep their current role), statuses, authentication methods and last-seen timestamps

**Notifications**
- Header notification center with unread count, mark as read, mark all as read
- Settings page: user notification settings, automation, other channels and nine system notification templates — every toggle persists

**Authentication settings**
- Login toggle, five authentication methods, sign-up mode (Disabled / Open / Domain Restricted with allowed domains), onboarding defaults, session timeout, two-factor, login attempt protection, password policy

**Profile**
- Avatar, contact details, team, department, last login, my-meeting and open-action counters
- Edit profile modal and a working change-password flow

**Global**
- ⌘K global search across meetings, companies, action items, documents, teams and users with grouped results and keyboard navigation
- Reusable modal, drawer, dropdown, table, pagination, toast and badge systems
- Skeleton loading, empty states, error states and an error boundary
- Responsive from 1440px down to 375px: sidebar becomes a drawer, tables scroll, Kanban scrolls horizontally, forms collapse to one column

---

## Technology

| Purpose | Choice |
| --- | --- |
| Framework | React 18 + Vite 5 (JavaScript, no TypeScript) |
| Routing | React Router DOM 6 |
| Styling | Tailwind CSS 3 with a custom AV DYNAMICS token set |
| Icons | Lucide React |
| Charts | Recharts |
| Persistence | LocalStorage cache with Supabase Auth and per-account database sync |

---

## Installation

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

The Supabase client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`. Use real project values; the placeholder values in `.env.example` do not connect. For Vercel, add both variables under Project Settings → Environment Variables for each deployment environment, then redeploy. In Supabase Authentication → URL Configuration, set the deployed app as the Site URL and add both its origin and `/reset-password` URL to Redirect URLs. Email confirmation is disabled so signup does not send rate-limited confirmation emails; Supabase still validates addresses and prevents duplicate accounts.

Optional Supabase agent instructions:

```bash
npx skills add supabase/agent-skills
```

## Supabase database

The app stores credentials in Supabase Auth and saves workspace collections in `public.workspace_records`, with row-level ownership and explicit sharing enforced by RLS; passwords are never copied into workspace records. The `user_directory` view exposes name, email, department, title, role, status, and account creation date to signed-in users, but not phone numbers. New Auth accounts are copied into `public.profiles` by a database trigger. Meetings are shared separately in `public.shared_meetings`; only the organizer and selected participants can read meeting details, and only the organizer can change or delete them. Action items are visible to their creator and assignee; assignees can change status while creators retain management rights. Companies are owner-only unless explicitly shared. Documents are owner-only unless explicitly shared or linked to a meeting, in which case its organizer and participants can view and download the file. The `meeting-documents` bucket is private and uses authenticated owner-scoped paths. Realtime refreshes workspace records when those records change.

Signup lets users enter a role as text. Entering `Admin` (case-insensitive) claims an Admin role only while fewer than three Admin accounts exist; the database serializes role assignment and prevents a fourth Admin, including concurrent signups. Because this is public signup, anyone who reaches the form while a slot is available can claim one. Existing non-admin accounts cannot promote themselves to Admin in Profile settings; an existing Admin can assign Admin through the Users page. The server verifies the caller's current `profiles.role`, and the database prevents removal or deactivation of the last active Admin. Admin privileges apply consistently to account management, companies, meetings, and meeting action items. Role values are limited to 80 characters and can be edited in Profile settings.

```bash
supabase migration list --linked
supabase functions deploy manage-workspace-user
supabase functions deploy signup-role-options
```

The linked Supabase project has previously been updated with the nullable free-form role schema, the three-Admin database guard, and the role-management and signup-availability Edge Functions. Its migration history still has local/remote gaps; review the pending migration list before applying changes and do not run a broad `db push` without reconciling those gaps.
If meeting deletion reports that `public.delete_workspace_meeting(p_meeting_id)` is missing from the schema cache, apply `supabase/migrations/20261017082630_ensure_meeting_delete_rpc.sql` to the linked database and reload the PostgREST schema cache. This function runs as the caller and deletes only that caller's meeting records.

The per-user data-access migration removes permissive legacy policies and applies owner, creator, assignee, and meeting-participant checks to both normalized tables and `workspace_records`. Admin status does not grant access to another user's meetings, tasks, documents, or companies. RLS must remain enabled; service-role credentials must never be exposed to the client. All signed-in active users can view the directory, while profile role changes are performed server-side. Demo fixture IDs are cleaned selectively; registered Auth accounts and unrelated workspace data are not removed.

## Gmail meeting invitations

When a meeting is created with participants who have email addresses in the local user store, the app invokes the `send-meeting-invitations` Edge Function after a Supabase Auth session is available. The function sends one Gmail message to all recipients using Google OAuth refresh-token credentials. Configure Supabase Auth and these Edge Function secrets before using it:

```bash
supabase secrets set \
  GOOGLE_CLIENT_ID=... \
  GOOGLE_CLIENT_SECRET=... \
  GOOGLE_REFRESH_TOKEN=... \
  GOOGLE_SENDER_EMAIL=organizer@example.com
supabase functions deploy send-meeting-invitations
```

The Google OAuth client needs the Gmail API enabled and the `https://www.googleapis.com/auth/gmail.send` scope. The refresh token and client secret must remain server-side; never add them to `.env` variables prefixed with `VITE_`. The function source is in `supabase/functions/send-meeting-invitations/index.ts`.

## Accounts and roles
There are no seeded accounts or demo credentials. Create an account from the signup page and enter a role; an Admin role can be claimed while fewer than three Admin accounts exist. In a Supabase-connected workspace, an administrator can send real account invitations and manage workspace roles. All signed-in users can view the shared directory and edit or delete their own account.

---

## Architecture

```
UI (pages + components)
        │  calls
        ▼
services/*        ← all business logic and the only place that knows about storage
        │  calls
        ▼
      services/storageService.js   ← LocalStorage cache and remote persistence hook
```

- **No component touches `window.localStorage`.** Everything goes through `storageService`.
- Every write broadcasts a `avdynamics:store` CustomEvent. The `useStore` hook subscribes to it, so any screen reading a collection re-renders when another screen mutates it.
- No fixture records are seeded. Known legacy fixture IDs are removed from browser caches and the Supabase workspace-record collections without deleting registered Auth accounts or unrelated records.
- Configured Supabase mode loads the signed-in user's cloud records and syncs future changes; the browser cache is refreshed from the account on sign-in.
- Context providers: `ToastProvider` (global toasts) and `AuthProvider` (session, current user, login/logout).

### Project structure

```
src/
  assets/
  components/
    layout/      AppLayout, Sidebar, MobileSidebar, TopHeader, GlobalSearch
    common/      PageHeader, SearchBar, FilterBar, EmptyState, LoadingSkeleton,
                 ErrorState, ConfirmDialog, ErrorBoundary, Logo
    ui/          Button, Input, Textarea, Select, MultiSelect, Checkbox, Switch,
                 Modal, Drawer, Dropdown, Tabs, Badge, StatusBadge, PriorityBadge,
                 Card, Table, Pagination, Toast, Avatar, AvatarGroup
    dashboard/ companies/ meetings/ actionItems/ documents/ teams/ users/ notifications/
  pages/         Login, Dashboard, Companies, CompanyDetails, Meetings, CreateMeeting,
                 MeetingDetails, EditMeeting, ActionItems, Documents, Teams, TeamDetails,
                 Users, Notifications, Authentication, Profile, NotFound
  services/      storageService, authService, dashboardService, companiesService,
                 meetingsService, actionItemsService, documentsService, teamsService,
                 usersService, notificationsService
  hooks/         useStore, useLoading, useDebounce, usePagination
  context/       AuthContext, ToastContext
  data/          seedData.js, legacyDemoData.js
  utils/         format.js, validators.js
  routes/        AppRoutes.jsx, ProtectedRoute.jsx
```

### Routes

`/login` · `/dashboard` · `/companies` · `/companies/:id` · `/meetings` · `/meetings/create` · `/meetings/:id` · `/meetings/:id/edit` · `/action-items` · `/documents` · `/teams` · `/teams/:id` · `/users` · `/notifications` · `/authentication` · `/profile`

---

## LocalStorage structure

| Key | Shape |
| --- | --- |
| `avdynamics_auth` | `{ userId, name, email, role, remember, signedInAt }` |
| `avdynamics_users` | `[{ id, name, email, role, status, authMethod, teamId, department, phone, title, lastSeen, createdAt }]` (local demo mode may contain legacy passwords; remote sync strips them) |
| `avdynamics_companies` | `[{ id, name, industry, status, contactName, email, phone, website, location, notes, createdAt }]` |
| `avdynamics_teams` | `[{ id, name, department, leadId, memberIds[], status, description, createdAt }]` |
| `avdynamics_meetings` | `[{ id, ref, title, companyId, companyName, department, date, startTime, type, status, responsibleId, createdBy, agenda, notes, decisions, actionItemsText, remarks, participants[{ userId, type }], createdAt }] — `companyName` is only set when the company was typed in manually; older meetings may still carry `teamId`, `endTime`, `location`, `link`, `aiSummary`, `recordingUrl` (kept, no longer shown)` |
| `avdynamics_action_items` | `[{ id, title, description, status, priority, dueDate, assigneeId, meetingId, companyId, createdAt }]` |
| `avdynamics_documents` | `[{ id, name, type, size, meetingId, companyId, uploadedBy, fileKey?, dataUrl?, createdAt }]` (`fileKey` points to a private Supabase Storage object when configured, or browser IndexedDB in local-only mode; `dataUrl` is retained for older records) |
| `avdynamics_notifications` | `[{ id, type, title, message, link, read, createdAt }]` |
| `avdynamics_settings` | `{ notifications, automation, channels, templates[], auth, profile }` |
| `avdynamics_activity` | `[{ id, type, message, entityId, actorId, createdAt }]` |

When `remember me` is unchecked, the auth payload is written to `sessionStorage` under the same key instead.

---

## Future backend integration guide

The services layer was written as a drop-in seam. To move to a real API:

1. **Make the service functions async.** They already return plain values; change `getData(KEYS.meetings)` to `await http.get('/meetings')` inside `meetingsService` only. Component code changes from `const [meetings] = useStore(...)` to a data-fetching hook of your choice (React Query, SWR).
2. **Replace `storageService`.** Swap `read`/`write` for `fetch` calls and keep the same exported names (`getData`, `setData`, `addItem`, `updateItem`, `deleteItem`, `findItem`). The `avdynamics:store` broadcast can be replaced with cache invalidation.
3. **Replace `authService`.** `login` already returns `{ ok, session, user }` — point it at `POST /auth/login`, store the JWT where the session payload currently lives, and `AuthContext` keeps working unchanged.
4. **Documents.** Replace browser IndexedDB file storage with an upload endpoint returning a signed URL; `documentsService.isPreviewable` and the preview modal already work off a URL.
5. **Settings and notifications.** `getSettings` / `saveSection` map one-to-one onto `GET /settings` and `PATCH /settings/:section`.

No page or component imports storage directly, so steps 1–5 are the entire migration surface.
