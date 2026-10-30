import { useState } from 'react';
import { useStore } from './store.jsx';
import { groupBlocks } from './utils.js';
import ExerciseCard from './exercisecard.jsx';
import AddExercise from './addexercise.jsx';

// Shared "are you sure?" logic for the Finish day button
export function confirmFinish(entries) {
  const all = entries.flatMap((e) => e.sets);
  const done = all.filter((s) => s.done).length;
  if (done === 0) {
    alert('Complete at least one set (tap ✓) before finishing the day.');
    return false;
  }
  const notDone = all.length - done;
  return !(
    notDone > 0 &&
    !confirm(`${notDone} set(s) are not checked off and won't be saved to your stats. Finish anyway?`)
  );
}

export default function WorkoutEditor({ date, defaultOpen = false }) {
  const { data, addEntry, finishDay, reopenDay } = useStore();
  const [adding, setAdding] = useState(false);

  const workout = data.workouts.find((w) => w.date === date);
  const entries = workout?.entries ?? [];
  const finished = !!workout?.finished;

  const card = (e) => (
    <ExerciseCard key={e.id} date={date} entry={e} disabled={finished} defaultOpen={defaultOpen} />
  );

  return (
    <div>
      {finished && (
        <div className="banner success">
          <span>✓ Workout finished & saved to stats</span>
          <button className="btn small ghost" onClick={() => reopenDay(date)}>Edit</button>
        </div>
      )}

      {entries.length === 0 && !adding && (
        <div className="empty">No exercises yet. Add one or start a routine.</div>
      )}

      {groupBlocks(entries).map((block) =>
        block.length > 1 ? (
          <div className="superset" key={block[0].id}>
            <div className="superset-label">🔗 Superset</div>
            {block.map(card)}
          </div>
        ) : (
          card(block[0])
        )
      )}

      {!finished &&
        (adding ? (
          <AddExercise
            exclude={entries.map((e) => e.exerciseId)}
            onAdd={(id) => {
              addEntry(date, id);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button className="btn secondary full" onClick={() => setAdding(true)}>+ Add exercise</button>
        ))}

      {!finished && entries.length > 0 && (
        <button className="btn primary full finish" onClick={() => confirmFinish(entries) && finishDay(date)}>
          Finish day
        </button>
      )}
    </div>
  );
}