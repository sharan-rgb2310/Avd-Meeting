import { KEYS } from '../services/storageService'
import { addDays, todayKey } from '../utils/format'

export const DEPARTMENTS = ['Sales', 'Engineering', 'Product', 'Marketing', 'Operations', 'Finance', 'HR', 'IT']
// Roles offered when adding or editing a user.
export const ROLES = ['Admin', 'Manager', 'Group Manager', 'Editor', 'Viewer']
// Roles that may already exist on saved accounts. They keep working and are
// still shown/filtered, but are no longer offered for new users.
export const LEGACY_ROLES = ['Team Member', 'Manual Add']
export const USER_STATUSES = ['Activated', 'Invited', 'Inactive', 'Not Invited']
export const AUTH_METHODS = ['Email', 'Google', 'Microsoft', 'Single Sign-On']
export const COMPANY_STATUSES = ['Active', 'Inactive', 'Prospect', 'Customer']
export const INDUSTRIES = ['Technology', 'Financial Services', 'Manufacturing', 'Healthcare', 'Media', 'Logistics', 'Security']
export const MEETING_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Rescheduled', 'Cancelled', 'On Hold']
export const MEETING_TYPES = [
  { value: 'Virtual', label: 'Virtual Meeting' },
  { value: 'In Person', label: 'In-Person Meeting' },
  { value: 'Hybrid', label: 'Hybrid Meeting' },
]
export const ACTION_STATUSES = ['To Do', 'In Progress', 'Blocked', 'Done']
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
export const DOCUMENT_TYPES = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPG', 'MP4']
export const PARTICIPANT_TYPES = ['Organizer', 'Team Member', 'Guest', 'Optional']

const now = new Date().toISOString()
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()

const users = [
  { id: 'usr_1', name: 'Arun Kumar', email: 'admin@avdynamics.com', password: 'Admin@123', role: 'Admin', status: 'Activated', authMethod: 'Email', teamId: 'tm_1', department: 'Sales', phone: '+91 98400 12345', title: 'Head of Revenue Operations', lastSeen: hoursAgo(2), createdAt: hoursAgo(9000) },
  { id: 'usr_2', name: 'Sarah Parker', email: 'sarah@avdynamics.com', password: 'Demo@123', role: 'Team Member', status: 'Activated', authMethod: 'Email', teamId: 'tm_2', department: 'Product', phone: '+1 415 220 8812', title: 'Product Designer', lastSeen: hoursAgo(4), createdAt: hoursAgo(8000) },
  { id: 'usr_3', name: 'John Doe', email: 'john@avdynamics.com', password: 'Demo@123', role: 'Team Member', status: 'Invited', authMethod: 'Email', teamId: 'tm_3', department: 'Engineering', phone: '+1 408 771 2290', title: 'Platform Engineer', lastSeen: hoursAgo(26), createdAt: hoursAgo(700) },
  { id: 'usr_4', name: 'Maria Kim', email: 'maria@avdynamics.com', password: 'Demo@123', role: 'Manager', status: 'Activated', authMethod: 'Google', teamId: 'tm_1', department: 'Sales', phone: '+1 212 908 4417', title: 'Regional Sales Manager', lastSeen: hoursAgo(3), createdAt: hoursAgo(6400) },
  { id: 'usr_5', name: 'David Wilson', email: 'david@avdynamics.com', password: 'Demo@123', role: 'Manager', status: 'Activated', authMethod: 'Microsoft', teamId: 'tm_7', department: 'Marketing', phone: '+44 20 7946 1123', title: 'Growth Lead', lastSeen: hoursAgo(8), createdAt: hoursAgo(5200) },
  { id: 'usr_6', name: 'Jennifer Taylor', email: 'jennifer@avdynamics.com', password: 'Demo@123', role: 'Viewer', status: 'Not Invited', authMethod: 'Email', teamId: 'tm_5', department: 'HR', phone: '+1 646 220 7781', title: 'People Operations Partner', lastSeen: null, createdAt: hoursAgo(300) },
  { id: 'usr_7', name: 'Michael Lee', email: 'michael@avdynamics.com', password: 'Demo@123', role: 'Team Member', status: 'Activated', authMethod: 'Single Sign-On', teamId: 'tm_6', department: 'IT', phone: '+65 6812 4410', title: 'Infrastructure Engineer', lastSeen: hoursAgo(12), createdAt: hoursAgo(4100) },
]

