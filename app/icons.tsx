// Small inline SVG weather icons. Colours are intrinsic (fixed hex) so they read
// the same in light and dark mode, independent of surrounding text colour.

type IconProps = { className?: string };

const base = "inline-block shrink-0";

const SUN = "#f59e0b"; // amber-500
const CLOUD = "#94a3b8"; // slate-400
const CLOUD_HEAVY = "#64748b"; // slate-500
const RAIN = "#38bdf8"; // sky-400
const BOLT = "#facc15"; // yellow-400

export function SunIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <circle cx="12" cy="12" r="4" fill={SUN} />
      <g stroke={SUN} strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
      </g>
    </svg>
  );
}

export function PartlyCloudyIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <circle cx="8.5" cy="8" r="3.2" fill={SUN} />
      <g stroke={SUN} strokeWidth="1.4" strokeLinecap="round">
        <path d="M8.5 1.8v1.6M3.6 8h-1.6M4.2 3.7l1.1 1.1M12.8 3.7l-1.1 1.1" />
      </g>
      <path
        d="M8 19h9a3.2 3.2 0 0 0 .3-6.4A4.6 4.6 0 0 0 8.3 13 3 3 0 0 0 8 19Z"
        fill={CLOUD}
      />
    </svg>
  );
}

export function CloudIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <path
        d="M7 18h10a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.5 11 3.3 3.3 0 0 0 7 18Z"
        fill={CLOUD_HEAVY}
      />
    </svg>
  );
}

export function RainIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <path
        d="M7 15h10a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.5 8 3.3 3.3 0 0 0 7 15Z"
        fill={CLOUD_HEAVY}
      />
      <g stroke={RAIN} strokeWidth="1.8" strokeLinecap="round">
        <path d="M8.5 18l-1 2.5M12 18l-1 2.5M15.5 18l-1 2.5" />
      </g>
    </svg>
  );
}

export function BoltIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <path
        d="M7 14h9a3.3 3.3 0 0 0 .4-6.6A4.8 4.8 0 0 0 7.5 7 3.1 3.1 0 0 0 7 14Z"
        fill={CLOUD_HEAVY}
      />
      <path d="M12 12.5 8.5 17.5h2.6l-.6 4 3.5-5.5h-2.6l.7-3.5Z" fill={BOLT} />
    </svg>
  );
}

export function DropletIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <path
        d="M12 3.5s5 5.6 5 9.2a5 5 0 0 1-10 0c0-3.6 5-9.2 5-9.2Z"
        fill={RAIN}
      />
    </svg>
  );
}

// Arrow points in the direction the wind is blowing TO (bearing is FROM).
// Stays currentColor so it inherits the muted table text colour.
export function WindArrow({
  bearingDeg,
  className = "",
}: {
  bearingDeg: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${base} ${className}`}
      aria-hidden
      fill="none"
      style={{ transform: `rotate(${bearingDeg + 180}deg)` }}
    >
      <path d="M12 3.5l4.5 10-4.5-2.6-4.5 2.6L12 3.5Z" fill="currentColor" />
      <path d="M12 10.9v9.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Pick the sky icon for an hour from cloud cover + rain.
export function skyIconFor(
  cloudTotal: number,
  precipMmH: number,
): (props: IconProps) => React.JSX.Element {
  if (precipMmH >= 0.1) return RainIcon;
  if (cloudTotal >= 80) return CloudIcon;
  if (cloudTotal >= 35) return PartlyCloudyIcon;
  return SunIcon;
}
