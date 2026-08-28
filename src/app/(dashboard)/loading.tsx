import { PanelLoader } from '@/components/ui/Loader';

/**
 * Fallback for the authenticated area as a whole — reached when the *shell*
 * itself is still resolving (a cold entry into the dashboard). Navigation
 * between pages inside one role's shell resolves against the per-role
 * `loading.tsx` next to that role's layout instead, so the sidebar and header
 * stay on screen rather than being replaced by a spinner.
 */
export default function DashboardLoading() {
  return <PanelLoader label="Loading your workspace…" />;
}
