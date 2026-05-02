'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { DashboardInstance } from '@/lib/types';

type Props = {
  instances: DashboardInstance[];
  currentCanal: string | null;
};

export function CanalSelector({ instances, currentCanal }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setCanal(instanceId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (instanceId) {
      params.set('canal', instanceId);
    } else {
      params.delete('canal');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`${pathname}?${params.toString()}` as any);
  }

  if (instances.length <= 1) return null;

  if (instances.length > 4) {
    return (
      <select
        className="canal-dropdown"
        value={currentCanal ?? instances[0].id}
        onChange={(e) => setCanal(e.target.value)}
      >
        {instances.map((inst) => (
          <option key={inst.id} value={inst.id}>{inst.label}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="canal-tabs">
      {instances.map((inst) => (
        <button
          key={inst.id}
          className={`canal-tab${(currentCanal ?? instances[0].id) === inst.id ? ' canal-tab-active' : ''}`}
          onClick={() => setCanal(inst.id)}
        >
          {inst.label}
        </button>
      ))}
    </div>
  );
}
