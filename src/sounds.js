/*
 * Sound effects generated with the Web Audio API (no audio files needed).
 * Browsers only allow sound after a tap, so audio is unlocked on the first play.
 */
let ctx = null;

export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}

function tone(freq, at, dur, { type = 'sine', vol = 0.3, to, attack = 0.005 } = {}, master = 1) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * master), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

const SOUNDS = {
  /* rest timer finished */
  beep: (t, v) => [0, 0.3, 0.6].forEach((d) => tone(880, t + d, 0.22, { vol: 0.35 }, v)),
  bell: (t, v) =>
    [0, 0.7].forEach((d) => {
      tone(1318, t + d, 1.4, { vol: 0.35 }, v);
      tone(2637, t + d, 0.8, { vol: 0.12 }, v);
      tone(3951, t + d, 0.4, { vol: 0.05 }, v);
    }),
  chime: (t, v) =>
    [1047, 1319, 1568, 2093].forEach((f, k) => tone(f, t + k * 0.12, 0.6, { type: 'triangle', vol: 0.3 }, v)),
  arcade: (t, v) =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, k) => tone(f, t + k * 0.08, 0.09, { type: 'square', vol: 0.1 }, v)),
  soft: (t, v) => {
    tone(660, t, 0.5, { vol: 0.25, attack: 0.06 }, v);
    tone(880, t + 0.35, 0.7, { vol: 0.25, attack: 0.06 }, v);
  },

  /* set completed */
  tick: (t, v) => tone(1800, t, 0.05, { type: 'triangle', vol: 0.3 }, v),
  pop: (t, v) => tone(380, t, 0.09, { vol: 0.4, to: 950 }, v),
  click: (t, v) => tone(2400, t, 0.025, { type: 'square', vol: 0.08 }, v),
  ding: (t, v) => tone(1568, t, 0.35, { vol: 0.25 }, v),

  /* workout finished */
  fanfare: (t, v) => {
    [523, 659, 784].forEach((f, k) => tone(f, t + k * 0.13, 0.14, { type: 'triangle', vol: 0.3 }, v));
    tone(1047, t + 0.4, 0.8, { type: 'triangle', vol: 0.35 }, v);
    tone(784, t + 0.4, 0.8, { type: 'triangle', vol: 0.18 }, v);
  },
  levelup: (t, v) =>
    [392, 523, 659, 784, 1047, 1319].forEach((f, k) =>
      tone(f, t + k * 0.07, k === 5 ? 0.5 : 0.08, { type: 'square', vol: 0.1 }, v)
    ),

  /* countdown */
  count: (t, v) => tone(660, t, 0.08, { vol: 0.25 }, v),
};

export const TIMER_SOUNDS = [
  { id: 'beep', label: 'Beep' },
  { id: 'bell', label: 'Bell' },
  { id: 'chime', label: 'Chime' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'soft', label: 'Soft' },
];
export const SET_SOUNDS = [
  { id: 'none', label: 'Off' },
  { id: 'tick', label: 'Tick' },
  { id: 'pop', label: 'Pop' },
  { id: 'click', label: 'Click' },
  { id: 'ding', label: 'Ding' },
];
export const FINISH_SOUNDS = [
  { id: 'none', label: 'Off' },
  { id: 'fanfare', label: 'Fanfare' },
  { id: 'chime', label: 'Chime' },
  { id: 'levelup', label: 'Level up' },
];

/** Play a sound by id (used for previews) */
export function play(id, volume = 0.7) {
  if (!id || id === 'none' || !SOUNDS[id] || volume <= 0) return;
  unlockAudio();
  if (!ctx) return;
  SOUNDS[id](ctx.currentTime + 0.01, volume);
}

const EVENT_KEY = { timer: 'timerSound', set: 'setSound', finish: 'finishSound' };

/** Play the sound the user picked for an app event: 'timer' | 'set' | 'finish' | 'count' */
export function sfx(event, s) {
  if (!s?.sound) return;
  if (event === 'count') {
    if (s.countdown) play('count', s.volume);
    return;
  }
  play(s[EVENT_KEY[event]], s.volume);
}