const teams = [
  { id: 'tm_1', name: 'Direct Sales North America', department: 'Sales', leadId: 'usr_4', memberIds: ['usr_1', 'usr_4', 'usr_2'], status: 'Active', description: 'Owns enterprise pipeline and renewals across the US and Canada.', createdAt: hoursAgo(9000) },
  { id: 'tm_2', name: 'Mobile Experience', department: 'Product', leadId: 'usr_2', memberIds: ['usr_2', 'usr_3'], status: 'Active', description: 'Designs and ships the mobile meeting experience.', createdAt: hoursAgo(8100) },
  { id: 'tm_3', name: 'Platform Engineering', department: 'Engineering', leadId: 'usr_3', memberIds: ['usr_3', 'usr_7'], status: 'Active', description: 'Core services, integrations and developer tooling.', createdAt: hoursAgo(7600) },
  { id: 'tm_4', name: 'Corporate Finance & Reporting', department: 'Finance', leadId: 'usr_4', memberIds: ['usr_4', 'usr_1'], status: 'Active', description: 'Budgeting, forecasting and board reporting.', createdAt: hoursAgo(7100) },
  { id: 'tm_5', name: 'People Ops & Culture', department: 'HR', leadId: 'usr_6', memberIds: ['usr_6'], status: 'Active', description: 'Hiring, onboarding and workplace programs.', createdAt: hoursAgo(6800) },
  { id: 'tm_6', name: 'IT Infrastructure', department: 'IT', leadId: 'usr_7', memberIds: ['usr_7', 'usr_3'], status: 'Active', description: 'Identity, endpoints and security compliance.', createdAt: hoursAgo(6200) },
  { id: 'tm_7', name: 'Growth Marketing', department: 'Marketing', leadId: 'usr_5', memberIds: ['usr_5', 'usr_2'], status: 'Active', description: 'Campaigns, demand generation and brand.', createdAt: hoursAgo(5900) },
]

const companies = [
  { id: 'cmp_1', name: 'ABC Technologies', industry: 'Technology', status: 'Customer', contactName: 'Priya Raman', email: 'priya@abctech.com', phone: '+1 415 555 0132', website: 'abctech.com', location: 'San Francisco, CA', notes: 'Strategic account. Renewal review each quarter.', createdAt: hoursAgo(8800) },
  { id: 'cmp_2', name: 'XYZ Solutions', industry: 'Financial Services', status: 'Active', contactName: 'Thomas Reed', email: 'thomas@xyzsolutions.com', phone: '+1 212 555 0188', website: 'xyzsolutions.com', location: 'New York, NY', notes: 'Expanding into two more business units.', createdAt: hoursAgo(8200) },
  { id: 'cmp_3', name: 'Acme Corp', industry: 'Manufacturing', status: 'Customer', contactName: 'Helen Barnes', email: 'helen@acmecorp.com', phone: '+1 312 555 0110', website: 'acmecorp.com', location: 'Chicago, IL', notes: 'Design system workshop scheduled with their product group.', createdAt: hoursAgo(7400) },
  { id: 'cmp_4', name: 'Global Tech', industry: 'Technology', status: 'Active', contactName: 'Rahul Menon', email: 'rahul@globaltech.com', phone: '+91 80 4055 2211', website: 'globaltech.com', location: 'Bengaluru, IN', notes: 'Bi-weekly product sync with their platform team.', createdAt: hoursAgo(6900) },
  { id: 'cmp_5', name: 'Zenith Inc', industry: 'Financial Services', status: 'Prospect', contactName: 'Clara Nunes', email: 'clara@zenithinc.com', phone: '+1 617 555 0144', website: 'zenithinc.com', location: 'Boston, MA', notes: 'Budget review moved to next week at their request.', createdAt: hoursAgo(4200) },
  { id: 'cmp_6', name: 'SecureIT', industry: 'Security', status: 'Active', contactName: 'Daniel Oyelaran', email: 'daniel@secureit.com', phone: '+44 20 7946 0099', website: 'secureit.com', location: 'London, UK', notes: 'Annual compliance audit in progress.', createdAt: hoursAgo(3900) },
  { id: 'cmp_7', name: 'Bright Media', industry: 'Media', status: 'Inactive', contactName: 'Nina Alvarez', email: 'nina@brightmedia.com', phone: '+1 305 555 0175', website: 'brightmedia.com', location: 'Miami, FL', notes: 'Paused engagement until the next campaign cycle.', createdAt: hoursAgo(3000) },
]

