import { Lightbulb } from 'lucide-react';
import type { DailySummary, WeeklySummary } from '../utils/healthSummary';
import { LOG_TYPE_META } from '../utils/logTypeMeta';
import { LogTypeIcon } from './LogTypeIcon';

export type HealthSummarySectionProps = {
	today: DailySummary;
	weekly: WeeklySummary;
	insight: string | null;
	section: 'today' | 'weekly';
};

type SummaryDetail = { label: string; value: number; suffix?: string };

const metricStyles = [
	LOG_TYPE_META.poop,
	LOG_TYPE_META.meal,
	LOG_TYPE_META.walk,
];

export function HealthSummarySection({ today, weekly, insight, section }: HealthSummarySectionProps) {
	if (section === 'today') {
		const values = [
			`${today.poopCount}回`,
			`${today.mealCount}回`,
			today.walkCount > 0 ? `${today.walkCount}回・${today.walkMinutes}分` : '0回',
		];

		return (
			<section aria-labelledby="today-summary-title" className="mb-5">
				<h2 id="today-summary-title" className="mb-3 px-1 text-lg font-semibold tracking-tight text-slate-800">今日のサマリー</h2>
				<div className="grid grid-cols-3 gap-2.5">
					{metricStyles.map(({ label }, index) => { const kind = (['poop', 'meal', 'walk'] as const)[index]; return <div key={label} className="pc-card-small min-w-0 px-2 py-3.5 text-center"><span aria-hidden="true" className="mx-auto grid size-8 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><LogTypeIcon kind={kind} size={19} /></span><span className="mt-2 block text-xs font-medium text-text-secondary">{label}</span><strong className="mt-0.5 block break-keep text-base font-semibold tabular-nums text-text-primary" aria-label={`今日の${label} ${values[index]}`}>{values[index]}</strong></div>; })}
				</div>
			</section>
		);
	}

	const weeklyMetrics: Array<(typeof metricStyles)[number] & { value: string; details: SummaryDetail[] }> = [
		{ ...metricStyles[0], value: `${weekly.poopCount}回`, details: [{ label: 'やわらかめ', value: weekly.softPoopCount }, { label: 'かため', value: weekly.hardPoopCount }, { label: '食糞あり', value: weekly.coprophagiaCount }] },
		{ ...metricStyles[1], value: `${weekly.mealCount}回`, details: [{ label: '完食', value: weekly.allEatenCount }, { label: '食べなかった', value: weekly.noneEatenCount }] },
		{ ...metricStyles[2], value: `${weekly.walkCount}回`, details: [{ label: '合計', value: weekly.walkMinutes, suffix: '分' }] },
	];

	return (
		<section aria-labelledby="weekly-summary-title" className="mt-9">
			<div className="mb-3 flex items-center justify-between gap-4 px-1"><h2 id="weekly-summary-title" className="text-xl font-semibold tracking-tight text-slate-800">直近7日間の記録</h2><a href="/trends" className="min-h-11 shrink-0 content-center text-sm font-semibold text-brand-blue transition hover:text-brand-sky focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">詳しく見る</a></div>
			<div className="grid grid-cols-3 gap-2.5">
				{weeklyMetrics.map(({ label, value, details }, index) => { const kind = (['poop', 'meal', 'walk'] as const)[index]; return <article key={label} className="pc-card-small min-w-0 p-3"><div className="flex items-center gap-1.5"><span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-subtle text-brand-primary"><LogTypeIcon kind={kind} size={18} /></span><h3 className="text-xs font-semibold text-slate-600">{label}</h3></div><p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-text-primary">{value}</p><dl className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-500">{details.filter((detail) => detail.value > 0).map((detail) => <div key={detail.label} className="flex flex-wrap justify-between gap-x-1"><dt>{detail.label}</dt><dd className="font-semibold tabular-nums text-slate-700">{detail.value}{detail.suffix ?? '回'}</dd></div>)}</dl></article>; })}
			</div>

			{insight && <aside aria-labelledby="health-insight-title" className="mt-3 flex items-start gap-3 rounded-2xl border border-border-soft bg-brand-subtle p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand-primary ring-1 ring-border-soft"><Lightbulb size={17} strokeWidth={1.8} aria-hidden="true" /></span><div><h3 id="health-insight-title" className="text-sm font-semibold text-slate-700">記録からの気づき</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{insight}</p></div></aside>}
		</section>
	);
}
