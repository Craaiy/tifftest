import { useState } from 'react';
import { useStore, isCardio } from './store.jsx';
import { uid, toggleLink, normalizeSupersets, groupBlocks, cardioText, cleanDec } from './utils.js';
import AddExercise from './addexercise.jsx';

export default function Routines({ onStart }) {
  const { data, saveRoutine, deleteRoutine } = useStore();
  const [editing, setEditing] = useState(null);

  const describe = (x) => {
    const ex = data.exercises.find((e) => e.id === x.exerciseId);
    const name = ex?.name ?? 'Unknown';
    if (isCardio(ex)) {
      const t = cardioText(x);
      return `🏃 ${name}${t ? ` (${t})` : ''}`;
    }
    return `${name} (${x.sets}×${x.reps ?? '?'})`;
  };

  if (editing) {
    return (
      <RoutineForm
        initial={editing}
        onSave={(r) => {
          saveRoutine(r);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <h2>Routines</h2>
      <button className="btn primary full" onClick={() => setEditing({ id: uid(), name: '', exercises: [] })}>
        + New routine
      </button>

      {data.routines.length === 0 && (
        <div className="empty">Create routines like "Push Day", "Pull Day", "Legs" or "Cardio".</div>
      )}

      {data.routines.map((r) => (
        <div className="card" key={r.id}>
          <div className="row space">
            <strong className="routine-title">{r.name}</strong>
            <div className="row gap">
              <button className="btn small primary" onClick={() => onStart(r.id)}>Start</button>
              <button className="btn small ghost" onClick={() => setEditing(r)}>Edit</button>
              <button className="btn small danger" onClick={() => confirm(`Delete "${r.name}"?`) && deleteRoutine(r.id)}>
                ✕
              </button>
            </div>
          </div>
          <div className="muted small mt">
            {groupBlocks(r.exercises)
              .map((b) => b.map(describe).join(' 🔗 '))
              .join(' · ')}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoutineForm({ initial, onSave, onCancel }) {
  const { data } = useStore();
  const exOf = (id) => data.exercises.find((e) => e.id === id);

  const [name, setName] = useState(initial.name);
  const [items, setItems] = useState(() =>
    initial.exercises.map((x) =>
      isCardio(exOf(x.exerciseId)) ? x : { ...x, reps: x.reps ?? data.settings.defaultReps }
    )
  );
  const [adding, setAdding] = useState(false);

  const linked = (i) => !!items[i].superset && items[i].superset === items[i + 1]?.superset;
  const update = (i, patch) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i) => setItems(normalizeSupersets(items.filter((_, j) => j !== i)));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.map((x) => ({ ...x }));
    [next[i], next[j]] = [next[j], next[i]];
    next[i].superset = null; // moving breaks a superset link
    next[j].superset = null;
    setItems(normalizeSupersets(next));
  };

  const addItem = (id, info) => {
    const item = isCardio(info ?? exOf(id))
      ? { exerciseId: id, sets: 1, min: '', km: '', level: '', superset: null }
      : { exerciseId: id, sets: data.settings.defaultSets, reps: data.settings.defaultReps, superset: null };
    setItems([...items, item]);
    setAdding(false);
  };

  const save = () => {
    if (!name.trim()) return alert('Give your routine a name.');
    if (!items.length) return alert('Add at least one exercise.');
    onSave({ ...initial, name: name.trim(), exercises: items });
  };

  return (
    <div>
      <button className="link" onClick={onCancel}>‹ Back</button>
      <h2>{initial.name ? 'Edit routine' : 'New routine'}</h2>

      <input
        className="text-input"
        placeholder="Routine name (e.g. Push Day)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <h3>Exercises</h3>
      {items.map((it, i) => {
        const ex = exOf(it.exerciseId);
        const cardio = isCardio(ex);
        return (
          <div key={it.exerciseId}>
            <div className={'card routine-item' + (it.superset ? ' in-superset' : '')}>
              <div className="row space">
                <div className="routine-item-name">{cardio && '🏃 '}{ex?.name ?? '…'}</div>
                <div className="row gap">
                  <button className="btn small ghost" onClick={() => move(i, -1)}>↑</button>
                  <button className="btn small ghost" onClick={() => move(i, 1)}>↓</button>
                  <button className="btn small danger" onClick={() => remove(i)}>✕</button>
                </div>
              </div>

              {cardio ? (
                <>
                  <div className="cardio-fields">
                    <CardioField label="Time (min)" placeholder="30" value={it.min} onChange={(v) => update(i, { min: v })} />
                    <CardioField label="Distance (km)" placeholder="5" value={it.km} onChange={(v) => update(i, { km: v })} />
                    <CardioField label="Intensity" placeholder="8" value={it.level} onChange={(v) => update(i, { level: v })} />
                  </div>
                  <div className="muted small">
                    Fill in what you need. Intensity can be the machine level or your effort (1–10).
                  </div>
                </>
              ) : (
                <>
                  <div className="row gap wrap">
                    <Stepper value={it.sets} unit="sets" min={1} max={10} onChange={(v) => update(i, { sets: v })} />
                    <Stepper value={it.reps} unit="reps" min={1} max={100} onChange={(v) => update(i, { reps: v })} />
                  </div>
                  <div className="muted small">🎯 Target: {it.sets} × {it.reps} reps</div>
                </>
              )}
            </div>

            {i < items.length - 1 && (
              <button className={'link-btn' + (linked(i) ? ' on' : '')} onClick={() => setItems(toggleLink(items, i))}>
                {linked(i) ? '🔗 Superset · tap to unlink' : '+ link as superset'}
              </button>
            )}
          </div>
        );
      })}

      {adding ? (
        <AddExercise
          exclude={items.map((x) => x.exerciseId)}
          onAdd={addItem}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button className="btn secondary full" onClick={() => setAdding(true)}>+ Add exercise</button>
      )}

      <button className="btn primary full finish" onClick={save}>Save routine</button>
    </div>
  );
}

function Stepper({ value, unit, min, max, onChange }) {
  return (
    <div className="stepper no-auto">
      <button onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span>{value} {unit}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

function CardioField({ label, value, placeholder, onChange }) {
  return (
    <label className="cardio-field">
      <span>{label}</span>
      <input
        className="text-input"
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(cleanDec(e.target.value))}
      />
    </label>
  );
}