import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, getPrevious, isCardio } from './store.jsx';
import { useTimer } from './timer.jsx';
import {
  num, fmt, setsSummary, formatDate, fmtTime, cleanDec, cleanInt, cardioText, pace, speed,
} from './utils.js';
import Coach from './coach.jsx';
import { sfx } from './sounds.js';

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];
const restLabel = (s) => (s < 60 ? `${s}s` : `${fmtTime(s)} min`);

export default function ExerciseCard({ date, entry, disabled, defaultOpen }) {
  const { data, updateSet, addSet, removeSet, removeEntry, patchEntry, updateExercise, toggleSuperset } =
    useStore();
  const timer = useTimer();

  const exercise = data.exercises.find((x) => x.id === entry.exerciseId);
  const cardio = isCardio(exercise);
  const prev = useMemo(
    () => getPrevious(data.workouts, entry.exerciseId, date),
    [data.workouts, entry.exerciseId, date]
  );

  const doneSets = entry.sets.filter((s) => s.done);
  const doneCount = doneSets.length;
  const complete = entry.sets.length > 0 && doneCount === entry.sets.length;

  // Completed cards start collapsed
  const [open, setOpen] = useState(() => !!defaultOpen && !complete);
  const [panel, setPanel] = useState(null); // 'tools' | 'coach' | null

  // Collapse automatically the moment the last set is ticked
  const wasComplete = useRef(complete);
  useEffect(() => {
    const justCompleted = complete && !wasComplete.current;
    wasComplete.current = complete;
    if (!justCompleted) return;
    const t = setTimeout(() => {
      setOpen(false);
      setPanel(null);
    }, 600); // short pause so you see it turn green first
    return () => clearTimeout(t);
  }, [complete]);

  const entries = data.workouts.find((w) => w.date === date)?.entries ?? [];
  const idx = entries.findIndex((e) => e.id === entry.id);
  const next = entries[idx + 1];
  const linkedToNext = !!entry.superset && next?.superset === entry.superset;
  const rest = exercise?.rest ?? data.settings.restSeconds;

  const togglePanel = (p) => setPanel(panel === p ? null : p);

  const target = entry.target ?? {};
  const targetText = cardio ? cardioText(target) : target.reps ? `${entry.sets.length} × ${target.reps}` : '';
  const totMin = doneSets.reduce((a, s) => a + num(s.min), 0);
  const totKm = doneSets.reduce((a, s) => a + num(s.km), 0);
  const unitWord = cardio ? 'interval' : 'set';
  const collapsedDone = complete && !open;

  const completeSet = (s, patch) => {
    updateSet(date, entry.id, s.id, { ...patch, done: true });
    sfx('set', data.settings);
    if (data.settings.vibrate) navigator.vibrate?.(15);
  };

  const toggle = (s, p) => {
    if (s.done) return updateSet(date, entry.id, s.id, { done: false });

    if (cardio) {
      const pick = (k) => (s[k] !== '' && s[k] != null ? s[k] : String(p?.[k] ?? ''));
      const min = pick('min');
      const km = pick('km');
      const level = pick('level');
      if (!num(min) && !num(km)) {
        alert('Enter the time or distance first.');
        return;
      }
      completeSet(s, { min, km, level });
      return;
    }

    const kg = s.kg !== '' ? s.kg : String(p?.kg ?? '');
    const reps = s.reps !== '' ? s.reps : String(p?.reps ?? '');
    if (!num(reps)) {
      alert('Enter the reps for this set first.');
      return;
    }
    completeSet(s, { kg: kg === '' ? '0' : kg, reps });
    // In a superset, rest only starts after the last exercise of the round
    if (data.settings.autoTimer && !linkedToNext && rest > 0) timer.start(rest, exercise?.name);
  };

  const field = (s, key, placeholder, clean, mode = 'decimal') => (
    <input
      type="text"
      inputMode={mode}
      value={s[key] ?? ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => updateSet(date, entry.id, s.id, { [key]: clean(e.target.value) })}
    />
  );

  const sumChips = [
    totMin > 0 && `⏱ ${fmt(totMin)} min`,
    totKm > 0 && `📍 ${fmt(totKm)} km`,
    pace(totMin, totKm) && `⚡ ${pace(totMin, totKm)}`,
    speed(totMin, totKm) && `🚀 ${speed(totMin, totKm)}`,
  ].filter(Boolean);

  return (
    <div className={'card exercise' + (complete ? ' complete' : '') + (open ? '' : ' collapsed')}>
      <button className="exercise-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="grow">
          <div className="exercise-name">
            {complete && '✓ '}
            {cardio && '🏃 '}
            {exercise?.name ?? 'Unknown exercise'}
          </div>

          {collapsedDone ? (
            <>
              <div className="done-summary">
                {setsSummary(doneSets)}
                {cardio && pace(totMin, totKm) && ` · ${pace(totMin, totKm)}`}
              </div>
              <div className="tap-hint">Tap to view or edit</div>
            </>
          ) : (
            <>
              <div className="muted small">
                {doneCount}/{entry.sets.length} {unitWord}s
                {targetText && ` · 🎯 ${targetText}`}
              </div>
              <div className="muted small">
                {prev
                  ? `Last (${formatDate(prev.date, { day: 'numeric', month: 'short' })}): ${setsSummary(prev.sets)}`
                  : 'No history yet'}
              </div>
              {exercise?.note && <div className="note-inline">📝 {exercise.note}</div>}
            </>
          )}
        </div>
        <span className={'chev' + (open ? ' open' : '')}>▸</span>
      </button>

      {open && (
        <div className="sets">
          {cardio ? (
            <div className="cardio-table">
              <div className="cardio-row head">
                <span>#</span>
                <span>Time<small>min</small></span>
                <span>Distance<small>km</small></span>
                <span>Intensity<small>level</small></span>
                <span />
              </div>
              {entry.sets.map((s, i) => {
                const p = prev?.sets[i];
                return (
                  <div key={s.id} className={'cardio-row' + (s.done ? ' done' : '')}>
                    <span className="set-num">{i + 1}</span>
                    {field(s, 'min', p?.min ? String(p.min) : '–', cleanDec)}
                    {field(s, 'km', p?.km ? String(p.km) : '–', cleanDec)}
                    {field(s, 'level', p?.level ? String(p.level) : '–', cleanDec)}
                    <button className={'check' + (s.done ? ' on' : '')} disabled={disabled} onClick={() => toggle(s, p)}>
                      ✓
                    </button>
                  </div>
                );
              })}
              {sumChips.length > 0 && (
                <div className="cardio-sum">
                  {sumChips.map((c) => <span key={c}>{c}</span>)}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="set-row header">
                <span>Set</span>
                <span>Previous</span>
                <span>kg</span>
                <span>Reps</span>
                <span />
              </div>
              {entry.sets.map((s, i) => {
                const p = prev?.sets[i];
                return (
                  <div key={s.id} className={'set-row' + (s.done ? ' done' : '')}>
                    <span className="set-num">{i + 1}</span>
                    <span className="muted small">{p ? `${p.kg}kg × ${p.reps}` : '—'}</span>
                    {field(s, 'kg', p ? String(p.kg) : '0', cleanDec)}
                    {field(s, 'reps', p ? String(p.reps) : target.reps ? String(target.reps) : '0', cleanInt, 'numeric')}
                    <button className={'check' + (s.done ? ' on' : '')} disabled={disabled} onClick={() => toggle(s, p)}>
                      ✓
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {disabled && entry.note && <div className="note-box mt">🗒 {entry.note}</div>}

          {!disabled && (
            <div className="set-actions">
              <button className="btn small ghost" onClick={() => addSet(date, entry.id)}>
                + {cardio ? 'Interval' : 'Set'}
              </button>
              <button
                className="btn small ghost"
                disabled={!entry.sets.length}
                onClick={() => removeSet(date, entry.id, entry.sets[entry.sets.length - 1].id)}
              >
                − {cardio ? 'Interval' : 'Set'}
              </button>
              {!cardio && (
                <button className="btn small ghost" onClick={() => timer.start(rest, exercise?.name)}>⏱ {rest}s</button>
              )}
              <button className={'btn small ghost' + (panel === 'coach' ? ' on' : '')} onClick={() => togglePanel('coach')}>
                ✨ Coach
              </button>
              <button className={'btn small ghost' + (panel === 'tools' ? ' on' : '')} onClick={() => togglePanel('tools')}>
                ⋯
              </button>
            </div>
          )}

          {panel === 'coach' && exercise && <Coach exercise={exercise} entry={entry} date={date} />}

          {panel === 'tools' && !disabled && exercise && (
            <div className="tools">
              <label className="field-label">📝 Exercise note <span className="muted">(shown every time)</span></label>
              <textarea
                className="text-input"
                rows={2}
                placeholder={cardio ? 'e.g. Incline 2%, program "hills"…' : 'e.g. Seat height 4, wide grip…'}
                value={exercise.note ?? ''}
                onChange={(e) => updateExercise(exercise.id, { note: e.target.value })}
              />
              <label className="field-label">🗒 Note for today</label>
              <textarea
                className="text-input"
                rows={2}
                placeholder="e.g. Felt strong, shoulder a bit tight…"
                value={entry.note ?? ''}
                onChange={(e) => patchEntry(date, entry.id, { note: e.target.value })}
              />
              {!cardio && (
                <>
                  <label className="field-label">⏱ Rest timer for this exercise</label>
                  <select
                    className="text-input"
                    value={exercise.rest ?? ''}
                    onChange={(e) =>
                      updateExercise(exercise.id, { rest: e.target.value === '' ? null : Number(e.target.value) })
                    }
                  >
                    <option value="">Default ({data.settings.restSeconds}s)</option>
                    {REST_OPTIONS.map((o) => (
                      <option key={o} value={o}>{restLabel(o)}</option>
                    ))}
                  </select>
                </>
              )}
              <div className="row gap wrap">
                <button className="btn small secondary" disabled={!next} onClick={() => toggleSuperset(date, entry.id)}>
                  {linkedToNext ? '⛓ Unlink superset' : '🔗 Superset with next'}
                </button>
                <button
                  className="btn small danger"
                  onClick={() => confirm('Remove this exercise from the day?') && removeEntry(date, entry.id)}
                >
                  Remove exercise
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}