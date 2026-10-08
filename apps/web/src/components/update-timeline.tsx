/**
 * The nightly cycle, in Eastern time, as the jobs actually run (supabase/migrations cron:
 * stats 5:00 AM, prices 5:30 AM, morning report 8:00 AM).
 */
const STEPS = [
  { at: 'Final buzzer', what: 'The last game of the night ends, usually before 1:00 AM.' },
  { at: '5:00 AM', what: 'Box scores come in: every stat line of the night, player by player.' },
  {
    at: '5:30 AM',
    what: 'Prices refresh: eBay auction sales and asking prices through CardSight AI, Base first, then the parallels collectors watch.',
  },
  {
    at: '8:00 AM',
    what: 'Your report: how each of your players played and where your cards stand, in the app and by email.',
  },
] as const;

export function UpdateTimeline() {
  return (
    <ol className="timeline" aria-label="Nightly update schedule, Eastern time">
      {STEPS.map((s) => (
        <li key={s.at} className="timeline__step">
          <span className="timeline__at">{s.at}</span>
          <span className="timeline__what">{s.what}</span>
        </li>
      ))}
    </ol>
  );
}
