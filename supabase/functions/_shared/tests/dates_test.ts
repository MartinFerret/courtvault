import { assertEquals } from '@std/assert';
import { addDays, easternHourOf, previousEasternDay, toEasternDay } from '../dates.ts';

Deno.test('eastern day rolls over at midnight New York, not UTC', () => {
  // 03:30 UTC on Oct 5 is still 23:30 on Oct 4 in New York (EDT).
  const d = new Date('2026-10-05T03:30:00Z');
  assertEquals(toEasternDay(d), '2026-10-04');
  assertEquals(previousEasternDay(d), '2026-10-03');
  assertEquals(easternHourOf(d), 23);
  // Winter (EST): 10:00 UTC = 5 AM.
  assertEquals(easternHourOf(new Date('2027-01-15T10:00:00Z')), 5);
  assertEquals(easternHourOf(new Date('2027-01-15T09:00:00Z')), 4);
});

Deno.test('addDays handles month boundaries', () => {
  assertEquals(addDays('2026-03-01', -1), '2026-02-28');
  assertEquals(addDays('2026-12-31', 1), '2027-01-01');
});
