# AV DYNAMICS · Meeting Management

An enterprise meeting management, CRM and productivity workspace built with React and Vite. Without Supabase configuration, the app runs in local demo mode. With Supabase configured, accounts use Supabase Auth and workspace records sync to a private per-account database store.

---

## Features

**Authentication**
- Premium two-column login page with the AV DYNAMICS brand panel
- Inline email/password validation, password visibility toggle, loading and disabled button states
- Persistent Supabase Auth sessions, protected and public-only routes, logout
- LocalStorage/sessionStorage demo authentication when Supabase is not configured
- Simulated forgot-password flow

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
- Upload with real file reading (stored as a data URL under 4 MB), plus metadata-only for larger files
- Search, meeting / company / type filters, preview for images and PDFs, download, rename, delete

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

The Supabase client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`. Use real project values; the placeholder values in `.env.example` do not connect. For Vercel, add both variables under Project Settings → Environment Variables for each deployment environment, then redeploy. In Supabase Authentication → URL Configuration, set the deployed app as the Site URL and add its origin to Redirect URLs. Email confirmation is enabled, so new users must confirm their address before signing in.

Optional Supabase agent instructions:

```bash
npx skills add supabase/agent-skills
```

## Supabase database

The app stores credentials in Supabase Auth and saves its user, company, team, meeting, action-item, document, notification, settings, and activity collections in `public.workspace_records`. Every record is scoped to `auth.uid()` by RLS; passwords are never copied into workspace records. Existing browser records are imported for the first account on that browser, with seeded demo rows removed. Legacy normalized tables remain locked to browser roles.

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

## Demo credentials

```
Email:    admin@avdynamics.com
Password: Admin@123
```

The login page also offers a **Use Demo Account** button that fills the form for you. Other seeded accounts (sarah@, john@, maria@, david@, jennifer@, michael@ — all `Demo@123`) can be used to see non-admin data.

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
- Local demo mode seeds fixtures once. Configured Supabase mode loads the signed-in user's cloud records and syncs future changes; the browser cache is refreshed from the account on sign-in.
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
  data/          seedData.js
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
| `avdynamics_documents` | `[{ id, name, type, size, meetingId, companyId, uploadedBy, dataUrl?, createdAt }]` |
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
4. **Documents.** Replace the base64 data URL with an upload endpoint returning a signed URL; `documentsService.isPreviewable` and the preview modal already work off a URL.
5. **Settings and notifications.** `getSettings` / `saveSection` map one-to-one onto `GET /settings` and `PATCH /settings/:section`.

No page or component imports storage directly, so steps 1–5 are the entire migration surface.
