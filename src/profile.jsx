import { useState } from 'react';
import { useStore } from './store.jsx';
import Heatmap from './heatmap.jsx';
import LineChart from './chart.jsx';
import { todayKey, weekStart, addDays, formatDate, num, fmt } from './utils.js';

const GOALS = ['Strength', 'Muscle growth', 'Fat loss', 'General fitness'];

export default function Profile({ onOpenSettings, onSelectDate }) {
  const { data, updateProfile, addBodyweight, removeBodyweight, cloud } = useStore();
  const p = data.profile;
  const [bwDate, setBwDate] = useState(todayKey());
  const [bwVal, setBwVal] = useState('');

  const finished = data.workouts.filter((w) => w.finished);
  const totalVolume = finished.reduce(
    (a, w) =>
      a + w.entries.reduce((b, e) => b + e.sets.filter((s) => s.done).reduce((c, s) => c + num(s.kg) * num(s.reps), 0), 0),
    0
  );
  const thisMonth = finished.filter((w) => w.date.startsWith(todayKey().slice(0, 7))).length;

  // Weeks in a row with at least one workout
  const weeks = new Set(finished.map((w) => weekStart(w.date)));
  let streak = 0;
  let wk = weekStart(todayKey());
  if (!weeks.has(wk)) wk = addDays(wk, -7);
  while (weeks.has(wk)) {
    streak++;
    wk = addDays(wk, -7);
  }

  const name = p.name || cloud.user?.email?.split('@')[0] || 'Athlete';
  const bws = data.bodyweights;
  const latest = bws[bws.length - 1];
  const change = latest ? latest.kg - bws[0].kg : 0;
  const height = num(p.height);
  const bmi = latest && height ? latest.kg / (height / 100) ** 2 : null;
  const points = bws.slice(-30).map((b) => ({
    label: formatDate(b.date, { day: 'numeric', month: 'short' }),
    value: b.kg,
  }));

  const saveBw = () => {
    const kg = num(bwVal);
    if (!kg) return alert('Enter your body weight in kg.');
    addBodyweight(bwDate, kg);
    setBwVal('');
  };

  return (
    <div>
      <header className="profile-head">
        <div className="avatar">{name.slice(0, 2).toUpperCase()}</div>
        <div className="grow">
          <div className="profile-name">{name}</div>
          <div className="muted small">
            {cloud.user ? `☁️ ${cloud.user.email}` : '📱 Guest · data stored on this device'}
          </div>
        </div>
        <button className="icon-btn" onClick={onOpenSettings} title="Theme & colours">🎨</button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings">⚙️</button>
      </header>

      <div className="stat-grid">
        <Stat label="Workouts" value={finished.length} />
        <Stat label="Week streak" value={`${streak} 🔥`} />
        <Stat label="This month" value={thisMonth} />
        <Stat label="Total moved" value={`${fmt(totalVolume)} kg`} />
      </div>

      <h3>Training calendar</h3>
      <div className="card">
        <Heatmap workouts={data.workouts} onSelect={onSelectDate} />
      </div>

      <h3>Body weight</h3>
      <div className="card">
        <div className="bw-form">
          <input type="date" className="text-input" value={bwDate} max={todayKey()} onChange={(e) => setBwDate(e.target.value)} />
          <input
            type="text"
            inputMode="decimal"
            className="text-input"
            placeholder="kg"
            value={bwVal}
            onChange={(e) => setBwVal(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
          />
          <button className="btn primary" onClick={saveBw}>Save</button>
        </div>

        {latest ? (
          <>
            <div className="stat-grid">
              <Stat label="Current" value={`${fmt(latest.kg)} kg`} />
              <Stat label="Change" value={`${change > 0 ? '+' : ''}${fmt(change)} kg`} />
              {bmi && <Stat label="BMI" value={fmt(bmi)} />}
            </div>
            <LineChart points={points} unit="kg" />
            <div className="bw-list">
              {[...bws].reverse().slice(0, 8).map((b) => (
                <div key={b.date} className="row space bw-row">
                  <span className="muted">{formatDate(b.date)}</span>
                  <span className="row gap">
                    <strong>{fmt(b.kg)} kg</strong>
                    <button className="x-btn" onClick={() => removeBodyweight(b.date)}>✕</button>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted small">Log your weight regularly to see your trend.</p>
        )}
      </div>

      <h3>About you</h3>
      <div className="card">
        <label className="field-label">Name</label>
        <input className="text-input" value={p.name} placeholder={name} onChange={(e) => updateProfile({ name: e.target.value })} />
        <label className="field-label">Height (cm)</label>
        <input
          className="text-input"
          type="number"
          inputMode="numeric"
          value={p.height}
          placeholder="e.g. 180"
          onChange={(e) => updateProfile({ height: e.target.value })}
        />
        <label className="field-label">Goal (used by the AI coach)</label>
        <select className="text-input" value={p.goal} onChange={(e) => updateProfile({ goal: e.target.value })}>
          {GOALS.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}