import { useStore } from './store.jsx';
import { addDays, formatDate, todayKey, num, fmt } from './utils.js';
import WorkoutEditor from './editor.jsx';

export default function DayView({ date, setDate, onOpenRoutine }) {
  const { data, startRoutine } = useStore();
  const workout = data.workouts.find((w) => w.date === date);
  const isToday = date === todayKey();

  const doneSets = (workout?.entries ?? []).flatMap((e) => e.sets.filter((s) => s.done));
  const volume = doneSets.reduce((a, s) => a + num(s.kg) * num(s.reps), 0);

  const openRoutine = (id) => {
    if (workout?.finished && workout.routineId !== id) {
      alert('This day is already finished. Tap "Edit" on the workout to reopen it first.');
      return;
    }
    if (workout?.routineId !== id) startRoutine(date, id);
    onOpenRoutine(id);
  };

  return (
    <div>
      <header className="day-nav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <div className="center">
          <div className="day-title">{isToday ? 'Today' : formatDate(date, { weekday: 'long' })}</div>
          <div className="muted">{formatDate(date)}</div>
        </div>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))}>›</button>
      </header>
      {!isToday && (
        <button className="link center-block" onClick={() => setDate(todayKey())}>
          Jump to today
        </button>
      )}

      <section>
        <h3>Start a routine</h3>
        {data.routines.length === 0 ? (
          <p className="muted small">No routines yet. Create one in the Routines tab.</p>
        ) : (
          <div className="routine-chips">
            {data.routines.map((r) => (
              <button
                key={r.id}
                className={'chip' + (r.id === workout?.routineId ? ' active' : '')}
                onClick={() => openRoutine(r.id)}
              >
                <strong>{r.name}</strong>
                <span>
                  {r.id === workout?.routineId ? 'Continue →' : `${r.exercises.length} exercises`}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="row space">
          <h3>Workout</h3>
          {doneSets.length > 0 && (
            <span className="muted small">
              {doneSets.length} sets · {fmt(volume)} kg moved
            </span>
          )}
        </div>
        <WorkoutEditor date={date} />
      </section>
    </div>
  );
}