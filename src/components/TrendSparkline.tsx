import type { TrendChartPoint } from '../utils/healthTrends';

export function TrendSparkline({ points, unit, label, includeZero = false }: { points: readonly TrendChartPoint[]; unit: string; label: string; includeZero?: boolean }) {
	const available = points.map((point, index) => ({ ...point, index })).filter((point): point is TrendChartPoint & { value: number; index: number } => point.value !== null);
	if (available.length === 0) return null;
	const values = available.map((point) => point.value);
	let minimum = includeZero ? 0 : Math.min(...values);
	let maximum = Math.max(...values);
	if (minimum === maximum) {
		const padding = Math.max(Math.abs(minimum) * 0.05, 1);
		minimum -= includeZero ? 0 : padding;
		maximum += padding;
	}
	const width = 300;
	const height = 92;
	const inset = 8;
	const x = (index: number) => points.length <= 1 ? width / 2 : inset + (index / (points.length - 1)) * (width - inset * 2);
	const y = (value: number) => height - inset - ((value - minimum) / (maximum - minimum)) * (height - inset * 2);
	const path = available.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.index).toFixed(2)} ${y(point.value).toFixed(2)}`).join(' ');
	return <div role="group" aria-label={label} className="mt-5 border-t border-slate-100 pt-4">
		<svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full overflow-visible" aria-hidden="true" preserveAspectRatio="none">
			<path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-sky" />
			{available.map((point) => <circle key={point.date} cx={x(point.index)} cy={y(point.value)} r={available.length === 1 ? 4 : 2.5} fill="currentColor" className="text-brand-blue" />)}
		</svg>
		<div className="flex justify-between text-[10px] font-medium text-slate-400"><span>{points[0]?.ariaLabel}</span><span>{points.at(-1)?.ariaLabel}</span></div>
		<ul className="sr-only">{available.map((point) => <li key={point.date}>{point.ariaLabel}：{point.value}{unit}</li>)}</ul>
	</div>;
}
