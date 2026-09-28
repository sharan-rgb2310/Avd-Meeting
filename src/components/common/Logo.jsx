import { cx } from '../../utils/format'
import avDynamicsLogo from '../../assets/AV Dynamics Logo.jpg'
import workspaceLogo from '../../assets/AV Dynamics Logo White_page-0001.jpg'

const LOGO_SIZES = { sm: 26, md: 34, lg: 44 }
const LOGO_VARIANTS = {
  default: { image: avDynamicsLogo, containerClass: 'bg-white', imageClass: '' },
  workspace: { image: workspaceLogo, containerClass: 'bg-brand', imageClass: 'mix-blend-screen invert' },
}

/**
 * AV DYNAMICS mark — two overlapping chevrons that read as an A crossed by a V,
 * drawn from the supplied brand artwork.
 */
export const LogoMark = ({ size = 32, className, tone = 'dark' }) => (
  <span
    className={cx(
      'inline-flex items-center justify-center rounded-[9px] shrink-0',
      tone === 'dark' ? 'bg-navy' : 'bg-white',
      className
    )}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 32 24" width={size * 0.62} height={size * 0.47} fill="none">
      <path d="M2 21.5 11 3h2.6L4.6 21.5H2Z" fill="#38BDF8" />
      <path d="M18.4 3H21l9 18.5h-2.6L18.4 3Z" fill="#38BDF8" />
      <path d="M8.2 21.5 15.6 6.4l1.3 2.7-5.9 12.4H8.2Zm8.5-6.3 3.1 6.3h2.7l-4.4-9-1.4 2.7Z" fill={tone === 'dark' ? '#FFFFFF' : '#0B1736'} />
    </svg>
  </span>
)

const Logo = ({ size = 'md', tone = 'light', className, showTagline = false, variant = 'default' }) => {
  const height = LOGO_SIZES[size]
  const logoVariant = LOGO_VARIANTS[variant] || LOGO_VARIANTS.default
  const subColor = tone === 'light' ? 'text-slate-400' : 'text-muted'
  return (
    <span className={cx('inline-flex flex-col items-start gap-1 rounded-[5px] px-1.5 py-1', logoVariant.containerClass, className)}>
      <img
        src={logoVariant.image}
        alt="AV Dynamics"
        className={cx('block w-auto object-contain', logoVariant.imageClass)}
        style={{ height }}
      />
      {showTagline && (
        <span className={cx('block text-[11px] tracking-[0.18em]', subColor)}>
          MEETING MANAGEMENT
        </span>
      )}
    </span>
  )
}

export default Logo
