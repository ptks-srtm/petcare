import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { HospitalLog } from '../types/hospital';
import type { MealLog } from '../types/meal';
import type { PoopLog } from '../types/log';
import type { WalkLog } from '../types/walk';
import type { WeightLog } from '../types/weight';
import { getPeriodHealthTrends, type PeriodHealthTrends, type TrendPeriodDays } from '../utils/healthTrends';
import { startOfLocalDay } from '../utils/healthSummary';
import { loadHospitalLogs } from '../utils/hospitalStorage';
import { loadMealLogs } from '../utils/mealStorage';
import { loadPoopLogs } from '../utils/storage';
import { loadWalkLogs } from '../utils/walkStorage';
import { loadWeightLogs } from '../utils/weightStorage';
import type { LogType } from '../utils/logTypeMeta';
import { EmptyState } from './EmptyState';
import { LogTypeIcon } from './LogTypeIcon';
import { TrendPeriodSelector } from './TrendPeriodSelector';
import { TrendSparkline } from './TrendSparkline';

type TrendLogs = {
	poop: PoopLog[];
	meal: MealLog[];
	walk: WalkLog[];
	weight: WeightLog[];
	hospital: HospitalLog[];
};

const intakeLabels: Record<MealLog['intake'], string> = { all: '完食', most: 'ほぼ完食', half: '半分くらい', little: '少しだけ', none: '食べなかった' };

