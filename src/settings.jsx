import { useRef, useState } from 'react';
import { useStore, DEFAULT_SETTINGS } from './store.jsx';
import { useTimer } from './timer.jsx';
import { todayKey } from './utils.js';
import { THEMES, ACCENTS, FONT_SIZES } from './theme.js';
import { TIMER_SOUNDS, SET_SOUNDS, FINISH_SOUNDS, play } from './sounds.js';

const STATUS = {
  'signed-out': 'Not signed in',
  pending: 'Changes waiting…',
  syncing: 'Syncing…',
  synced: '✓ All changes synced',
  error: '⚠️ Sync error',
};
const REST_PRESETS = [60, 90, 120, 180];
const LOOK_KEYS = [
  'theme', 'accent', 'fontSize', 'reduceMotion',
  'sound', 'volume', 'timerSound', 'setSound', 'finishSound', 'countdown', 'vibrate',
];

export default function Settings({ onBack }) {
  const { data, updateSettings, importData, resetData, cloud } = useStore();
  const timer = useTimer();
  const s = data.settings;
  const fileRef = useRef();
  const accent = (s.accent || '').toLowerCase();
  const isPreset = ACCENTS.some((a) => a.color === accent);

  const resetLook = () => {
    if (!confirm('Reset theme, colours and sounds to default?')) return;
    updateSettings(Object.fromEntries(LOOK_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fittrack-backup-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      if (!Array.isArray(obj.exercises) || !Array.isArray(obj.workouts)) throw new Error();
      if (confirm('Replace all current data with this backup?')) importData(obj);
    } catch {
      alert('Invalid backup file.');
    }
    e.target.value = '';
  };

  return (
    <div>
      <button className="link" onClick={onBack}>‹ Profile</button>
      <h2>Settings</h2>

      {/* ---------- Appearance ---------- */}
      <h3>🎨 Theme & colours</h3>
      <div className="card">
        <div className="theme-preview">
          <div className="tp-card">
            <div className="tp-head">
              <strong>Bench Press</strong>
              <span className="status busy">1/2 sets</span>
            </div>
            <div className="tp-row done"><span>1</span><span>80 kg × 8</span><span className="check on">✓</span></div>
            <div className="tp-row"><span>2</span><span>80 kg × 8</span><span className="check">✓</span></div>
            <button className="btn small primary full">▶ Start exercise</button>
          </div>
        </div>

        <label className="field-label">Theme</label>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={'theme-tile' + (s.theme === t.id ? ' on' : '')}
              onClick={() => updateSettings(t.accent ? { theme: t.id, accent: t.accent } : { theme: t.id })}
            >
              <span className="tt-preview" style={{ background: t.bg }}>
                <span className="tt-card" style={{ background: t.card }}>
                  <span className="tt-dot" style={{ background: t.accent || s.accent }} />
                </span>
              </span>
              <span className="tt-label">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="muted small">Colour themes (Ocean, Forest…) also pick a matching accent colour. You can still change it below.</p>

        <label className="field-label">Accent colour</label>
        <div className="swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.color}
              title={a.name}
              aria-label={a.name}
              className={'swatch' + (accent === a.color ? ' on' : '')}
              style={{ '--c': a.color }}
              onClick={() => updateSettings({ accent: a.color })}
            />
          ))}
          <label className={'swatch custom' + (!isPreset ? ' on' : '')} title="Custom colour">
            <input type="color" value={s.accent} onChange={(e) => updateSettings({ accent: e.target.value })} />
          </label>
        </div>

        <label className="field-label">Text size</label>
        <div className="segment">
          {Object.entries(FONT_SIZES).map(([id, f]) => (
            <button key={id} className={s.fontSize === id ? 'active' : ''} onClick={() => updateSettings({ fontSize: id })}>
              {f.label}
            </button>
          ))}
        </div>

        <Toggle
          label="Reduce animations"
          hint="Turns off swipe and fade effects"
          checked={s.reduceMotion}
          onChange={(v) => updateSettings({ reduceMotion: v })}
        />
      </div>

      {/* ---------- Account ---------- */}
      <h3>☁️ Account & cloud sync</h3>
      <Account />

      {/* ---------- Sounds ---------- */}
      <h3>🔊 Sounds & haptics</h3>
      <div className="card">
        <Toggle label="Sound effects" checked={s.sound} onChange={(v) => updateSettings({ sound: v })} />

        {s.sound && (
          <>
            <label className="field-label">Volume</label>
            <div className="row gap volume">
              <span>🔈</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={s.volume}
                onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
                onPointerUp={(e) => play('ding', Number(e.currentTarget.value))}
              />
              <span>🔊</span>
              <span className="muted small vol-num">{Math.round(s.volume * 100)}%</span>
            </div>

            <SoundPicker label="⏱ Rest timer finished" options={TIMER_SOUNDS} value={s.timerSound} volume={s.volume}
              onChange={(id) => updateSettings({ timerSound: id })} />
            <SoundPicker label="✓ Set completed" options={SET_SOUNDS} value={s.setSound} volume={s.volume}
              onChange={(id) => updateSettings({ setSound: id })} />
            <SoundPicker label="🏁 Workout finished" options={FINISH_SOUNDS} value={s.finishSound} volume={s.volume}
              onChange={(id) => updateSettings({ finishSound: id })} />
            <p className="muted small">Tap a sound to select it and hear a preview.</p>

            <Toggle
              label="Countdown beeps"
              hint="Short beeps in the last 3 seconds of rest"
              checked={s.countdown}
              onChange={(v) => updateSettings({ countdown: v })}
            />
          </>
        )}

        <Toggle
          label="Vibration"
          hint="When ticking a set, swiping and when rest is over (Android only)"
          checked={s.vibrate}
          onChange={(v) => updateSettings({ vibrate: v })}
        />
        <button className="btn small ghost mt" onClick={resetLook}>↺ Reset appearance & sounds</button>
      </div>

      {/* ---------- Rest timer ---------- */}
      <h3>⏱ Rest timer</h3>
      <div className="card">
        <div className="row space">
          <span>Default rest</span>
          <div className="stepper no-auto">
            <button onClick={() => updateSettings({ restSeconds: Math.max(15, s.restSeconds - 15) })}>−</button>
            <span>{s.restSeconds}s</span>
            <button onClick={() => updateSettings({ restSeconds: Math.min(600, s.restSeconds + 15) })}>+</button>
          </div>
        </div>
        <div className="quick mt">
          {REST_PRESETS.map((p) => (
            <button
              key={p}
              className={'chip-btn' + (s.restSeconds === p ? ' on' : '')}
              onClick={() => updateSettings({ restSeconds: p })}
            >
              {p}s
            </button>
          ))}
        </div>
        <p className="muted small">You can also set a custom rest per exercise via the ⋯ button on an exercise.</p>
        <Toggle label="Start automatically" hint="Starts when you tick off a set" checked={s.autoTimer}
          onChange={(v) => updateSettings({ autoTimer: v })} />
        <button className="btn small secondary mt" onClick={() => timer.start(5, 'Test')}>Test timer (5s)</button>
      </div>

      {/* ---------- Workouts ---------- */}
      <h3>🏋️ Workouts</h3>
      <div className="card">
        <div className="row space">
          <span>Default sets</span>
          <div className="stepper no-auto">
            <button onClick={() => updateSettings({ defaultSets: Math.max(1, s.defaultSets - 1) })}>−</button>
            <span>{s.defaultSets}</span>
            <button onClick={() => updateSettings({ defaultSets: Math.min(10, s.defaultSets + 1) })}>+</button>
          </div>
        </div>
        <div className="row space mt">
          <span>Default reps</span>
          <div className="stepper no-auto">
            <button onClick={() => updateSettings({ defaultReps: Math.max(1, s.defaultReps - 1) })}>−</button>
            <span>{s.defaultReps}</span>
            <button onClick={() => updateSettings({ defaultReps: Math.min(100, s.defaultReps + 1) })}>+</button>
          </div>
        </div>
        <p className="muted small">Used when you add a new exercise to a routine or workout.</p>
      </div>

      {/* ---------- AI coach ---------- */}
      <h3>✨ AI coach</h3>
      <div className="card">
        <p className="muted small">
          The coach runs in <strong>demo mode</strong> with built-in advice: progression tips based on your
          history (strength and cardio), form cues, superset ideas and answers to common questions.
        </p>
        <p className="muted small">Tip: set your goal and log your body weight in Profile. The coach uses them.</p>
      </div>

      {/* ---------- Data ---------- */}
      <h3>💾 Data</h3>
      <div className="card">
        <div className="row gap wrap">
          <button className="btn small secondary" onClick={exportData}>Export backup</button>
          <button className="btn small secondary" onClick={() => fileRef.current.click()}>Import backup</button>
          <button
            className="btn small danger"
            onClick={() =>
              confirm(`Delete ALL data${cloud.user ? ' on this device AND in your account' : ''}? This cannot be undone.`) &&
              resetData()
            }
          >
            Reset all
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
        </div>
      </div>
      <p className="muted small center">FitTrack v3 · demo mode</p>
    </div>
  );
}

