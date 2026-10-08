import { assertEquals } from 'jsr:@std/assert@1';
import { findBasketballSets, robotsDisallows, toFoundSet } from '../releases.ts';

Deno.test('findBasketballSets picks basketball products from the season onward, once each', () => {
  const html = `<ul><li><a>2026-27 Topps Basketball Checklist</a></li>
    <li>2026-27 Topps Chrome&amp; Basketball</li><li>2025-26 Topps Chrome Basketball</li>
    <li>2026 Topps Chrome Baseball</li><li>2026-27 Topps Basketball</li></ul>`;
  assertEquals(findBasketballSets(html), [
    { slug: '2026-27-topps-basketball', name: 'Topps', season: '2026-27' },
    { slug: '2026-27-topps-chrome-basketball', name: 'Topps Chrome&', season: '2026-27' },
  ]);
});

Deno.test('toFoundSet strips marks and the trailing word', () => {
  assertEquals(toFoundSet('2026-27', 'Topps Chrome® Basketball'), {
    slug: '2026-27-topps-chrome-basketball',
    name: 'Topps Chrome',
    season: '2026-27',
  });
});

Deno.test('robotsDisallows reads the wildcard and the named group', () => {
  assertEquals(robotsDisallows('User-agent: *\nDisallow: /pages/', '/pages/checklists'), true);
  assertEquals(robotsDisallows('User-agent: *\nDisallow: /cart', '/pages/checklists'), false);
  assertEquals(
    robotsDisallows('User-agent: HoopTickerBot\nDisallow: /', '/pages/checklists'),
    true,
  );
  assertEquals(
    robotsDisallows(
      'User-agent: *\nDisallow: /pages/\nAllow: /pages/checklists',
      '/pages/checklists',
    ),
    false,
  );
  assertEquals(robotsDisallows('', '/pages/checklists'), false);
});
