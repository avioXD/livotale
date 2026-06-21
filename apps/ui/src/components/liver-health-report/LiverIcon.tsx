/** Anatomical liver silhouette — path from human-body-organs-mapping-library (UBERON_0002107) */
const LIVER_PATH =
  'M49.906 60.95c-1.128-.264-2.948-.374-4.814-.323-1.98.054-2.246.372-2.972 1.076-.703.68-1.838 2.182-1.775 4.328.092 3.186.265 8.503 1.18 8.603 1.798.195 5.91-3.182 7.714-3.863.991-.373 2.342-1.328 3.024-1.54.9-.278.872-.717 2.254-1.217 2.489-.902 3.01-.726 4.998-2.058 1.316-.881 2.68-1.244 2.343-2.625-.235-.965-3.519-1.391-5.015-1.775-1.302-.334-3.296-.357-4.642-.357-.554 0-1.179-.035-2.295-.25z';

interface LiverIconProps {
  className?: string;
  variant?: 'healthy' | 'fatty' | 'fibrosis' | 'cirrhosis';
}

const FILL: Record<NonNullable<LiverIconProps['variant']>, string> = {
  healthy: '#4ade80',
  fatty: '#fbbf24',
  fibrosis: '#fb923c',
  cirrhosis: '#f87171',
};

const STROKE: Record<NonNullable<LiverIconProps['variant']>, string> = {
  healthy: '#15803d',
  fatty: '#b45309',
  fibrosis: '#c2410c',
  cirrhosis: '#b91c1c',
};

export function LiverIcon({ className = 'h-12 w-16', variant = 'healthy' }: LiverIconProps) {
  return (
    <svg
      viewBox="38 58 30 18"
      className={className}
      aria-hidden
      role="img"
    >
      <path
        d={LIVER_PATH}
        fill={FILL[variant]}
        stroke={STROKE[variant]}
        strokeWidth={0.35}
        strokeLinejoin="round"
      />
    </svg>
  );
}
