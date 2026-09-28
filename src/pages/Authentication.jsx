import { useMemo } from 'react'
import { Chrome, Fingerprint, KeyRound, LockKeyhole, Mail, ShieldCheck, Building2, UserPlus } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import Card, { CardHeader } from '../components/ui/Card'
import Switch from '../components/ui/Switch'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useToast } from '../context/ToastContext'
import { getSettings, saveSection } from '../services/notificationsService'
import { KEYS, getData } from '../services/storageService'
import { ROLES } from '../data/seedData'

const METHODS = [
  { key: 'email', label: 'Email and password', description: 'Classic credentials with an optional one-time code.', icon: Mail },
  { key: 'google', label: 'Google', description: 'Allow members to sign in with a Google Workspace account.', icon: Chrome },
  { key: 'microsoft', label: 'Microsoft', description: 'Allow members to sign in with Microsoft Entra ID.', icon: Building2 },
  { key: 'sso', label: 'Single Sign-On', description: 'SAML based SSO for your identity provider.', icon: KeyRound },
  { key: 'passwordless', label: 'Passwordless link', description: 'Send a one-time sign-in link instead of a password.', icon: Fingerprint },
]

const SIGNUP_MODES = [
  { value: 'Disabled', label: 'Disabled — nobody can sign up on their own' },
  { value: 'Open', label: 'Open — anyone can create an account' },
  { value: 'Domain Restricted', label: 'Domain restricted — only approved domains' },
]

const SESSION_TIMEOUTS = ['1 hour', '4 hours', '8 hours', '24 hours', '7 days', 'Never']

const PASSWORD_POLICIES = [
  'Basic — 6+ characters',
  'Strong — 8+ characters, number and symbol',
  'Strict — 12+ characters, mixed case, number and symbol',
]

const Row = ({ children, last = false }) => (
  <div className={`px-5 py-3.5 ${last ? '' : 'border-b border-line'}`}>{children}</div>
)

const Authentication = () => {
  const { toast } = useToast()
  const loading = useLoading(300)
  const [settings] = useStore(() => getSettings())
  const [teams] = useStore(() => getData(KEYS.teams, []))

  const auth = settings.auth
  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams]
  )

  const save = (patch) => {
    saveSection('auth', patch)
    toast('Settings saved.')
  }

  const setMethod = (key) => (value) => {
    saveSection('auth', { methods: { ...auth.methods, [key]: value } })
    toast('Settings saved.')
  }

  const activeMethods = Object.values(auth.methods).filter(Boolean).length

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Authentication" description="Configure sign-in, authentication methods and security." />
        <LoadingSkeleton variant="page" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Authentication"
        description="Configure sign-in, authentication methods and security for the workspace."
        actions={<Badge tone="green" icon={ShieldCheck}>{activeMethods} methods enabled</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Login" description="Control whether members can access the application." />
            <Row last>
              <Switch
                id="auth-login"
                label="Enable login"
                description="When disabled, only an administrator can still reach the workspace."
                checked={Boolean(auth.loginEnabled)}
                onChange={(v) => save({ loginEnabled: v })}
              />
            </Row>
          </Card>

          <Card>
            <CardHeader title="Authentication method" description="How your members sign in." />
            {METHODS.map((m, i) => (
              <Row key={m.key} last={i === METHODS.length - 1}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <m.icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Switch
                      id={`auth-m-${m.key}`}
                      label={m.label}
                      description={m.description}
                      checked={Boolean(auth.methods[m.key])}
                      onChange={setMethod(m.key)}
                    />
                  </div>
                </div>
              </Row>
            ))}
          </Card>

          <Card>
            <CardHeader title="Security" description="Session handling and password requirements." />
            <Row>
              <Select
                label="Log user out"
                options={SESSION_TIMEOUTS}
                value={auth.sessionTimeout}
                onChange={(e) => save({ sessionTimeout: e.target.value })}
              />
            </Row>
            <Row>
              <Select
                label="Password policy"
                options={PASSWORD_POLICIES}
                value={auth.passwordPolicy}
                onChange={(e) => save({ passwordPolicy: e.target.value })}
              />
            </Row>
            <Row>
              <Switch
                id="auth-2fa"
                label="Two-factor authentication"
                description="Require a second factor after the password step."
                checked={Boolean(auth.twoFactor)}
                onChange={(v) => save({ twoFactor: v })}
              />
            </Row>
            <Row last>
              <Switch
                id="auth-attempts"
                label="Login attempt protection"
                description="Temporarily lock an account after five failed attempts."
                checked={Boolean(auth.loginAttemptProtection)}
                onChange={(v) => save({ loginAttemptProtection: v })}
              />
            </Row>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Sign up" description="Can people sign up on their own?" />
            <Row last={auth.signUpMode !== 'Domain Restricted'}>
              <Select
                label="Sign up mode"
                options={SIGNUP_MODES}
                value={auth.signUpMode}
                onChange={(e) => save({ signUpMode: e.target.value })}
              />
            </Row>
            {auth.signUpMode === 'Domain Restricted' && (
              <Row last>
                <Input
                  label="Allowed domains"
                  placeholder="avdynamics.com, partner.com"
                  value={auth.allowedDomains}
                  onChange={(e) => saveSection('auth', { allowedDomains: e.target.value })}
                  hint="Comma separated. Only these email domains may create an account."
                />
              </Row>
            )}
          </Card>

          <Card>
            <CardHeader title="Onboarding" description="What new members get when they join." />
            <Row>
              <Switch
                id="auth-onboarding"
                label="Enable onboarding flow"
                description="Walk new members through a short setup after their first sign-in."
                checked={Boolean(auth.onboardingEnabled)}
                onChange={(v) => save({ onboardingEnabled: v })}
              />
            </Row>
            <Row>
              <Select
                label="Default role"
                options={!auth.defaultRole || ROLES.includes(auth.defaultRole) ? ROLES : [auth.defaultRole, ...ROLES]}
                value={auth.defaultRole}
                onChange={(e) => save({ defaultRole: e.target.value })}
              />
            </Row>
            <Row last>
              <Select
                label="Default team"
                options={teamOptions}
                placeholder="No default team"
                value={auth.defaultTeamId || ''}
                onChange={(e) => save({ defaultTeamId: e.target.value })}
              />
            </Row>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                <LockKeyhole size={16} />
              </span>
              <div>
                <h3 className="text-[13px] font-semibold text-ink">Frontend demo workspace</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  AV DYNAMICS runs entirely in the browser for this demo. These settings persist to LocalStorage and are
                  applied by the app shell — no identity provider is contacted.
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
                  <UserPlus size={13} /> New members default to {auth.defaultRole}.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Authentication
