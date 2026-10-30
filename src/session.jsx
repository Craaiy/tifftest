import { useEffect, useRef, useState } from 'react';
import { useStore, getPrevious, getBest, isCardio } from './store.jsx';
import { formatDate, groupBlocks, fmt, num, pace } from './utils.js';
import ExerciseCard from './exercisecard.jsx';
import AddExercise from './addexercise.jsx';
import { confirmFinish } from './editor.jsx';

const SLIDE = 0.86; // card width as part of the screen (the rest shows neighbours peeking in)
const GAP = 12; // px between cards
const EASE = '.45s cubic-bezier(.22, 1, .36, 1)';

const blockDone = (b) => b.every((e) => e.sets.length > 0 && e.sets.every((s) => s.done));
const blockStarted = (b) => b.some((e) => e.sets.some((s) => s.done));
const setsDone = (b) => b.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
const setsTotal = (b) => b.reduce((a, e) => a + e.sets.length, 0);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function RoutineSession({ routineId, date, onBack }) {
  const { data, addEntry, finishDay, reopenDay } = useStore();
  const routine = data.routines.find((r) => r.id === routineId);
  const workout = data.workouts.find((w) => w.date === date);
  const entries = workout?.entries ?? [];
  const finished = !!workout?.finished;
  const blocks = groupBlocks(entries);

  const [index, setIndex] = useState(() => Math.max(0, blocks.findIndex((b) => !blockDone(b))));
  const [active, setActive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dir, setDir] = useState(1);

  const viewport = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);

  const n = blocks.length;
  const i = n ? Math.min(index, n - 1) : 0;
  const block = blocks[i];
  const doneCount = blocks.filter(blockDone).length;
  const nameOf = (id) => data.exercises.find((e) => e.id === id)?.name ?? 'Unknown';

  const goTo = (j) => {
    if (!n) return;
    const next = clamp(j, 0, n - 1);
    if (next === i) return;
    setDir(next > i ? 1 : -1);
    if (data.settings.vibrate) navigator.vibrate?.(8);
    setIndex(next);
  };

  const open = () => {
    setActive(true);
    window.scrollTo(0, 0);
  };

  const goNextOpen = () => {
    for (let k = 1; k <= n; k++) {
      const j = (i + k) % n;
      if (!blockDone(blocks[j])) {
        setIndex(j);
        break;
      }
    }
    setActive(false);
    window.scrollTo(0, 0);
  };

  // Keyboard arrows on desktop
  useEffect(() => {
    if (active) return;
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') goTo(i + 1);
      if (e.key === 'ArrowLeft') goTo(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---------- Swipe handling (finger + mouse) ---------- */
  const onDown = (e) => {
    suppressClick.current = false;
    if (n < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      moved: false,
      width: viewport.current?.offsetWidth || 360,
    };
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    let delta = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(delta) < 8) return; // tiny movement = still a tap
      if (Math.abs(e.clientY - d.y) > Math.abs(delta)) {
        drag.current = null; // vertical = scrolling the page
        return;
      }
      d.moved = true;
      setDragging(true);
      viewport.current?.setPointerCapture?.(e.pointerId);
    }
    // Rubber-band resistance at the first/last card
    if ((i === 0 && delta > 0) || (i === n - 1 && delta < 0)) delta *= 0.35;
    setDx(delta);
  };

  const onUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    suppressClick.current = true; // a drag should never press a button
    const delta = e.clientX - d.x;
    const velocity = delta / Math.max(1, performance.now() - d.t); // px per ms
    const threshold = d.width * SLIDE * 0.25;
    if (delta < -threshold || (delta < -30 && velocity < -0.35)) goTo(i + 1);
    else if (delta > threshold || (delta > 30 && velocity > 0.35)) goTo(i - 1);
    setDx(0);
    setDragging(false);
  };

  const onCancel = () => {
    drag.current = null;
    setDx(0);
    setDragging(false);
  };

  const onClickCapture = (e) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  };

  /* ---------- Active exercise: log sets ---------- */
  if (active && block) {
    const done = blockDone(block);
    return (
      <div className="fade-in" key={i}>
        <header className="session-head">
          <button className="link" onClick={() => setActive(false)}>‹ All exercises</button>
          <div className="muted small">
            {routine?.name ?? 'Workout'} · Exercise {i + 1} of {n}
          </div>
        </header>
        {block.length > 1 && (
          <div className="superset-banner">🔗 Superset: do one set of each, then rest</div>
        )}
        {block.map((e) => (
          <ExerciseCard key={e.id} date={date} entry={e} disabled={finished} defaultOpen />
        ))}
        {done ? (
          <button className="btn finish full" onClick={goNextOpen}>
            {doneCount === n ? '✓ All done, back to overview' : '✓ Done · Next exercise →'}
          </button>
        ) : (
          <button
            className="btn secondary full"
            onClick={() => {
              setActive(false);
              goTo(i + 1);
            }}
          >
            Skip for now →
          </button>
        )}
      </div>
    );
  }

  /* ---------- Overview: swipeable cards ---------- */
  const slideW = (viewport.current?.offsetWidth || 360) * SLIDE + GAP;

  return (
    <div>
      <header className="session-head">
        <button className="link" onClick={onBack}>‹ Overview</button>
        <h2>{routine?.name ?? 'Workout'}</h2>
        <div className="muted">{formatDate(date)}</div>
      </header>

      <div className="progress">
        <div className="bar" style={{ width: n ? `${(doneCount / n) * 100}%` : 0 }} />
      </div>
      <p className="muted small">{doneCount}/{n} exercises completed</p>

      {finished && (
        <div className="banner success">
          <span>✓ Workout finished & saved</span>
          <button className="btn small ghost" onClick={() => reopenDay(date)}>Edit</button>
        </div>
      )}

      {n > 0 ? (
        <>
          <div className="swiper" style={{ '--dir': dir }}>
            {n > 1 && (
              <button className="swiper-arrow left" disabled={i === 0} onClick={() => goTo(i - 1)}>‹</button>
            )}

            <div
              ref={viewport}
              className={'swiper-viewport' + (dragging ? ' dragging' : '')}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onCancel}
              onClickCapture={onClickCapture}
            >
              <div
                className="swiper-track"
                style={{
                  transform: `translate3d(calc(${((1 - SLIDE) / 2) * 100}% - ${i} * (${SLIDE * 100}% + ${GAP}px) + ${dx}px), 0, 0)`,
                  transition: dragging ? 'none' : `transform ${EASE}`,
                }}
              >
                {blocks.map((b, j) => {
                  const pos = j - i - dx / slideW; // 0 = centre, ±1 = neighbour
                  const dist = Math.min(Math.abs(pos), 1);
                  const isActive = j === i;
                  return (
                    <div
                      key={b[0].id}
                      className={'swipe-card' + (isActive ? ' active' : '') + (blockDone(b) ? ' complete' : '')}
                      style={{
                        transform: `scale(${1 - 0.07 * dist}) rotateY(${clamp(pos, -1, 1) * -5}deg)`,
                        opacity: 1 - 0.55 * dist,
                        transition: dragging ? 'none' : `transform ${EASE}, opacity ${EASE}`,
                      }}
                      onClickCapture={
                        isActive
                          ? undefined
                          : (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              goTo(j);
                            }
                      }
                    >
                      <div className="row space">
                        <span className="muted small">Exercise {j + 1} of {n}</span>
                        <Status block={b} />
                      </div>
                      {b.length > 1 && <div className="tag">🔗 Superset</div>}
                      {b.map((e) => (
                        <PreviewInfo key={e.id} entry={e} date={date} />
                      ))}
                      <div className="card-foot">
                        <button className="btn primary full start-btn" onClick={open} tabIndex={isActive ? 0 : -1}>
                          {blockDone(b) ? 'Review exercise' : blockStarted(b) ? 'Continue exercise' : '▶ Start exercise'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {n > 1 && (
              <button className="swiper-arrow right" disabled={i === n - 1} onClick={() => goTo(i + 1)}>›</button>
            )}
          </div>

          {n > 1 && (
            <>
              <div className="pager">
                {blocks.map((b, j) => (
                  <button
                    key={b[0].id}
                    aria-label={`Exercise ${j + 1}`}
                    className={'pager-dot' + (j === i ? ' active' : '') + (blockDone(b) ? ' done' : '')}
                    onClick={() => goTo(j)}
                  />
                ))}
              </div>
              <p className="hint">Machine taken? Swipe ← → to pick another exercise and come back later.</p>
            </>
          )}
        </>
      ) : (
        <div className="empty">This workout has no exercises yet.</div>
      )}

      {n > 0 && <h3>All exercises</h3>}
      {blocks.map((b, j) => (
        <button
          key={b[0].id}
          className={'ex-row' + (blockDone(b) ? ' done' : '') + (j === i ? ' current' : '')}
          onClick={() => {
            goTo(j);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="ex-row-num">{blockDone(b) ? '✓' : j + 1}</span>
          <span className="grow">{b.map((e) => nameOf(e.exerciseId)).join(' + ')}</span>
          <span className="muted small">{setsDone(b)}/{setsTotal(b)} sets</span>
        </button>
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
          <button className="btn secondary full" onClick={() => setAdding(true)}>+ Add exercise</button>
        ))}

      {!finished && n > 0 && (
        <button className="btn primary full finish" onClick={() => confirmFinish(entries) && finishDay(date)}>
          Finish day
        </button>
      )}
    </div>
  );
}

function Status({ block }) {
  if (blockDone(block)) return <span className="status done">✓ Done</span>;
  if (blockStarted(block)) return <span className="status busy">{setsDone(block)}/{setsTotal(block)} sets</span>;
  return <span className="status">Not started</span>;
}

function PreviewInfo({ entry, date }) {
  const { data } = useStore();
  const ex = data.exercises.find((e) => e.id === entry.exerciseId);
  const cardio = isCardio(ex);
  const prev = getPrevious(data.workouts, entry.exerciseId, date);

  return (
    <div className="preview">
      <div className="preview-name">{cardio && '🏃 '}{ex?.name ?? 'Unknown'}</div>
      {ex?.note && <div className="note-box">📝 {ex.note}</div>}

      {cardio ? <CardioGrid entry={entry} /> : <StrengthGrid entry={entry} ex={ex} />}

      <div className="prev-title">
        Last time{prev && ` · ${formatDate(prev.date, { day: 'numeric', month: 'short' })}`}
      </div>
      {prev ? (
        cardio ? (
          <>
            <div className="prev-table">
              {prev.sets.map((s, k) => (
                <div key={k} className="prev-row c4" style={{ '--k': k }}>
                  <span>#{k + 1}</span>
                  <span>{s.min || '—'} min</span>
                  <span>{s.km || '—'} km</span>
                  <span>lvl {s.level || '—'}</span>
                </div>
              ))}
            </div>
            {(() => {
              const p = pace(
                prev.sets.reduce((a, s) => a + num(s.min), 0),
                prev.sets.reduce((a, s) => a + num(s.km), 0)
              );
              return p && <div className="pace-line">Pace: {p}</div>;
            })()}
          </>
        ) : (
          <div className="prev-table">
            {prev.sets.map((s, k) => (
              <div key={k} className="prev-row" style={{ '--k': k }}>
                <span>Set {k + 1}</span>
                <span>{s.kg} kg</span>
                <span>× {s.reps}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="muted small">No history yet. First time! 💪</div>
      )}
      {prev?.note && <div className="muted small mt">🗒 {prev.note}</div>}
    </div>
  );
}

function StrengthGrid({ entry, ex }) {
  const { data } = useStore();
  const best = getBest(data.workouts, entry.exerciseId);
  const rest = ex?.rest ?? data.settings.restSeconds;
  const reps = entry.target?.reps;

  return (
    <div className="preview-grid">
      <div style={{ '--k': 0 }}>
        <strong>{reps ? `${entry.sets.length} × ${reps}` : entry.sets.length}</strong>
        <span>{reps ? 'sets × reps' : 'sets today'}</span>
      </div>
      <div style={{ '--k': 1 }}><strong>{best ? `${fmt(best)} kg` : '—'}</strong><span>best ever</span></div>
      <div style={{ '--k': 2 }}><strong>{rest}s</strong><span>rest</span></div>
    </div>
  );
}

function CardioGrid({ entry }) {
  const t = entry.target ?? {};
  const s0 = entry.sets[0] ?? {};
  const v = (k) => t[k] || s0[k] || '';

  return (
    <div className="preview-grid">
      <div style={{ '--k': 0 }}><strong>{v('min') ? `${v('min')} min` : '—'}</strong><span>time</span></div>
      <div style={{ '--k': 1 }}><strong>{v('km') ? `${v('km')} km` : '—'}</strong><span>distance</span></div>
      <div style={{ '--k': 2 }}><strong>{v('level') || '—'}</strong><span>intensity</span></div>
    </div>
  );
}