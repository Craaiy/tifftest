import { useState } from 'react';
import { useStore } from './store.jsx';
import { askCoach } from './ai.js';
import { num } from './utils.js';

const QUICK = [
  { id: 'today', label: '🎯 What should I lift today?' },
  { id: 'superset', label: '🔗 Superset ideas' },
  { id: 'form', label: '🧠 Form cues' },
];

export default function Coach({ exercise, entry, date }) {
  const { data, updateExercise, patchEntry } = useStore();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const history = data.workouts
    .filter((w) => w.finished && w.date < date)
    .flatMap((w) =>
      w.entries
        .filter((e) => e.exerciseId === exercise.id)
        .map((e) => ({ date: w.date, sets: e.sets.filter((s) => s.done), note: e.note }))
    )
    .filter((h) => h.sets.length)
    .slice(-6);

  const last = history[history.length - 1];
  const lastTop = last ? Math.max(...last.sets.map((s) => num(s.kg))) : 0;
  const bw = data.bodyweights[data.bodyweights.length - 1];

  const ask = async (kind, q = '') => {
    setLoading(true);
    setAnswer('');
    const text = await askCoach(kind, {
      exercise,
      history,
      question: q,
      goal: data.profile.goal || 'General fitness',
      bodyweight: bw?.kg,
      lastTop,
    });
    setAnswer(text);
    setLoading(false);
  };

  const append = (old, text) => [old, text].filter(Boolean).join('\n\n');

  return (
    <div className="coach">
      <div className="coach-title">
        ✨ AI coach <span className="muted small">· demo</span>
      </div>
      <div className="quick">
        {QUICK.map((q) => (
          <button key={q.id} className="chip-btn" disabled={loading} onClick={() => ask(q.id)}>
            {q.label}
          </button>
        ))}
      </div>
      <form
        className="row gap"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask('custom', question.trim());
        }}
      >
        <input
          className="text-input"
          placeholder="Ask e.g. warm-up, rest, plateau, protein…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="btn small primary" disabled={loading}>Ask</button>
      </form>

      {loading && <div className="muted small mt">Thinking…</div>}
      {answer && (
        <div className="coach-answer">
          <div className="pre">{answer}</div>
          <div className="row gap wrap mt">
            <button className="btn small ghost" onClick={() => updateExercise(exercise.id, { note: append(exercise.note, answer) })}>
              📝 Save to exercise note
            </button>
            <button className="btn small ghost" onClick={() => patchEntry(date, entry.id, { note: append(entry.note, answer) })}>
              🗒 Save to today's note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}