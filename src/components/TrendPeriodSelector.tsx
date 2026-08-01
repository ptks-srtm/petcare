import type { TrendPeriodDays } from '../utils/healthTrends';

export function TrendPeriodSelector({ value, onChange }: { value: TrendPeriodDays; onChange: (value: TrendPeriodDays) => void }) {
	const options: TrendPeriodDays[] = [7, 30, 90];
	return <fieldset>
		<legend className="sr-only">傾向を表示する期間</legend>
		<div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border-soft bg-white p-1.5" role="radiogroup">
			{options.map((days) => <label key={days} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-sky ${value === days ? 'border-brand-sky bg-brand-subtle text-brand-blue' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}><input type="radio" name="trend-period" value={days} checked={value === days} onChange={() => onChange(days)} className="sr-only" /><span>{days}日</span></label>)}
		</div>
	</fieldset>;
}
