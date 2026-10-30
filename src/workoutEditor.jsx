import { useState } from 'react';
import { useStore } from '../store';
import ExerciseCard from './ExerciseCard';
import AddExercise from './AddExercise';

export default function WorkoutEditor({ date, defaultOpen = false }) {
  const { data, addEntry, finishDay, reopenDay } = useStore();
  const [adding, setAdding] = useState(false);

  const workout = data.workouts.find((w) => w.date === date);
  const entries = workout?.entries ?? [];
  const finished = !!workout?.finished;

  const handleFinish = () => {
    const all = entries.flatMap((e) => e.sets);
    const done = all.filter((s) => s.done).length;
    if (done === 0) {
      alert('Complete at least one set (tap ✓) before finishing the day.');
      return;
    }
    const notDone = all.length - done;
    if (
      notDone > 0 &&
      !confirm(`${notDone} set(s) are not checked off and won't be saved to your stats. Finish anyway?`)
    ) return;
    finishDay(date);
  };

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

      {entries.map((e) => (
        <ExerciseCard
          key={e.id}
          date={date}
          entry={e}
          disabled={finished}
          defaultOpen={defaultOpen}
        />
      ))}

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
          <button className="btn secondary full" onClick={() => setAdding(true)}>
            + Add exercise
          </button>
        ))}

      {!finished && entries.length > 0 && (
        <button className="btn primary full finish" onClick={handleFinish}>
          Finish day
        </button>
      )}
    </div>
  );
}