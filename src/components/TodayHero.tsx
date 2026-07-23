import { useEffect, useState } from 'react';
import { getTodaySummary, type DailySummary } from '../utils/healthSummary';
import { loadMealLogs } from '../utils/mealStorage';
import { loadPoopLogs } from '../utils/storage';
import { loadWalkLogs } from '../utils/walkStorage';
import { LogTypeIcon } from './LogTypeIcon';

function getTodayMessage(summary: DailySummary) {
	if (summary.poopCount === 0 && summary.mealCount === 0 && summary.walkCount === 0) return 'まずは今日の様子を記録してみましょう';
	if (summary.mealCount === 0) return '今日はまだごはんの記録がありません';
	if (summary.walkCount === 0) return '今日はまださんぽの記録がありません';
	if (summary.poopCount === 0) return '今日はまだうんちの記録がありません';
	return '今日は順調です';
}

function formatToday(date: Date) {
	const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
	return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function getLocalDateValue(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function TodayHero() {
	const [summary, setSummary] = useState<DailySummary | null>(null);
	const [today, setToday] = useState<Date | null>(null);

	useEffect(() => {
		let midnightTimer: ReturnType<typeof setTimeout>;
		const refresh = () => {
			const now = new Date();
			setToday(now);
			setSummary(getTodaySummary(loadPoopLogs(), loadMealLogs(), loadWalkLogs(), now));
			const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			midnightTimer = setTimeout(refresh, nextMidnight.getTime() - now.getTime() + 1000);
		};
		refresh();
		window.addEventListener('petcare:logs-changed', refresh);
		return () => {
			clearTimeout(midnightTimer);
			window.removeEventListener('petcare:logs-changed', refresh);
		};
	}, []);

	if (!summary) {
		return <section aria-label="今日の記録を読み込み中" className="pc-card pc-skeleton mb-5 p-5"><div className="h-3 w-12 rounded-full bg-slate-100" /><div className="mt-3 h-6 w-48 rounded-full bg-slate-100" /><div className="mt-5 grid grid-cols-3 gap-3"><div className="h-12 rounded-xl bg-slate-100" /><div className="h-12 rounded-xl bg-slate-100" /><div className="h-12 rounded-xl bg-slate-100" /></div></section>;
	}

	const metrics = [
		{ kind: 'poop' as const, label: 'うんち', value: `${summary.poopCount}回` },
		{ kind: 'meal' as const, label: 'ごはん', value: `${summary.mealCount}回` },
		{ kind: 'walk' as const, label: 'さんぽ', value: `${summary.walkMinutes}分` },
	];

	return <section aria-labelledby="today-hero-title" className="pc-card pc-card-featured mb-5 p-5">
		{today && <time dateTime={getLocalDateValue(today)} className="text-xs font-semibold text-brand-primary">{formatToday(today)}</time>}
		<h1 id="today-hero-title" className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary sm:text-xl">{getTodayMessage(summary)}</h1>
		<div className="mt-4 grid grid-cols-3 divide-x divide-slate-100">
			{metrics.map((metric) => <div key={metric.kind} className="flex min-w-0 items-center justify-center gap-2 px-2 first:pl-0 last:pr-0"><span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><LogTypeIcon kind={metric.kind} size={18} /></span><span className="min-w-0"><span className="block text-[11px] text-text-secondary">{metric.label}</span><strong className="block text-sm font-semibold tabular-nums text-text-primary">{metric.value}</strong></span></div>)}
		</div>
	</section>;
}
