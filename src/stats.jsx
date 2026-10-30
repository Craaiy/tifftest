import { useMemo, useState } from 'react';
import { useStore, isCardio } from './store.jsx';
import LineChart from './chart.jsx';
import { num, e1rm, fmt, todayKey, addDays, weekStart, formatDate, parseKey, cardioText, pace } from './utils.js';

const RANGES = { '1W': 7, '1M': 30, '3M': 91, '1Y': 365, All: null };
const GROUPS = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' };
const METRICS = {
  strength: { maxKg: 'Max weight', e1rm: 'Est. 1RM', volume: 'Volume', reps: 'Total reps' },
  cardio: { km: 'Distance', min: 'Time', speed: 'Speed', level: 'Intensity' },
};
const UNITS = { maxKg: 'kg', e1rm: 'kg', volume: 'kg', reps: 'reps', km: 'km', min: 'min', speed: 'km/h', level: '' };
const groupKey = {
  day: (d) => d,
  week: weekStart,
  month: (d) => d.slice(0, 7),
  year: (d) => d.slice(0, 4),
};

const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const duration = (min) =>
  min >= 60 ? `${Math.floor(min / 60)}h ${Math.round(min % 60)}m` : `${fmt(min)} min`;

function groupLabel(key, group) {
  if (group === 'day') return formatDate(key, { day: 'numeric', month: 'short' });
  if (group === 'week') return 'Wk ' + formatDate(key, { day: 'numeric', month: 'short' });
  if (group === 'month')
    return parseKey(key + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return key;
}

function groupSessions(sessions, group) {
  const map = new Map();
  for (const s of sessions) {
    const k = groupKey[group](s.date);
    const g = map.get(k) ?? {
      key: k, sessions: 0, sets: 0,
      maxKg: 0, e1rm: 0, volume: 0, reps: 0,
      km: 0, min: 0, levelSum: 0, levelN: 0,
    };
    g.sessions++;
    g.sets += s.sets.length;
    if (s.cardio) {
      g.km += s.km;
      g.min += s.min;
      if (s.level) {
        g.levelSum += s.level;
        g.levelN++;
      }
    } else {
      g.maxKg = Math.max(g.maxKg, s.maxKg);
      g.e1rm = Math.max(g.e1rm, s.e1rm);
      g.volume += s.volume;
      g.reps += s.reps;
    }
    map.set(k, g);
  }
  return [...map.values()]
    .map((g) => ({
      ...g,
      speed: g.min ? g.km / (g.min / 60) : 0,
      level: g.levelN ? g.levelSum / g.levelN : 0,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export default function Stats() {
  const { data } = useStore();
  const [exId, setExId] = useState('');
  const [range, setRange] = useState('3M');
  const [group, setGroup] = useState('day');
  const [metric, setMetric] = useState('maxKg');

  const exById = useMemo(() => Object.fromEntries(data.exercises.map((e) => [e.id, e])), [data.exercises]);
  const nameOf = (id) => exById[id]?.name ?? 'Unknown';
  const finished = data.workouts.filter((w) => w.finished);

  // Per-exercise history from finished workouts (only completed sets count)
  const byExercise = useMemo(() => {
    const m = {};
    for (const w of data.workouts) {
      if (!w.finished) continue;
      for (const e of w.entries) {
        const done = e.sets.filter((s) => s.done);
        if (!done.length) continue;
        let session;
        if (isCardio(exById[e.exerciseId])) {
          const sets = done.map((s) => ({ min: num(s.min), km: num(s.km), level: num(s.level) }));
          const min = sum(sets, (s) => s.min);
          const km = sum(sets, (s) => s.km);
          const lv = sets.filter((s) => s.level);
          session = {
            date: w.date, cardio: true, sets, min, km,
            level: lv.length ? sum(lv, (s) => s.level) / lv.length : 0,
            speed: min ? km / (min / 60) : 0,
          };
        } else {
          const sets = done.map((s) => ({ kg: num(s.kg), reps: num(s.reps) }));
          session = {
            date: w.date, cardio: false, sets,
            maxKg: Math.max(...sets.map((s) => s.kg)),
            e1rm: Math.max(...sets.map((s) => e1rm(s.kg, s.reps))),
            volume: sum(sets, (s) => s.kg * s.reps),
            reps: sum(sets, (s) => s.reps),
          };
        }
        (m[e.exerciseId] ||= []).push(session);
      }
    }
    return m;
  }, [data.workouts, exById]);

  // Account-wide totals
  const all = Object.values(byExercise).flat();
  const lifts = all.filter((s) => !s.cardio);
  const runs = all.filter((s) => s.cardio);
  const thisWeek = finished.filter((w) => w.date >= weekStart(todayKey())).length;

  // Selected exercise
  const exIds = Object.keys(byExercise).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const selected = exId && byExercise[exId] ? exId : exIds[0];
  const cardioSel = isCardio(exById[selected]);
  const metrics = METRICS[cardioSel ? 'cardio' : 'strength'];
  const mKey = metrics[metric] ? metric : Object.keys(metrics)[0];

  const allForEx = byExercise[selected] ?? [];
  const cutoff = RANGES[range] ? addDays(todayKey(), -RANGES[range]) : '';
  const sessions = allForEx.filter((s) => s.date >= cutoff);
  const groups = groupSessions(sessions, group);
  const points = groups.map((g) => ({ label: groupLabel(g.key, group), value: g[mKey] }));

  const maxOf = (list, f) => list.reduce((m, s) => Math.max(m, f(s)), 0);
  const progress = sessions.length > 1 ? sessions[sessions.length - 1].maxKg - sessions[0].maxKg : 0;

  return (
    <div>
      <h2>Statistics</h2>

      <div className="stat-grid">
        <Stat label="Workouts" value={finished.length} />
        <Stat label="This week" value={thisWeek} />
        <Stat label="Sets done" value={sum(lifts, (s) => s.sets.length)} />
        <Stat label="Total moved" value={`${fmt(sum(lifts, (s) => s.volume))} kg`} />
        <Stat label="Cardio distance" value={`${fmt(sum(runs, (s) => s.km))} km`} />
        <Stat label="Cardio time" value={duration(sum(runs, (s) => s.min))} />
      </div>

      <h3>Exercise progress</h3>
      {exIds.length === 0 ? (
        <div className="empty">Finish a workout to see your stats here.</div>
      ) : (
        <>
          <select className="text-input" value={selected} onChange={(e) => setExId(e.target.value)}>
            {exIds.map((id) => (
              <option key={id} value={id}>
                {isCardio(exById[id]) ? '🏃 ' : ''}{nameOf(id)}
              </option>
            ))}
          </select>

          <Segment options={Object.keys(RANGES)} value={range} onChange={setRange} />
          <Segment options={Object.keys(GROUPS)} labels={GROUPS} value={group} onChange={setGroup} />
          <Segment options={Object.keys(metrics)} labels={metrics} value={mKey} onChange={setMetric} />

          <div className="card">
            <LineChart points={points} unit={UNITS[mKey]} />
          </div>

          {cardioSel ? (
            <div className="stat-grid">
              <Stat label="Longest distance" value={`${fmt(maxOf(allForEx, (s) => s.km))} km`} />
              <Stat label="Best speed" value={`${fmt(maxOf(allForEx, (s) => s.speed))} km/h`} />
              <Stat label={`Distance (${range})`} value={`${fmt(sum(sessions, (s) => s.km))} km`} />
              <Stat label={`Time (${range})`} value={duration(sum(sessions, (s) => s.min))} />
            </div>
          ) : (
            <div className="stat-grid">
              <Stat label="All-time PR" value={`${fmt(maxOf(allForEx, (s) => s.maxKg))} kg`} />
              <Stat label="Best est. 1RM" value={`${fmt(maxOf(allForEx, (s) => s.e1rm))} kg`} />
              <Stat label={`Volume (${range})`} value={`${fmt(sum(sessions, (s) => s.volume))} kg`} />
              <Stat
                label={`Progress (${range})`}
                value={`${progress >= 0 ? '+' : ''}${fmt(progress)} kg`}
                good={progress > 0}
              />
            </div>
          )}

          <h3>By {GROUPS[group].toLowerCase()}</h3>
          <div className="card table">
            <div className="trow thead">
              <span>Period</span>
              <span>Sessions</span>
              <span>{cardioSel ? 'Km' : 'Max kg'}</span>
              <span>{cardioSel ? 'Time' : 'Volume'}</span>
            </div>
            {[...groups].reverse().map((g) => (
              <div className="trow" key={g.key}>
                <span>{groupLabel(g.key, group)}</span>
                <span>{g.sessions}</span>
                <span>{fmt(cardioSel ? g.km : g.maxKg)}</span>
                <span>{cardioSel ? duration(g.min) : fmt(g.volume)}</span>
              </div>
            ))}
            {groups.length === 0 && <div className="muted small pad">No data in this range.</div>}
          </div>

          <h3>History</h3>
          {[...sessions].reverse().map((s) => (
            <div className="card history" key={s.date}>
              <div className="row space">
                <strong>{formatDate(s.date)}</strong>
                <span className="muted small">
                  {s.cardio
                    ? [s.km && `${fmt(s.km)} km`, s.min && duration(s.min), pace(s.min, s.km)].filter(Boolean).join(' · ')
                    : `${fmt(s.volume)} kg`}
                </span>
              </div>
              <div className="set-pills">
                {s.sets.map((set, i) =>
                  s.cardio ? (
                    <span key={i} className="pill">{cardioText(set) || '—'}</span>
                  ) : (
                    <span key={i} className={'pill' + (set.kg === s.maxKg ? ' top' : '')}>
                      {fmt(set.kg)}kg × {set.reps}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, good }) {
  return (
    <div className={'stat' + (good ? ' good' : '')}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Segment({ options, labels, value, onChange }) {
  return (
    <div className="segment">
      {options.map((o) => (
        <button key={o} className={o === value ? 'active' : ''} onClick={() => onChange(o)}>
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}