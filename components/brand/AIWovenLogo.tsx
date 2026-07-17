import { useId, type SVGProps } from "react";

type BrandMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function AIWovenMark({ title = "AIWoven", ...props }: BrandMarkProps) {
  const id = useId().replace(/:/g, "");
  const titleId = title ? `aiwoven-mark-title-${id}` : undefined;
  const gradientId = `aiwoven-mark-gradient-${id}`;

  return (
    <svg viewBox="0 0 64 48" role={title ? "img" : undefined} aria-labelledby={titleId} aria-hidden={title ? undefined : true} {...props}>
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="8" y1="8" x2="56" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="0.52" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path
        d="M6 12.5C6 8.9 10.4 7.2 12.8 9.9L27.1 26l-6.3 7.1L7.2 17.8A8 8 0 0 1 6 12.5Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m20.8 33.1 8.1-9.2a4.2 4.2 0 0 1 6.3 0l8 9.2L55.4 18a8 8 0 0 0 1.8-5.1c0-3.7-4.6-5.3-6.9-2.4L39.5 23.9 35 18.8a4 4 0 0 0-6 0L24.5 24"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m32 3 1.45 3.55L37 8l-3.55 1.45L32 13l-1.45-3.55L27 8l3.55-1.45L32 3Z" fill="#A5F3FC" />
    </svg>
  );
}

export function AIWovenLogo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="AIWoven">
      <AIWovenMark className="h-8 w-10 shrink-0" title="AIWoven logo" />
      {compact ? null : <span className="text-[1.05rem] font-semibold tracking-[-0.035em] text-white">AIWoven</span>}
    </span>
  );
}
