import { fmt, fmtShort } from './utils.js';

export default function LineChart({ points, unit }) {
  if (!points.length) return <div className="chart-empty">No data in this range</div>;

  const W = 340, H = 190;
  const P = { l: 40, r: 14, t: 14, b: 30 };

  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  min = Math.max(0, min - pad);
  max += pad;

  const innerW = W - P.l - P.r;
  const x = (i) => P.l + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min));

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`;
  const ticks = [0, 0.5, 1].map((t) => min + (max - min) * t);

  const labelIdx = points.length <= 2
    ? points.map((_, i) => i)
    : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" />
          <text x={P.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{fmtShort(t)}</text>
        </g>
      ))}
      <path d={area} className="area" />
      <path d={line} className="line" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="4" className="dot">
          <title>{`${p.label}: ${fmt(p.value)} ${unit}`}</title>
        </circle>
      ))}
      {labelIdx.map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor={i === 0 && points.length > 1 ? 'start' : i === points.length - 1 && points.length > 1 ? 'end' : 'middle'}
          className="axis"
        >
          {points[i].label}
        </text>
      ))}
    </svg>
  );
}