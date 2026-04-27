'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const PRESETS = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
  { label: 'Tudo', value: 'all' },
];

export function DateFilter({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPeriod(period: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`${pathname}?${params.toString()}` as any);
  }

  return (
    <div className="date-filter">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          className={`date-filter-btn${current === p.value ? ' date-filter-btn-active' : ''}`}
          onClick={() => setPeriod(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
