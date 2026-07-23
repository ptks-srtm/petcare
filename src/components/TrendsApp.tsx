import { useEffect, useState } from 'react';
import { getWeeklyHealthTrends, type DailyTrendPoint, type WeeklyHealthTrends } from '../utils/healthTrends';
import { loadMealLogs } from '../utils/mealStorage';
import { loadPoopLogs } from '../utils/storage';
import { loadWalkLogs } from '../utils/walkStorage';
import type { LogType } from '../utils/logTypeMeta';
import { LogTypeIcon } from './LogTypeIcon';
import { WeeklyBarChart } from './WeeklyBarChart';
import { EmptyState } from './EmptyState';

type Metric = { label: string; value: string };

function TrendSection({ kind, title, primary, metrics, points, unit }: { kind: LogType; title: string; primary: string; metrics: Metric[]; points: readonly DailyTrendPoint[]; unit: '回' | '分' }) {
	return (
		<section aria-labelledby={`trend-${kind}-title`} className="pc-card p-5">
			<div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><LogTypeIcon kind={kind} size={23} /></span><div><h2 id={`trend-${kind}-title`} className="text-lg font-semibold text-slate-800">{title}</h2><p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-text-primary">{primary}</p></div></div>
			<dl className="mt-4 grid grid-cols-2 gap-2">{metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-border-soft bg-brand-subtle/50 px-3 py-2.5"><dt className="text-xs text-text-secondary">{metric.label}</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-text-primary">{metric.value}</dd></div>)}</dl>
			<WeeklyBarChart points={points} unit={unit} label={`${title}の直近7日間の日別${unit === '分' ? '時間' : '件数'}`} />
		</section>
	);
}

export function TrendsApp() {
	const [trends, setTrends] = useState<WeeklyHealthTrends | null>(null);

	useEffect(() => {
		setTrends(getWeeklyHealthTrends(loadPoopLogs(), loadMealLogs(), loadWalkLogs()));
	}, []);

	if (!trends) return <div className="space-y-5" aria-label="傾向を読み込み中"><div className="pc-skeleton h-16 rounded-2xl bg-slate-100" /><div className="pc-card pc-skeleton h-80 p-5" /><div className="pc-card pc-skeleton h-80 p-5" /></div>;

	const hasLogs = trends.poop.total + trends.meal.total + trends.walk.count > 0;
	return (
		<>
			<div className="mb-5 rounded-2xl border border-border-soft bg-brand-subtle px-4 py-3 text-center"><p className="text-xs font-medium text-text-secondary">対象期間</p><p className="mt-0.5 text-base font-semibold tabular-nums text-text-primary">{trends.periodLabel}</p></div>
			{!hasLogs && <div className="mb-5"><EmptyState description="うんち・ごはん・さんぽを記録すると、7日間の傾向を確認できます。" action={<a href="/" className="pc-button-primary px-5 text-sm">記録する</a>} /></div>}
			<div className="space-y-5">
				<TrendSection kind="poop" title="うんち" primary={`合計 ${trends.poop.total}回`} unit="回" points={trends.poop.daily} metrics={[{ label: 'ふつう', value: `${trends.poop.normalCount}回` }, { label: 'やわらかめ', value: `${trends.poop.softCount}回` }, { label: 'かため', value: `${trends.poop.hardCount}回` }, { label: '食糞あり', value: `${trends.poop.coprophagiaCount}回` }]} />
				<TrendSection kind="meal" title="ごはん" primary={`合計 ${trends.meal.total}回`} unit="回" points={trends.meal.daily} metrics={[{ label: '完食', value: `${trends.meal.allCount}回` }, { label: 'ほぼ完食', value: `${trends.meal.mostCount}回` }, { label: '半分くらい', value: `${trends.meal.halfCount}回` }, { label: '少しだけ', value: `${trends.meal.littleCount}回` }, { label: '食べなかった', value: `${trends.meal.noneCount}回` }]} />
				<TrendSection kind="walk" title="さんぽ" primary={`${trends.walk.count}回`} unit="分" points={trends.walk.daily} metrics={[{ label: '合計時間', value: `${trends.walk.totalMinutes}分` }, { label: '1日平均', value: `${trends.walk.averageMinutesPerDay}分` }]} />
			</div>
		</>
	);
}
