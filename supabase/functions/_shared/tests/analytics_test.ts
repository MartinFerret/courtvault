import { assertEquals } from '@std/assert';
import { serverEventBody } from '../analytics.ts';

Deno.test('server events carry the user id as distinct id and our library tag', () => {
  const body = serverEventBody(
    'phc_test',
    'premium_started',
    'user-1',
    { plan: 'yearly' },
    new Date('2026-10-09T12:00:00Z'),
  );
  assertEquals(body, {
    api_key: 'phc_test',
    event: 'premium_started',
    distinct_id: 'user-1',
    properties: { plan: 'yearly', $lib: 'hoopticker-edge' },
    timestamp: '2026-10-09T12:00:00.000Z',
  });
});
