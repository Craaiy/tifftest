import { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import { fmtTime } from './utils.js';

const TimerCtx = createContext(null);
export const useTimer = () => useContext(TimerCtx);

// Browsers only allow sound after a user tap, so audio is "unlocked" when a timer starts
let audioCtx = null;
function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume?.();
  } catch {}
}
function beep() {
  if (!audioCtx) return;
  [0, 0.3, 0.6].forEach((t) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = 880;
    o.connect(g);
    g.connect(audioCtx.destination);
    const at = audioCtx.currentTime + t;
    g.gain.setValueAtTime(0.3, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
    o.start(at);
    o.stop(at + 0.25);
  });
}

export function TimerProvider({ children }) {
  const { data } = useStore();
  const settings = data.settings;
  const [timer, setTimer] = useState(null); // { endAt, total, label, done }
  const [now, setNow] = useState(Date.now());
  const remaining = timer ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  // Time's up → sound + vibration
  useEffect(() => {
    if (!timer || timer.done || remaining > 0) return;
    if (settings.sound) beep();
    if (settings.vibrate) navigator.vibrate?.([300, 150, 300]);
    setTimer((t) => t && { ...t, done: true });
  }, [remaining, timer]);

  // Hide the "rest over" message after a few seconds
  useEffect(() => {
    if (!timer?.done) return;
    const id = setTimeout(() => setTimer(null), 6000);
    return () => clearTimeout(id);
  }, [timer?.done]);

  const value = {
    timer,
    remaining,
    start(seconds, label = '') {
      unlockAudio();
      setNow(Date.now());
      setTimer({ endAt: Date.now() + seconds * 1000, total: seconds, label, done: false });
    },
    add(seconds) {
      setTimer((t) =>
        t && {
          ...t,
          endAt: Math.max(Date.now(), t.endAt + seconds * 1000),
          total: Math.max(1, t.total + seconds),
          done: false,
        }
      );
    },
    stop: () => setTimer(null),
  };

  return <TimerCtx.Provider value={value}>{children}</TimerCtx.Provider>;
}

export function RestTimer() {
  const { timer, remaining, add, stop } = useTimer();
  if (!timer) return null;
  const pct = timer.done ? 100 : (1 - remaining / timer.total) * 100;

  return (
    <div className={'rest-timer' + (timer.done ? ' done' : '')}>
      <div className="rest-progress" style={{ width: pct + '%' }} />
      <div className="rest-inner">
        <div>
          <div className="rest-label">
            {timer.done ? 'Rest over. Next set! 💪' : `Rest${timer.label ? ' · ' + timer.label : ''}`}
          </div>
          {!timer.done && <div className="rest-time">{fmtTime(remaining)}</div>}
        </div>
        <div className="row gap">
          {!timer.done && (
            <>
              <button className="btn small ghost" onClick={() => add(-15)}>−15</button>
              <button className="btn small ghost" onClick={() => add(15)}>+15</button>
            </>
          )}
          <button className="btn small secondary" onClick={stop}>{timer.done ? 'Close' : 'Skip'}</button>
        </div>
      </div>
    </div>
  );
}