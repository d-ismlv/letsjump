// Small inline SVG weather icons. Colours are intrinsic (fixed hex) so they read
// the same in light and dark mode, independent of surrounding text colour.

type IconProps = { className?: string };

const base = "inline-block shrink-0";

const SUN = "#f59e0b"; // amber-500
const CLOUD = "#94a3b8"; // slate-400
const CLOUD_HEAVY = "#64748b"; // slate-500
const RAIN = "#38bdf8"; // sky-400
const BOLT = "#facc15"; // yellow-400

// One canonical cloud, reused by every cloudy icon so they share a footprint.
const CLOUD_D =
  "M7 16.8h8.6a3.2 3.2 0 0 0 .4-6.36A4.7 4.7 0 0 0 7.4 9.9 3.15 3.15 0 0 0 7 16.8Z";

export function SunIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <circle cx="12" cy="12" r="4.6" fill={SUN} />
      <g stroke={SUN} strokeWidth="1.9" strokeLinecap="round">
        <path d="M12 3.4v2.1M12 18.5v2.1M5.1 5.1l1.5 1.5M17.4 17.4l1.5 1.5M3.4 12h2.1M18.5 12h2.1M5.1 18.9l1.5-1.5M17.4 6.6l1.5-1.5" />
      </g>
    </svg>
  );
}

export function PartlyCloudyIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <circle cx="9" cy="8.5" r="3.1" fill={SUN} />
      <g stroke={SUN} strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 2.6v1.5M3.4 8.5h1.5M4.9 4.4l1.1 1.1M13.1 4.4l-1.1 1.1" />
      </g>
      <path d={CLOUD_D} fill={CLOUD} />
    </svg>
  );
}

export function CloudIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <path d={CLOUD_D} fill={CLOUD_HEAVY} />
    </svg>
  );
}

export function RainIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <path d={CLOUD_D} fill={CLOUD_HEAVY} />
      <g stroke={RAIN} strokeWidth="1.8" strokeLinecap="round">
        <path d="M8.5 18l-1 2.4M12 18l-1 2.4M15.5 18l-1 2.4" />
      </g>
    </svg>
  );
}

export function BoltIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden fill="none">
      <path d={CLOUD_D} fill={CLOUD_HEAVY} />
      <path d="M12.3 15 9 20.2h2.5l-.5 3.3 3.2-5.3h-2.4l.5-3.2Z" fill={BOLT} />
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
