import { useState } from 'react';
import { useStore } from './store.jsx';
import { MUSCLES } from './library.js';

// One colour per muscle group
const MUSCLE_COLORS = {
  Chest: '#ef4444',
  Back: '#3b82f6',
  Shoulders: '#f59e0b',
  Arms: '#a855f7',
  Legs: '#22c55e',
  Glutes: '#ec4899',
  Core: '#14b8a6',
  'Full body': '#f97316',
  Cardio: '#06b6d4',
  Other: '#94a3b8',
};
const colorOf = (m) => MUSCLE_COLORS[m] ?? MUSCLE_COLORS.Other;

export default function AddExercise({ onAdd, onCancel, exclude = [] }) {
  const { data, addExercise } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const query = q.trim().toLowerCase();

  const muscleOf = (e) => (MUSCLES.includes(e.muscle) ? e.muscle : 'Other');
  const categories = ['All', ...MUSCLES.filter((m) => data.exercises.some((e) => muscleOf(e) === m))];

  const list = data.exercises
    .filter((e) => !exclude.includes(e.id))
    .filter((e) => cat === 'All' || muscleOf(e) === cat)
    .filter((e) => e.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group the results under muscle-group headers
  const groups = MUSCLES.map((m) => ({ muscle: m, items: list.filter((e) => muscleOf(e) === m) })).filter(
    (g) => g.items.length
  );

  const exact = data.exercises.some((e) => e.name.toLowerCase() === query);
  const create = (extra) => onAdd(addExercise(q.trim(), extra), { type: 'strength', ...extra });

  return (
    <div className="card add-ex">
      <input
        autoFocus
        className="text-input"
        placeholder="Search or create an exercise…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="filter-chips">
        {categories.map((c) => (
          <button key={c} className={'chip-btn' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
            {c !== 'All' && <span className="pick-dot" style={{ '--mc': colorOf(c) }} />}
            {c}
          </button>
        ))}
      </div>

      <div className="pick-list">
        {query && !exact && (cat === 'All' ? (
          <>
            <button className="pick-create" onClick={() => create({})}>
              + Create "{q.trim()}"
            </button>
            <button className="pick-create" onClick={() => create({ type: 'cardio', muscle: 'Cardio' })}>
              + Create "{q.trim()}" as cardio 🏃
            </button>
          </>
        ) : (
          <button
            className="pick-create"
            onClick={() => create({ muscle: cat, type: cat === 'Cardio' ? 'cardio' : 'strength' })}
          >
            + Create "{q.trim()}" in {cat}
          </button>
        ))}

        {groups.map((g) => (
          <section key={g.muscle} className="pick-group" style={{ '--mc': colorOf(g.muscle) }}>
            <div className="pick-head">
              <span className="pick-dot" />
              <span>{g.muscle === 'Cardio' ? '🏃 Cardio' : g.muscle}</span>
              <span className="pick-count">{g.items.length}</span>
            </div>
            {g.items.map((e) => (
              <button key={e.id} className="pick-item" onClick={() => onAdd(e.id, e)}>
                <span className="pick-name">{e.name}</span>
                <span className="pick-add">+</span>
              </button>
            ))}
          </section>
        ))}

        {!groups.length && !query && <div className="ex-empty">No exercises in this group.</div>}
        {!groups.length && query && exact && <div className="ex-empty">Already added.</div>}
      </div>

      <button className="btn ghost full" onClick={onCancel}>Cancel</button>
    </div>
  );
}