const participant = (userId, type) => ({ userId, type })

const meetings = [
  {
    id: 'mtg_1', ref: 'MTG-001', title: 'Q3 Strategy Alignment', companyId: 'cmp_1', teamId: 'tm_1', department: 'Sales',
    date: todayKey(), startTime: '10:30', type: 'Virtual', status: 'In Progress', createdBy: 'usr_1', responsibleId: 'usr_1',
    agenda: 'Review Q3 targets, pipeline coverage and the roadmap commitments for the next quarter.',
    notes: 'Prepared updated sales deck and market analysis ahead of the call.',
    decisions: 'Align on Q3 targets and reallocate two engineers to the integrations track.',
    actionItemsText: 'Send the revised Q3 target sheet\nShare the resourcing plan with Engineering',
    remarks: 'Pipeline coverage in the East region needs a closer look next week.',
    participants: [participant('usr_1', 'Organizer'), participant('usr_2', 'Team Member'), participant('usr_3', 'Team Member'), participant('usr_4', 'Team Member')],
    createdAt: hoursAgo(120), updatedAt: hoursAgo(3),
  },
  {
    id: 'mtg_2', ref: 'MTG-002', title: 'Customer Feedback Session', companyId: 'cmp_2', teamId: 'tm_2', department: 'Product',
    date: todayKey(), startTime: '14:00', type: 'Virtual', status: 'Scheduled', createdBy: 'usr_2', responsibleId: 'usr_2',
    agenda: 'Walk through the latest onboarding research and prioritise the top three fixes.',
    notes: 'Send the research summary 24 hours before the session.',
    decisions: '',
    participants: [participant('usr_2', 'Organizer'), participant('usr_5', 'Team Member')],
    createdAt: hoursAgo(90), updatedAt: hoursAgo(20),
  },
  {
    id: 'mtg_3', ref: 'MTG-003', title: 'Design System Workshop', companyId: 'cmp_3', teamId: 'tm_2', department: 'Product',
    date: addDays(1), startTime: '11:00', type: 'In Person', status: 'Scheduled', createdBy: 'usr_2', responsibleId: 'usr_2',
    agenda: 'Audit component coverage and agree the token naming convention.',
    notes: 'Bring printed component inventory.', decisions: '',
    participants: [participant('usr_2', 'Organizer'), participant('usr_3', 'Team Member'), participant('usr_7', 'Optional')],
    createdAt: hoursAgo(200), updatedAt: hoursAgo(48),
  },
  {
    id: 'mtg_4', ref: 'MTG-004', title: 'Bi-Weekly Product Sync', companyId: 'cmp_4', teamId: 'tm_3', department: 'Engineering',
    date: addDays(3), startTime: '08:30', type: 'Virtual', status: 'Scheduled', createdBy: 'usr_3', responsibleId: 'usr_3',
    agenda: 'Sprint review, integration status and blockers.', notes: '', decisions: '',
    participants: [participant('usr_3', 'Organizer'), participant('usr_7', 'Team Member')],
    createdAt: hoursAgo(300), updatedAt: hoursAgo(60),
  },
  {
    id: 'mtg_5', ref: 'MTG-005', title: 'Budget Review — FY27 Q1', companyId: 'cmp_5', teamId: 'tm_4', department: 'Finance',
    date: addDays(5), startTime: '11:00', type: 'Hybrid', status: 'Rescheduled', createdBy: 'usr_4', responsibleId: 'usr_4',
    agenda: 'Departmental budget submissions and headcount plan.',
    notes: 'Moved at the customer request — finance lead was travelling.',
    decisions: '',
    rescheduleReason: 'Customer finance lead unavailable on the original date.',
    participants: [participant('usr_4', 'Organizer'), participant('usr_1', 'Team Member')],
    createdAt: hoursAgo(400), updatedAt: hoursAgo(30),
  },
  {
    id: 'mtg_6', ref: 'MTG-006', title: 'Security Compliance Audit', companyId: 'cmp_6', teamId: 'tm_6', department: 'IT',
    date: addDays(7), startTime: '14:30', type: 'Virtual', status: 'Scheduled', createdBy: 'usr_7', responsibleId: 'usr_7',
    agenda: 'SOC 2 evidence walkthrough and access review.', notes: '', decisions: '',
    participants: [participant('usr_7', 'Organizer'), participant('usr_3', 'Team Member')],
    createdAt: hoursAgo(500), updatedAt: hoursAgo(72),
  },
  {
    id: 'mtg_7', ref: 'MTG-007', title: 'Marketing Campaign Planning', companyId: 'cmp_7', teamId: 'tm_7', department: 'Marketing',
    date: addDays(-6), startTime: '19:30', type: 'Virtual', status: 'Completed', createdBy: 'usr_5', responsibleId: 'usr_5',
    agenda: 'Channel mix, creative direction and launch dates.',
    notes: 'Creative brief approved with minor copy changes.',
    decisions: 'Launch the paid social flight two weeks earlier than planned.',
    participants: [participant('usr_5', 'Organizer'), participant('usr_2', 'Team Member')],
    createdAt: hoursAgo(900), updatedAt: hoursAgo(140),
  },
  {
    id: 'mtg_8', ref: 'MTG-008', title: 'Board Meeting Prep', companyId: 'cmp_4', teamId: 'tm_4', department: 'Finance',
    date: addDays(-2), startTime: '15:30', type: 'In Person', status: 'Completed', createdBy: 'usr_1', responsibleId: 'usr_1',
    agenda: 'Narrative, metrics pack and Q&A rehearsal.',
    notes: 'Metrics pack still missing the retention cohort slide.',
    decisions: 'Present the retention story before the revenue section.',
    participants: [participant('usr_1', 'Organizer'), participant('usr_4', 'Team Member'), participant('usr_5', 'Optional')],
    createdAt: hoursAgo(1000), updatedAt: hoursAgo(50),
  },
]

