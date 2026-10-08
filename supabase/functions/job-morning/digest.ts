/** Morning digest email: pure builders, tested without network. */
import type { EmailMessage } from '../_shared/providers/email.ts';

export interface DigestRow {
  player_name: string;
  team: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  locked: boolean;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  cards_count: number;
  value_before_cents: number | null;
  value_after_cents: number | null;
}

/** Vault Score of the night (vault_score_morning). Absent when the user had no lineup. */
export interface VaultScoreSummary {
  total: number;
  counts: boolean;
  top: { name: string; fpts: number; captain: boolean } | null;
  rank: number | null;
  movement: number | null;
  leagues: { name: string; rank: number; movement: number | null }[];
}

export interface DigestInput {
  to: string;
  day: string;
  dayLabel: string;
  frequency: 'daily' | 'weekly';
  isPremium: boolean;
  rows: DigestRow[];
  unsubscribeUrl: string;
  webAppUrl: string;
  siteUrl: string;
  postalAddress: string;
  vaultScore?: VaultScoreSummary | null;
}

export function money(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`;
}

export function delta(cents: number | null | undefined): string {
  const v = cents ?? 0;
  return v === 0 ? '$0.00' : `${v > 0 ? '+' : '-'}$${(Math.abs(v) / 100).toFixed(2)}`;
}

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** "up 3", "down 1", "same place" or null without a previous rank. */
export function movementText(movement: number | null | undefined): string | null {
  if (movement === null || movement === undefined) return null;
  if (movement === 0) return 'same place';
  return movement > 0 ? `up ${movement}` : `down ${-movement}`;
}

/** One sentence per fact, reused by the email and the push. */
export function vaultScoreLines(v: VaultScoreSummary): string[] {
  const lines = [`Your lineup scored ${v.total} pts last night.`];
  if (v.top) {
    lines.push(
      `Player of the game: ${v.top.name}, ${v.top.fpts} pts${v.top.captain ? ' as captain' : ''}.`,
    );
  }
  if (!v.counts) lines.push('Preseason night: not counted in the standings.');
  else if (v.rank !== null) {
    const move = movementText(v.movement);
    lines.push(`Week rank ${v.rank}${move ? `, ${move}` : ''}.`);
  }
  for (const l of v.leagues) {
    const move = movementText(l.movement);
    lines.push(`${l.name}: rank ${l.rank}${move ? `, ${move}` : ''}.`);
  }
  return lines;
}

export function digestSubject(input: DigestInput): string {
  if (input.vaultScore) {
    const total = input.rows.reduce(
      (s, r) => s + ((r.value_after_cents ?? 0) - (r.value_before_cents ?? 0)),
      0,
    );
    return `Last night: your lineup scored ${input.vaultScore.total} pts, your cards ${
      delta(total)
    }`;
  }
  const total = input.rows.reduce(
    (s, r) => s + ((r.value_after_cents ?? 0) - (r.value_before_cents ?? 0)),
    0,
  );
  const top = input.rows.find((r) => !r.locked && r.points !== null);
  const head = top
    ? `${top.player_name} ${top.points} pts`
    : `${input.rows.length} of your players played`;
  return `Last night: ${head}, your cards ${delta(total)}`;
}

export function buildDigest(input: DigestInput): EmailMessage {
  const total = input.rows.reduce(
    (s, r) => s + ((r.value_after_cents ?? 0) - (r.value_before_cents ?? 0)),
    0,
  );
  const lockedCount = input.rows.filter((r) => r.locked).length;
  const rowsHtml = input.rows
    .map((r) => {
      const change = (r.value_after_cents ?? 0) - (r.value_before_cents ?? 0);
      const line = r.locked
        ? '<span style="color:#6a7078">Stats on Premium</span>'
        : `<strong>${r.points ?? 0} pts</strong> · ${r.rebounds ?? 0} reb · ${r.assists ?? 0} ast`;
      const cards = r.cards_count > 0
        ? `<td style="padding:10px 0;text-align:right;white-space:nowrap;color:${
          change >= 0 ? '#1f9d55' : '#d9433a'
        }">${delta(change)}<br><span style="color:#6a7078;font-size:12px">${r.cards_count} card${
          r.cards_count > 1 ? 's' : ''
        }</span></td>`
        : '<td></td>';
      return `<tr><td style="padding:10px 12px 10px 0;border-top:1px solid #e2e5e8"><strong>${
        escape(r.player_name)
      }</strong><br><span style="color:#6a7078;font-size:13px">${escape(r.away_team)} at ${
        escape(r.home_team)
      }, ${r.away_score ?? '-'}–${
        r.home_score ?? '-'
      }</span><br><span style="font-size:13px">${line}</span></td>${cards}</tr>`;
    })
    .join('');
  const weeklyNote = input.frequency === 'weekly'
    ? `<p style="margin:16px 0 0;color:#6a7078;font-size:13px">You get this digest weekly on the free plan. <a href="${input.webAppUrl}/tabs/profile" style="color:#121417">Go Premium</a> for a daily one.</p>`
    : '';
  const lockedNote = lockedCount > 0
    ? `<p style="margin:12px 0 0;color:#6a7078;font-size:13px">${lockedCount} more player${
      lockedCount > 1 ? 's' : ''
    } hidden on the free plan.</p>`
    : '';
  const v = input.vaultScore;
  const vaultHtml = v
    ? `<div style="background:#121417;color:#f2f4f5;border-radius:18px;padding:18px 20px;margin-bottom:12px">
