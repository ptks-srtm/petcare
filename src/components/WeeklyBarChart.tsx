import type { DailyTrendPoint } from '../utils/healthTrends';

export type WeeklyBarChartProps = {
	points: readonly DailyTrendPoint[];
	unit: '回' | '分';
	label: string;
};

export function WeeklyBarChart({ points, unit, label }: WeeklyBarChartProps) {
	const maximum = Math.max(...points.map((point) => point.value), 0);
	return (
		<div role="group" aria-label={label} className="mt-5 border-t border-slate-100 pt-5">
			<div className="grid h-36 grid-cols-7 items-end gap-1.5" aria-hidden="true">
				{points.map((point) => {
					const height = point.value === 0 || maximum === 0 ? 2 : Math.max(10, Math.round((point.value / maximum) * 96));
					return <div key={point.date} className="flex min-w-0 flex-col items-center justify-end"><span className="mb-1 text-[10px] font-semibold tabular-nums text-slate-500">{point.value}</span><span className={`w-full max-w-7 rounded-t-lg ${point.value === 0 ? 'bg-slate-200' : 'bg-brand-sky'}`} style={{ height }} /></div>;
				})}
			</div>
			<div className="mt-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-slate-500" aria-hidden="true">{points.map((point) => <span key={point.date} className="min-w-0">{point.label}</span>)}</div>
			<ul className="sr-only">{points.map((point) => <li key={point.date}>{point.ariaLabel}：{point.value}{unit}</li>)}</ul>
		</div>
	);
}
