import { format, isSameDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TimelineEvent } from '@/types/drawer';

// ════════════════════════════════════════════════════════════════════
// groupByDay — pure helper consumed by <Timeline>
// ────────────────────────────────────────────────────────────────────
// Buckets timeline events by the calendar day of their `at` timestamp,
// relative to a `now` reference. Day groups are sorted DESC (most
// recent day first); events within each group preserve their input
// order. Events with non-parseable timestamps are dropped.
//
// Labels:
//   - 'Hoy'      when the event day === now
//   - 'Ayer'     when the event day === now - 1
//   - 'DD MMM'   for older days (Spanish locale)
//
// `day` (the bucket key) is a stable ISO date `YYYY-MM-DD` derived from
// the event timestamp — independent of locale or rendering.
// ════════════════════════════════════════════════════════════════════

export interface DayGroup {
  /** Stable ISO day key (`YYYY-MM-DD`), used by the renderer as a `:key`. */
  day: string;
  /** Localized header label: 'Hoy' | 'Ayer' | 'DD MMM'. */
  label: string;
  events: TimelineEvent[];
}

function toDate(at: string): Date | null {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date): string {
  // Build a stable YYYY-MM-DD key from the local-time components so the
  // bucket aligns with the user's perceived calendar day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function labelFor(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Hoy';
  if (isSameDay(date, subDays(now, 1))) return 'Ayer';
  return format(date, 'dd MMM', { locale: es });
}

export function groupByDay(events: TimelineEvent[], now: Date): DayGroup[] {
  const buckets = new Map<string, { date: Date; events: TimelineEvent[] }>();

  for (const event of events) {
    const date = toDate(event.at);
    if (!date) continue;
    const key = dayKey(date);
    const existing = buckets.get(key);
    if (existing) {
      existing.events.push(event);
    } else {
      buckets.set(key, { date, events: [event] });
    }
  }

  return Array.from(buckets.entries())
    .map(([day, { date, events: bucketEvents }]) => ({
      day,
      label: labelFor(date, now),
      events: bucketEvents,
    }))
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}
