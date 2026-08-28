import { PanelLoader } from '@/components/ui/Loader';

/**
 * Sits inside this role's layout, so a navigation swaps only the content region
 * — the sidebar, header and scroll position of the shell stay put. Without a
 * boundary here, the nearest one is `(dashboard)/loading.tsx`, which is *above*
 * the layout and replaces the entire chrome on every page change.
 */
export default function Loading() {
  return <PanelLoader />;
}
