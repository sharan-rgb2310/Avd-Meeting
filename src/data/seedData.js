export const DEPARTMENTS = ['Sales', 'Engineering', 'Product', 'Marketing', 'Operations', 'Finance', 'HR', 'IT']
export const ROLES = ['Admin', 'Manager', 'Group Manager', 'Editor', 'Viewer']
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
    signUpMode: 'Open',
    allowedDomains: '',
    onboardingEnabled: true,
    defaultTeamId: '',
    sessionTimeout: '8 hours',
    twoFactor: false,
    loginAttemptProtection: true,
    passwordPolicy: 'Strong — 8+ characters, number and symbol',
  },
  profile: {
    lastLogin: null,
  },
}
