import { assertEquals, assertMatch } from '@std/assert';
import { brevoPayload, LogEmailProvider, parseSender } from '../providers/email.ts';
import {
  buildDigest,
  digestSubject,
  movementText,
  vaultScoreLines,
} from '../../job-morning/digest.ts';

Deno.test('parseSender reads "Name <email>" and bare addresses', () => {
  assertEquals(parseSender('HoopTicker <hello@hoopticker.com>'), {
    name: 'HoopTicker',
    email: 'hello@hoopticker.com',
  });
  assertEquals(parseSender('hello@hoopticker.com'), {
    name: 'HoopTicker',
    email: 'hello@hoopticker.com',
  });
});

Deno.test('brevoPayload matches the transactional email contract', () => {
  const payload = brevoPayload(
    {
      to: 'a@b.co',
      subject: 'S',
      html: '<p>h</p>',
      text: 't',
      tag: 'digest',
      headers: { 'List-Unsubscribe': '<u>' },
    },
    { name: 'HoopTicker', email: 'hello@hoopticker.com' },
  );
  assertEquals(payload.to, [{ email: 'a@b.co' }]);
  assertEquals(payload.htmlContent, '<p>h</p>');
  assertEquals(payload.textContent, 't');
  assertEquals(payload.tags, ['digest']);
  assertEquals(payload.headers, { 'List-Unsubscribe': '<u>' });
});

const input = {
  to: 'a@b.co',
  day: '2026-10-06',
  dayLabel: 'Tue, Oct 6',
  frequency: 'weekly' as const,
  isPremium: false,
  rows: [
    {
      player_name: 'Cooper Flagg',
      team: 'DAL',
      home_team: 'San Antonio Spurs',
      away_team: 'Dallas Mavericks',
      home_score: 112,
      away_score: 118,
      locked: false,
      points: 32,
      rebounds: 9,
      assists: 5,
      cards_count: 3,
      value_before_cents: 10000,
      value_after_cents: 16500,
    },
    {
      player_name: 'Stephen Curry',
      team: 'GSW',
      home_team: 'Los Angeles Lakers',
      away_team: 'Golden State Warriors',
      home_score: 121,
      away_score: 109,
      locked: true,
      points: null,
      rebounds: null,
      assists: null,
      cards_count: 1,
      value_before_cents: 1200,
      value_after_cents: 1180,
    },
  ],
  unsubscribeUrl: 'https://x.supabase.co/functions/v1/unsubscribe?token=t&scope=digest',
  webAppUrl: 'https://app.hoopticker.com',
  siteUrl: 'https://hoopticker.com',
  postalAddress: 'HoopTicker, somewhere',
};

Deno.test('digest subject leads with the best line and the total change', () => {
  assertEquals(digestSubject(input), 'Last night: Cooper Flagg 32 pts, your cards +$64.80');
});

Deno.test('digest carries unsubscribe headers, the weekly note and locked rows', () => {
  const m = buildDigest(input);
  assertEquals(m.headers?.['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assertMatch(m.html, /weekly on the free plan/);
  assertMatch(m.html, /Stats on Premium/);
  assertMatch(m.html, /1 more player hidden/);
  assertMatch(m.text, /Unsubscribe: https:\/\/x\.supabase\.co/);
  assertMatch(m.text, /HoopTicker, somewhere/);
});

Deno.test('log provider counts every message as sent', async () => {
  const p = new LogEmailProvider();
  const r = await p.send([buildDigest(input)]);
  assertEquals(r, { sent: 1, failed: 0, invalid: [] });
  assertEquals(p.sent.length, 1);
});

const vaultScore = {
  total: 184.5,
  counts: true,
  top: { name: 'Victor Wembanyama', fpts: 65.3, captain: false },
  rank: 12,
  movement: 4,
  leagues: [{ name: 'Friday Night Hoops', rank: 1, movement: 0 }],
};

Deno.test('Vault Score leads the subject and the email when the user had a lineup', () => {
  const withScore = { ...input, vaultScore };
  assertEquals(
    digestSubject(withScore),
    'Last night: your lineup scored 184.5 pts, your cards +$64.80',
  );
  const m = buildDigest(withScore);
  assertMatch(m.html, /184\.5 pts/);
  assertMatch(m.html, /Player of the game: Victor Wembanyama, 65\.3 pts\./);
  assertMatch(m.text, /Week rank 12, up 4\./);
  assertMatch(m.text, /Friday Night Hoops: rank 1, same place\./);
});

Deno.test('preseason scores say they are not counted', () => {
  const lines = vaultScoreLines({ ...vaultScore, counts: false, rank: null, movement: null });
  assertEquals(lines[2], 'Preseason night: not counted in the standings.');
  assertEquals(movementText(-2), 'down 2');
  assertEquals(movementText(null), null);
});
