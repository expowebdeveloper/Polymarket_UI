/**
 * X (Twitter) logo as inline SVG - current X branding.
 */
function XLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * External link icon for Polymarket profile (open in new tab).
 */
function PolymarketIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export interface SocialLinksProps {
  /** X (Twitter) username without @. If set, shows X icon linking to profile. */
  xUsername?: string | null;
  /** Wallet address for Polymarket profile URL. If set, shows Polymarket icon linking to profile. */
  polymarketWallet?: string | null;
  /** Optional class for the container. */
  className?: string;
  /** Size of icons in pixels (default 18). */
  iconSize?: number;
  /** Light variant (e.g. for dark backgrounds). */
  variant?: 'default' | 'light';
}

const POLYMARKET_PROFILE_BASE = 'https://polymarket.com/profile';
const X_PROFILE_BASE = 'https://x.com';

export function SocialLinks({
  xUsername,
  polymarketWallet,
  className = '',
  iconSize = 18,
  variant = 'default',
}: SocialLinksProps) {
  const handleX = xUsername?.replace(/^@/, '').trim();
  const polymarketUrl =
    polymarketWallet && `${POLYMARKET_PROFILE_BASE}/${polymarketWallet}`;

  const iconClass =
    variant === 'light'
      ? 'text-slate-400 hover:text-white'
      : 'text-slate-500 hover:text-emerald-400';
  const linkClass = `inline-flex items-center justify-center rounded-lg transition-colors ${iconClass}`;

  if (!handleX && !polymarketUrl) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {handleX && (
        <a
          href={`${X_PROFILE_BASE}/${handleX}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          style={{ width: iconSize + 4, height: iconSize + 4 }}
          title={`@${handleX} on X`}
          aria-label={`Open @${handleX} on X`}
        >
          <XLogoIcon className="w-[18px] h-[18px]" style={{ width: iconSize, height: iconSize }} />
        </a>
      )}
      {polymarketUrl && (
        <a
          href={polymarketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          style={{ width: iconSize + 4, height: iconSize + 4 }}
          title="View on Polymarket"
          aria-label="View profile on Polymarket"
        >
          <PolymarketIcon className="w-[18px] h-[18px]" style={{ width: iconSize, height: iconSize }} />
        </a>
      )}
    </div>
  );
}