const actionItems = [
  { id: 'act_1', title: 'Review Q3 sales report', description: 'Check regional splits before the strategy call.', status: 'To Do', priority: 'High', dueDate: todayKey(), meetingId: 'mtg_1', companyId: 'cmp_1', assigneeId: 'usr_4', createdAt: hoursAgo(100), updatedAt: hoursAgo(10) },
  { id: 'act_2', title: 'Fix CSS bug on pricing page', description: 'Badge overlaps the plan title below 380px.', status: 'To Do', priority: 'Medium', dueDate: addDays(2), meetingId: 'mtg_2', companyId: 'cmp_2', assigneeId: 'usr_3', createdAt: hoursAgo(80), updatedAt: hoursAgo(9) },
  { id: 'act_3', title: 'Research competitor pricing', description: 'Compare three competitors on seat pricing.', status: 'To Do', priority: 'Low', dueDate: addDays(9), meetingId: 'mtg_3', companyId: 'cmp_3', assigneeId: 'usr_5', createdAt: hoursAgo(70), updatedAt: hoursAgo(8) },
  { id: 'act_4', title: 'Prepare customer demo', description: 'Tailor the demo script to the onboarding flow.', status: 'In Progress', priority: 'High', dueDate: addDays(4), meetingId: 'mtg_7', companyId: 'cmp_7', assigneeId: 'usr_5', createdAt: hoursAgo(60), updatedAt: hoursAgo(5) },
  { id: 'act_5', title: 'Update website content', description: 'Refresh the product page copy after the campaign review.', status: 'In Progress', priority: 'Medium', dueDate: addDays(5), meetingId: 'mtg_4', companyId: 'cmp_4', assigneeId: 'usr_2', createdAt: hoursAgo(55), updatedAt: hoursAgo(4) },
  { id: 'act_6', title: 'Audit database permissions', description: 'Blocked until SecureIT shares the access matrix.', status: 'Blocked', priority: 'Critical', dueDate: addDays(1), meetingId: 'mtg_6', companyId: 'cmp_6', assigneeId: 'usr_7', createdAt: hoursAgo(50), updatedAt: hoursAgo(3) },
  { id: 'act_7', title: 'API integration testing', description: 'Waiting on sandbox credentials from Zenith.', status: 'Blocked', priority: 'High', dueDate: addDays(8), meetingId: 'mtg_5', companyId: 'cmp_5', assigneeId: 'usr_3', createdAt: hoursAgo(45), updatedAt: hoursAgo(2) },
  { id: 'act_8', title: 'Backup system setup', description: 'Nightly snapshots enabled and verified.', status: 'Done', priority: 'Low', dueDate: addDays(-3), meetingId: 'mtg_6', companyId: 'cmp_6', assigneeId: 'usr_7', createdAt: hoursAgo(400), updatedAt: hoursAgo(90) },
  { id: 'act_9', title: 'Send campaign plan to Bright Media', description: 'Final plan shared with the client team.', status: 'Done', priority: 'Medium', dueDate: addDays(-5), meetingId: 'mtg_7', companyId: 'cmp_7', assigneeId: 'usr_5', createdAt: hoursAgo(500), updatedAt: hoursAgo(120) },
  { id: 'act_10', title: 'Finish board metrics pack', description: 'Add the retention cohort slide.', status: 'In Progress', priority: 'Critical', dueDate: addDays(1), meetingId: 'mtg_8', companyId: 'cmp_4', assigneeId: 'usr_1', createdAt: hoursAgo(48), updatedAt: hoursAgo(6) },
]

