import { CalendarDate, getLocalTimeZone, type DateValue } from '@internationalized/date';

// ════════════════════════════════════════════════════════════════════
// Native Date ⇄ @internationalized/date conversion
// ────────────────────────────────────────────────────────────────────
// reka-ui Calendar / RangeCalendar primitives use `DateValue` from
// `@internationalized/date` (CalendarDate, timezone-naive). The
// `<DatePicker>` keeps its external API in native `Date` objects so
// consumers don't need to learn another type system; this helper does
// the round-trip.
// ════════════════════════════════════════════════════════════════════

/** Convert a JS `Date` (or null) to a CalendarDate suitable for reka-ui. */
export function toDateValue(d: Date | null | undefined): DateValue | undefined {
  if (!d || Number.isNaN(d.getTime())) return undefined;
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Convert a CalendarDate (or undefined) back to a native Date at midnight local time. */
export function fromDateValue(dv: DateValue | undefined | null): Date | null {
  if (!dv) return null;
  return dv.toDate(getLocalTimeZone());
}

export type { DateValue };