function SoundPicker({ label, options, value, volume, onChange }) {
  return (
    <>
      <label className="field-label">{label}</label>
      <div className="quick">
        {options.map((o) => (
          <button
            key={o.id}
            className={'chip-btn' + (value === o.id ? ' on' : '')}
            onClick={() => {
              onChange(o.id);
              play(o.id, volume);
            }}
          >
            {o.id === 'none' ? '🔇' : '▶'} {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

function Account() {
  const { cloud } = useStore();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const demoNote = (
    <p className="muted small">🧪 Demo mode: accounts and cloud data are simulated and stored in this browser only.</p>
  );

  if (cloud.user) {
    return (
      <div className="card">
        <strong>{cloud.user.email}</strong>
        <div className="small muted">{STATUS[cloud.status] ?? cloud.status}</div>
        {cloud.status === 'error' && <p className="small error-text">{cloud.error}</p>}
        <div className="row gap mt">
          <button className="btn small secondary" onClick={cloud.syncNow}>Sync now</button>
          <button
            className="btn small danger"
            onClick={() => confirm('Sign out? Your data is removed from this device but stays in your account.') && cloud.signOut()}
          >
            Sign out
          </button>
        </div>
        {demoNote}
      </div>
    );
  }

  const run = async (mode) => {
    if (!email || pw.length < 6) return setMsg('Enter your email and a password of at least 6 characters.');
    setBusy(true);
    setMsg('');
    try {
      if (mode === 'in') await cloud.signIn(email, pw);
      else await cloud.signUp(email, pw);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="card">
      <p className="muted small">Sign in to back up your workouts to your account.</p>
      <input className="text-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="text-input" type="password" placeholder="Password (min. 6 characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
      <div className="row gap">
        <button className="btn primary grow" disabled={busy} onClick={() => run('in')}>{busy ? '…' : 'Sign in'}</button>
        <button className="btn secondary grow" disabled={busy} onClick={() => run('up')}>Create account</button>
      </div>
      {msg && <p className="small error-text">{msg}</p>}
      {demoNote}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="toggle-row">
      <div>
        <div>{label}</div>
        {hint && <div className="small muted">{hint}</div>}
      </div>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" />
    </label>
  );
}