import { todayKey, addDays, weekStart, parseKey, formatDate } from './utils.js';

const level = (n) => (!n ? 0 : n <= 5 ? 1 : n <= 12 ? 2 : n <= 20 ? 3 : 4);

export default function Heatmap({ workouts, weeks = 26, onSelect }) {
  const today = todayKey();
  const sets = {};
  for (const w of workouts) {
    if (!w.finished) continue;
    sets[w.date] = w.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  }

  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const trained = cells.filter((d) => sets[d]).length;

  // Month labels above the columns
  let lastLabel = -3;
  const months = Array.from({ length: weeks }, (_, w) => {
    const d = cells[w * 7];
    const prev = w > 0 ? cells[(w - 1) * 7] : null;
    if ((!prev || d.slice(5, 7) !== prev.slice(5, 7)) && w - lastLabel >= 3) {
      lastLabel = w;
      return parseKey(d).toLocaleDateString(undefined, { month: 'short' });
    }
    return '';
  });
  const cols = { gridTemplateColumns: `repeat(${weeks}, 1fr)` };

  return (
    <div>
      <div className="muted small mb">{trained} training days in the last {Math.round(weeks / 4.3)} months</div>
      <div className="heat-months" style={cols}>
        {months.map((m, i) => <span key={i}>{m}</span>)}
      </div>
      <div className="heatmap" style={cols}>
        {cells.map((d) =>
          d > today ? (
            <span key={d} className="cell future" />
          ) : (
            <button
              key={d}
              className={`cell l${level(sets[d])}${d === today ? ' today' : ''}`}
              title={`${formatDate(d)}: ${sets[d] ? sets[d] + ' sets' : 'rest day'}`}
              onClick={() => onSelect?.(d)}
            />
          )
        )}
      </div>
      <div className="legend">
        Less {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`cell l${l}`} />)} More
      </div>
    </div>
  );
}