const documents = [
  { id: 'doc_1', name: 'Q3_Strategy.pdf', type: 'PDF', size: 2448000, meetingId: 'mtg_1', companyId: 'cmp_1', uploadedBy: 'usr_1', createdAt: hoursAgo(100), dataUrl: '' },
  { id: 'doc_2', name: 'Design_Notes.docx', type: 'DOCX', size: 184000, meetingId: 'mtg_3', companyId: 'cmp_3', uploadedBy: 'usr_2', createdAt: hoursAgo(120), dataUrl: '' },
  { id: 'doc_3', name: 'Meeting_Record.mp4', type: 'MP4', size: 88400000, meetingId: 'mtg_2', companyId: 'cmp_2', uploadedBy: 'usr_3', createdAt: hoursAgo(150), dataUrl: '' },
  { id: 'doc_4', name: 'Proposal.pdf', type: 'PDF', size: 990000, meetingId: 'mtg_4', companyId: 'cmp_4', uploadedBy: 'usr_4', createdAt: hoursAgo(190), dataUrl: '' },
  { id: 'doc_5', name: 'Budget_FY27.xlsx', type: 'XLSX', size: 420000, meetingId: 'mtg_5', companyId: 'cmp_5', uploadedBy: 'usr_4', createdAt: hoursAgo(230), dataUrl: '' },
  { id: 'doc_6', name: 'Compliance_Contract.pdf', type: 'PDF', size: 1340000, meetingId: 'mtg_6', companyId: 'cmp_6', uploadedBy: 'usr_7', createdAt: hoursAgo(260), dataUrl: '' },
  { id: 'doc_7', name: 'Marketing_Plan.pptx', type: 'PPTX', size: 6120000, meetingId: 'mtg_7', companyId: 'cmp_7', uploadedBy: 'usr_5', createdAt: hoursAgo(300), dataUrl: '' },
  { id: 'doc_8', name: 'Boardroom_Setup.png', type: 'PNG', size: 780000, meetingId: 'mtg_8', companyId: 'cmp_4', uploadedBy: 'usr_1', createdAt: hoursAgo(340), dataUrl: '' },
]