function formatDecimal(value: number) {
	return new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatWeight(value: number) {
	return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 }).format(value)}kg`;
}

function TrendCard({ kind, title, children }: { kind: LogType; title: string; children: ReactNode }) {
	return <section aria-labelledby={`period-trend-${kind}`} className="pc-card p-5"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><LogTypeIcon kind={kind} size={23} /></span><h2 id={`period-trend-${kind}`} className="text-lg font-semibold text-slate-800">{title}</h2></div>{children}</section>;
}

function CardEmpty({ children }: { children: ReactNode }) {
	return <p className="mt-4 rounded-2xl border border-dashed border-border-soft bg-brand-subtle/55 px-4 py-5 text-center text-sm text-text-secondary">{children}</p>;
}

function Metric({ label, value }: { label: string; value: string }) {
	return <div className="min-w-0 rounded-xl border border-border-soft bg-brand-subtle/45 px-3 py-2.5"><dt className="text-xs leading-relaxed text-text-secondary">{label}</dt><dd className="mt-0.5 break-words text-base font-semibold tabular-nums text-text-primary">{value}</dd></div>;
}

function PercentageRow({ label, count, percentage }: { label: string; count: number; percentage: number }) {
	return <div><div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium text-slate-600">{label}</span><span className="shrink-0 tabular-nums text-slate-500">{count}件・{percentage}%</span></div><div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-sky" style={{ width: `${percentage}%` }} /></div></div>;
}

function formatHospitalRecency(datetime: string, referenceDate = new Date()) {
	const today = startOfLocalDay(referenceDate);
	const visit = startOfLocalDay(new Date(datetime));
	const difference = Math.round((today.getTime() - visit.getTime()) / 86_400_000);
	if (difference === 0) return '今日';
	if (difference === 1) return '昨日';
	if (difference > 1) return `${difference}日前`;
	return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(visit);
}

function WeightCard({ trends }: { trends: PeriodHealthTrends }) {
	const { weight } = trends;
	return <TrendCard kind="weight" title="体重">{!weight.latest || weight.averageKg === null ? <CardEmpty>この期間の体重記録はありません</CardEmpty> : <>
		<div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs text-text-secondary">最新体重</p><p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-text-primary">{formatWeight(weight.latest.weightKg)}</p></div><p className="text-xs font-medium text-slate-500">記録 {weight.count}件</p></div>
		<p className="mt-2 text-sm leading-relaxed text-slate-600">{weight.differenceKg === null ? '比較できる前回記録がありません' : weight.differenceKg > 0 ? `前回より${formatWeight(weight.differenceKg)}増えています` : weight.differenceKg < 0 ? `前回より${formatWeight(Math.abs(weight.differenceKg))}減っています` : '前回と同じです'}</p>
		<dl className="mt-4 grid grid-cols-2 gap-2"><Metric label="期間内の平均体重" value={formatWeight(weight.averageKg)} /><Metric label="測定した日数" value={`${weight.daily.filter((point) => point.value !== null).length}日`} /></dl>
		<TrendSparkline points={weight.daily} unit="kg" label={`${trends.periodDays}日間の体重推移`} />
	</>}</TrendCard>;
}

function WalkCard({ trends }: { trends: PeriodHealthTrends }) {
	const { walk } = trends;
	return <TrendCard kind="walk" title="さんぽ">{walk.count === 0 || walk.averageMinutesPerWalk === null ? <CardEmpty>この期間のさんぽ記録はありません</CardEmpty> : <><dl className="mt-4 grid grid-cols-2 gap-2"><Metric label="1回あたりの平均時間" value={`${formatDecimal(walk.averageMinutesPerWalk)}分`} /><Metric label="1日あたりの平均回数" value={`${formatDecimal(walk.averageWalksPerDay)}回`} /><Metric label="期間内の合計時間" value={`${walk.totalMinutes}分`} /><Metric label="期間内の回数" value={`${walk.count}回`} /></dl><TrendSparkline points={walk.daily} unit="分" label={`${trends.periodDays}日間の日別さんぽ時間`} includeZero /></>}</TrendCard>;
}

function MealCard({ trends }: { trends: PeriodHealthTrends }) {
	const { meal } = trends;
	const mostCommonLabel = meal.mostCommonIntakes.map((intake) => intakeLabels[intake]).join('・');
	const isMostCommonTied = meal.mostCommonIntakes.length > 1;
	const rows = [
		['完食', meal.allCount], ['ほぼ完食', meal.mostCount], ['半分くらい', meal.halfCount], ['少しだけ', meal.littleCount], ['食べなかった', meal.noneCount],
	] as const;
	return <TrendCard kind="meal" title="ごはん">{meal.total === 0 || meal.allOrMostPercentage === null || meal.mostCommonIntakes.length === 0 ? <CardEmpty>この期間のごはん記録はありません</CardEmpty> : <><dl className="mt-4 grid grid-cols-2 gap-2"><Metric label="1日あたりの平均回数" value={`${formatDecimal(meal.averagePerDay)}回`} /><Metric label="完食・ほぼ完食" value={`${meal.allOrMostPercentage}%`} /></dl><p className="mt-4 text-sm text-slate-600">最も多い記録：<span className="font-semibold text-slate-700">{mostCommonLabel}{isMostCommonTied ? '（同率）' : ''}</span></p><div className="mt-4 space-y-3">{rows.filter(([, count]) => count > 0).map(([label, count]) => <PercentageRow key={label} label={label} count={count} percentage={Math.round((count / meal.total) * 100)} />)}</div></>}</TrendCard>;
}

function PoopCard({ trends }: { trends: PeriodHealthTrends }) {
	const { poop } = trends;
	const rows = [
		['ふつう', poop.normalCount, poop.normalPercentage], ['やわらかめ', poop.softCount, poop.softPercentage], ['かため', poop.hardCount, poop.hardPercentage],
	] as const;
	return <TrendCard kind="poop" title="うんち">{poop.total === 0 ? <CardEmpty>この期間のうんち記録はありません</CardEmpty> : <><dl className="mt-4 grid grid-cols-2 gap-2"><Metric label="1日あたりの平均回数" value={`${formatDecimal(poop.averagePerDay)}回`} /><Metric label="期間内の回数" value={`${poop.total}回`} /></dl><div className="mt-4 space-y-3">{rows.map(([label, count, percentage]) => <PercentageRow key={label} label={label} count={count} percentage={percentage ?? 0} />)}</div>{poop.coprophagiaCount > 0 && <p className="mt-4 text-sm text-slate-600">食糞あり：<span className="font-semibold tabular-nums text-slate-700">{poop.coprophagiaCount}件</span></p>}</>}</TrendCard>;
}

function HospitalCard({ trends }: { trends: PeriodHealthTrends }) {
	const { hospital } = trends;
	return <TrendCard kind="hospital" title="ケア・病院">{!hospital.latest ? <CardEmpty>病院の記録はありません</CardEmpty> : <><dl className="mt-4 grid grid-cols-2 gap-2"><Metric label="最終受診" value={formatHospitalRecency(hospital.latest.datetime)} /><Metric label="期間内の受診" value={`${hospital.count}回`} />{hospital.costRecordedCount > 0 ? <Metric label="医療費合計" value={`${new Intl.NumberFormat('ja-JP').format(hospital.costTotalYen)}円`} /> : <Metric label="医療費合計" value="記録なし" />}<Metric label="費用入力" value={`${hospital.costRecordedCount}／${hospital.count}件`} /></dl>{hospital.costRecordedCount === 0 && hospital.count > 0 && <p className="mt-3 text-sm text-slate-500">費用の記録はありません</p>}</>}</TrendCard>;
}

export function TrendsApp() {
	const [periodDays, setPeriodDays] = useState<TrendPeriodDays>(7);
	const [logs, setLogs] = useState<TrendLogs | null>(null);

	useEffect(() => {
		setLogs({ poop: loadPoopLogs(), meal: loadMealLogs(), walk: loadWalkLogs(), weight: loadWeightLogs(), hospital: loadHospitalLogs() });
	}, []);

	const trends = useMemo(() => logs ? getPeriodHealthTrends(logs.poop, logs.meal, logs.walk, logs.weight, logs.hospital, periodDays) : null, [logs, periodDays]);

	if (!trends) return <div className="space-y-5" aria-label="傾向を読み込み中"><div className="pc-skeleton h-14 rounded-2xl bg-slate-100" /><div className="pc-card pc-skeleton h-64 p-5" /><div className="pc-card pc-skeleton h-64 p-5" /></div>;

	const keepHospitalCard = trends.totalRecords === 0 && Boolean(trends.hospital.latest);
	return <>
		<TrendPeriodSelector value={periodDays} onChange={setPeriodDays} />
		<div className="my-5 rounded-2xl border border-border-soft bg-brand-subtle px-4 py-3 text-center"><p className="text-xs font-medium text-text-secondary">対象期間</p><p className="mt-0.5 text-base font-semibold tabular-nums text-text-primary">{trends.periodLabel}</p></div>
		{trends.totalRecords === 0 ? <><EmptyState title="この期間の記録はありません" description="毎日の記録を追加すると、傾向を確認できます。" action={<a href="/" className="pc-button-primary px-5 text-sm">記録する</a>} />{keepHospitalCard && <div className="mt-5"><HospitalCard trends={trends} /></div>}</> : <div className="space-y-5"><WeightCard trends={trends} /><WalkCard trends={trends} /><MealCard trends={trends} /><PoopCard trends={trends} /><HospitalCard trends={trends} /></div>}
	</>;
}
