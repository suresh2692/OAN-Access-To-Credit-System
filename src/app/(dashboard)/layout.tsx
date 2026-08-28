import { SmoothScroll } from '@/components/SmoothScroll';
import { IdleSessionWatcher } from '@/features/auth/components/IdleSessionWatcher';
import '@/styles/main-layout.scss';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mounted once for the whole authenticated area, so the idle countdown
          survives navigation between pages instead of restarting on each one. */}
      <IdleSessionWatcher />
      {/* Same reasoning: one smooth-scroll instance for every role's shell,
          rather than one per layout. Renders nothing. */}
      <SmoothScroll />
      {children}
    </>
  );
}
