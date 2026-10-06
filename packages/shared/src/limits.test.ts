import { describe, expect, it } from 'vitest';
import { parseLimitReached } from './limits';

describe('parseLimitReached', () => {
  it('parses a Postgres error message', () => {
    expect(parseLimitReached({ message: 'LIMIT_REACHED:cards' })?.key).toBe('cards');
  });
  it('parses nested supabase-js errors and plain strings', () => {
    expect(parseLimitReached(new Error('LIMIT_REACHED:followed_players'))?.key).toBe('followed_players');
    expect(parseLimitReached('error: LIMIT_REACHED:price_alerts (P0001)')?.key).toBe('price_alerts');
    expect(parseLimitReached({ error: { message: 'LIMIT_REACHED:export' } })?.key).toBe('export');
  });
  it('returns null for other errors', () => {
    expect(parseLimitReached({ message: 'permission denied' })).toBeNull();
    expect(parseLimitReached(null)).toBeNull();
  });
});