const notifications = [
  { id: 'ntf_1', type: 'meeting', title: 'Q3 Strategy Alignment starts soon', body: 'Starting at 10:30 AM with ABC Technologies.', read: false, createdAt: hoursAgo(1), link: '/meetings/mtg_1' },
  { id: 'ntf_2', type: 'action', title: 'Action item due today', body: 'Review Q3 sales report is assigned to Maria Kim.', read: false, createdAt: hoursAgo(2), link: '/action-items' },
  { id: 'ntf_3', type: 'mention', title: 'Sarah Parker mentioned you', body: 'In notes on Customer Feedback Session.', read: false, createdAt: hoursAgo(5), link: '/meetings/mtg_2' },
  { id: 'ntf_4', type: 'document', title: 'New document uploaded', body: 'Budget_FY27.xlsx added to Budget Review — FY27 Q1.', read: true, createdAt: hoursAgo(26), link: '/documents' },
  { id: 'ntf_5', type: 'system', title: 'Security audit scheduled', body: 'SecureIT compliance audit is on the calendar.', read: true, createdAt: hoursAgo(48), link: '/meetings/mtg_6' },
]

const activity = [
  { id: 'atv_1', message: 'Arun Kumar moved Q3 Strategy Alignment to In Progress', entity: 'meeting', entityId: 'mtg_1', companyId: 'cmp_1', createdAt: hoursAgo(3) },
  { id: 'atv_2', message: 'Maria Kim rescheduled Budget Review — FY27 Q1', entity: 'meeting', entityId: 'mtg_5', companyId: 'cmp_5', createdAt: hoursAgo(30) },
  { id: 'atv_3', message: 'Michael Lee completed Backup system setup', entity: 'action', entityId: 'act_8', companyId: 'cmp_6', createdAt: hoursAgo(90) },
  { id: 'atv_4', message: 'Sarah Parker uploaded Design_Notes.docx', entity: 'document', entityId: 'doc_2', companyId: 'cmp_3', createdAt: hoursAgo(120) },
]

export const defaultSettings = {
  notifications: {
    emailNotifications: true,
    meetingReminders: true,
    actionItemReminders: true,
    documentNotifications: false,
    mentionNotifications: true,
    pushNotifications: false,
    inAppNotifications: true,
  },
  automation: {
    autoInviteEmail: true,
    emailSender: 'Meeting Minutes Tracker <noreply@avdynamics.com>',
    weeklyDigest: true,
  },
  channels: {
    desktopPush: true,
    mobilePush: false,
    slack: false,
  },
  templates: [
    { id: 'tpl_1', name: 'Invitation', description: 'Sent when a new user is invited', enabled: true },
    { id: 'tpl_2', name: 'One-time code', description: 'Sent for passwordless sign-in', enabled: true },
    { id: 'tpl_3', name: 'Email change confirmation', description: 'Sent to confirm a new email address', enabled: true },
    { id: 'tpl_4', name: 'Reset password', description: 'Sent on a password reset request', enabled: true },
    { id: 'tpl_5', name: 'New comment', description: 'Sent when a comment is added', enabled: false },
    { id: 'tpl_6', name: 'Document upload', description: 'Sent when a document is added to a meeting', enabled: true },
    { id: 'tpl_7', name: 'New mention', description: 'Sent when someone mentions the user', enabled: true },
    { id: 'tpl_8', name: 'Meeting reminder', description: 'Sent 15 minutes before a meeting starts', enabled: true },
    { id: 'tpl_9', name: 'Action item reminder', description: 'Sent on the morning an action item is due', enabled: true },
  ],
  auth: {
    loginEnabled: true,
    methods: { email: true, google: true, microsoft: false, sso: false, passwordless: false },
    signUpMode: 'Domain Restricted',
    allowedDomains: 'avdynamics.com',
    onboardingEnabled: true,
    defaultRole: 'Editor',
    defaultTeamId: 'tm_1',
    sessionTimeout: '8 hours',
    twoFactor: false,
    loginAttemptProtection: true,
    passwordPolicy: 'Strong — 8+ characters, number and symbol',
  },
  profile: {
    lastLogin: now,
  },
}

export const seed = {
  [KEYS.users]: users,
  [KEYS.teams]: teams,
  [KEYS.companies]: companies,
  [KEYS.meetings]: meetings,
  [KEYS.actionItems]: actionItems,
  [KEYS.documents]: documents,
  [KEYS.notifications]: notifications,
  [KEYS.activity]: activity,
  [KEYS.settings]: defaultSettings,
}

export default seed
