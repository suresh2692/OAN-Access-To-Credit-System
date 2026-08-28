import { Award, CheckCircle2, Clock, FileCheck, FileText, LucideIcon, XCircle } from 'lucide-react';

export interface StageCardIcon {
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  /** Tone name used by the dashboard's own card component. */
  tone: 'blue' | 'cyan' | 'green' | 'orange' | 'red' | 'indigo' | 'emerald';
}

/**
 * Picks an icon for a pipeline stage card.
 *
 * Keyword matching on the label is a presentation-only heuristic: stage names
 * are tenant free text, so a bank is free to call a stage anything and this will
 * fall through to the archetype, and then to a neutral default. Nothing here
 * ever becomes a filter value — only a colour and a glyph.
 */
export function getStageCardIcon(label: string, archetype?: string): StageCardIcon {
  const lower = label.toLowerCase();
  if (lower.includes('submit')) {
    return { icon: FileText, iconBgColor: 'bg-blue-100', iconColor: 'text-blue-500', tone: 'blue' };
  }
  if (lower.includes('verif') || lower.includes('doc') || lower.includes('kyc')) {
    return { icon: FileCheck, iconBgColor: 'bg-indigo-100', iconColor: 'text-indigo-500', tone: 'indigo' };
  }
  if (lower.includes('underwrit') || lower.includes('review') || lower.includes('process')) {
    return { icon: Clock, iconBgColor: 'bg-cyan-100', iconColor: 'text-cyan-500', tone: 'cyan' };
  }
  if (lower.includes('approv') || lower.includes('grant') || lower.includes('sanction')) {
    return { icon: CheckCircle2, iconBgColor: 'bg-emerald-100', iconColor: 'text-emerald-500', tone: 'emerald' };
  }
  if (lower.includes('disburs') || lower.includes('complet')) {
    return { icon: Award, iconBgColor: 'bg-green-100', iconColor: 'text-green-500', tone: 'green' };
  }
  if (lower.includes('reject') || lower.includes('declin') || lower.includes('cancel')) {
    return { icon: XCircle, iconBgColor: 'bg-red-100', iconColor: 'text-red-500', tone: 'red' };
  }
  if (archetype === 'Completed') {
    return { icon: Award, iconBgColor: 'bg-green-100', iconColor: 'text-green-500', tone: 'green' };
  }
  if (archetype === 'Rejected' || archetype === 'Cancelled') {
    return { icon: XCircle, iconBgColor: 'bg-red-100', iconColor: 'text-red-500', tone: 'red' };
  }
  return { icon: FileText, iconBgColor: 'bg-cyan-100', iconColor: 'text-cyan-500', tone: 'cyan' };
}
