// Synthesizes the video's sound effects (original, no samples, no license needed):
// node tools/sfx.mjs -> public/sfx/*.wav (44.1 kHz, 16-bit mono).
import {writeFileSync} from 'node:fs';
const SR = 44100;
const wav = (name, seconds, fn) => {
  const n = Math.round(SR * seconds);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  let seed = 7;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.max(-1, Math.min(1, fn(t, noise, (x, k) => (lp += k * (x - lp)))));
    buf.writeInt16LE(Math.round(v * 32000), 44 + i * 2);
  }
  writeFileSync(new URL(`../public/sfx/${name}.wav`, import.meta.url), buf);
};
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const sin = (f, t) => Math.sin(2 * Math.PI * f * t);

// Message notification: two soft bell tones.
wav('notify', 0.7, (t) => {
  const tone = (f, s) => (t < s ? 0 : env(t - s, 0.004, 0.16) * (sin(f, t - s) + 0.35 * sin(f * 2.01, t - s)));
  return 0.42 * (tone(1318.5, 0) + tone(1760, 0.11));
});
// Bubble pop: fast downward sine sweep.
wav('pop', 0.14, (t) => {
  const f = 900 * Math.exp(-t * 28) + 380;
  return 0.6 * env(t, 0.002, 0.035) * Math.sin(2 * Math.PI * f * t);
});
// Sent: short upward swoosh tone.
wav('send', 0.18, (t) => 0.4 * env(t, 0.003, 0.05) * Math.sin(2 * Math.PI * (500 + 2600 * t) * t));
// Ticker blip: two quick square beeps.
wav('blip', 0.32, (t) => {
  const sq = (f, s) => (t < s || t > s + 0.07 ? 0 : Math.sign(sin(f, t)) * env(t - s, 0.002, 0.04));
  return 0.22 * (sq(1975, 0) + sq(2637, 0.11));
});
// Whoosh: band of noise sweeping up then down.
wav('whoosh', 0.6, (t, noise, low) => {
  const k = 0.03 + 0.25 * Math.sin(Math.PI * Math.min(1, t / 0.6));
  return 1.1 * Math.sin(Math.PI * Math.min(1, t / 0.6)) ** 2 * low(noise(), k);
});
// Arena buzzer: harsh detuned saw, flat then cut.
wav('buzzer', 1.0, (t) => {
  const saw = (f) => 2 * ((t * f) % 1) - 1;
  const e = Math.min(1, t / 0.01) * (t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.15) : 1);
  return 0.32 * e * Math.tanh(2.5 * (saw(196) + saw(198.5) + 0.6 * saw(392)));
});
console.log('sfx written');