<p style="margin:0;font-size:13px;color:#a9b0b8">Vault Score</p>
<p style="margin:4px 0 0;font-size:34px;font-weight:700;color:#e3fb4a">${v.total} pts</p>
${
      vaultScoreLines(v).slice(1).map((l) =>
        `<p style="margin:4px 0 0;font-size:13px;color:#d6dadf">${escape(l)}</p>`
      ).join('')
    }
<p style="margin:12px 0 0"><a href="${input.webAppUrl}/tabs/game" style="color:#e3fb4a;font-weight:600">Set tonight's lineup</a></p>
</div>`
    : '';
  const html =
    `<!doctype html><html><body style="margin:0;background:#edeff1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#121417">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" style="max-width:560px;background:#f7f8f9;border-radius:24px" cellspacing="0" cellpadding="0"><tr><td style="padding:28px">
<p style="margin:0;color:#6a7078;font-size:13px">${escape(input.dayLabel)}</p>
<h1 style="margin:4px 0 16px;font-size:26px">Last night</h1>
${vaultHtml}<div style="background:#e3fb4a;border-radius:18px;padding:18px 20px">
<p style="margin:0;font-size:13px">Your cards after the games</p>
<p style="margin:4px 0 0;font-size:34px;font-weight:700">${delta(total)}</p>
<p style="margin:4px 0 0;font-size:13px">${input.rows.length} of your players played</p>
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px">${rowsHtml}</table>
${lockedNote}${weeklyNote}
<p style="margin:24px 0 0"><a href="${input.webAppUrl}/tabs/last-night" style="display:inline-block;background:#121417;color:#f7f8f9;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">Open Last night</a></p>
<p style="margin:24px 0 0;color:#6a7078;font-size:12px">Values come from eBay sales and listings through CardSight AI, each labelled with its state. Not affiliated with the NBA, NBPA or Topps.<br>
<a href="${input.webAppUrl}/tabs/profile" style="color:#6a7078">Email preferences</a> · <a href="${input.unsubscribeUrl}" style="color:#6a7078">Unsubscribe</a><br>${
      escape(input.postalAddress)
    }</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    `Last night (${input.dayLabel})`,
    ...(v ? [...vaultScoreLines(v), `Set tonight's lineup: ${input.webAppUrl}/tabs/game`, ''] : []),
    `Your cards after the games: ${delta(total)} (${input.rows.length} of your players played)`,
    '',
    ...input.rows.map((r) => {
      const change = (r.value_after_cents ?? 0) - (r.value_before_cents ?? 0);
      const line = r.locked
        ? 'stats on Premium'
        : `${r.points ?? 0} pts, ${r.rebounds ?? 0} reb, ${r.assists ?? 0} ast`;
      return `- ${r.player_name}: ${line}${
        r.cards_count > 0
          ? `, your ${r.cards_count} card${r.cards_count > 1 ? 's' : ''} ${delta(change)}`
          : ''
      }`;
    }),
    '',
    `Open Last night: ${input.webAppUrl}/tabs/last-night`,
    `Unsubscribe: ${input.unsubscribeUrl}`,
    input.postalAddress,
  ].join('\n');
  return {
    to: input.to,
    subject: digestSubject(input),
    html,
    text,
    tag: 'digest',
    headers: {
      'List-Unsubscribe': `<${input.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}
