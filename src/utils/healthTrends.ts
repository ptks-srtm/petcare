import type { PoopLog } from '../types/log';
import type { MealLog } from '../types/meal';
import type { WalkLog } from '../types/walk';
import type { WeightLog } from '../types/weight';
import type { HospitalLog } from '../types/hospital';
import type { SymptomLog } from '../types/symptom';
import { getLocalDayRange, isWithinRange, startOfLocalDay } from './healthSummary.ts';
import { toLocalDateKey } from './logDate.ts';
import { buildSymptomTrendSummary, type SymptomTrendSummary } from './symptomTrends.ts';
import { getTrendComparisonPeriods } from './trendInsights.ts';

export { getTrendComparisonPeriods } from './trendInsights.ts';

export type DailyTrendPoint = {
	date: string;
	label: string;
	ariaLabel: string;
	value: number;
};

export type WeeklyPoopTrend = {
	total: number;
	normalCount: number;
	softCount: number;
	hardCount: number;
	coprophagiaCount: number;
	daily: DailyTrendPoint[];
};

export type WeeklyMealTrend = {
	total: number;
	allCount: number;
	mostCount: number;
	halfCount: number;
	littleCount: number;
	noneCount: number;
	daily: DailyTrendPoint[];
};

export type WeeklyWalkTrend = {
	count: number;
	totalMinutes: number;
	averageMinutesPerDay: number;
	daily: DailyTrendPoint[];
};

export type WeeklyHealthTrends = {
	periodLabel: string;
	poop: WeeklyPoopTrend;
	meal: WeeklyMealTrend;
	walk: WeeklyWalkTrend;
};

export type TrendPeriodDays = 7 | 30 | 90;

export type TrendLogCollections = {
	poop: readonly PoopLog[];
	meal: readonly MealLog[];
	walk: readonly WalkLog[];
	weight: readonly WeightLog[];
	hospital: readonly HospitalLog[];
	symptom: readonly SymptomLog[];
};

export type TrendComparisonPeriods = {
	current: { start: Date; end: Date };
	previous: { start: Date; end: Date };
};

export type TrendChartPoint = {
	date: string;
	ariaLabel: string;
	value: number | null;
};

export type PeriodHealthTrends = {
	periodDays: TrendPeriodDays;
	periodLabel: string;
	totalRecords: number;
	weight: {
		count: number;
		latest: WeightLog | null;
		previous: WeightLog | null;
		differenceKg: number | null;
		averageKg: number | null;
		daily: TrendChartPoint[];
	};
	walk: {
		count: number;
		totalMinutes: number;
		averageMinutesPerWalk: number | null;
		averageWalksPerDay: number;
		daily: TrendChartPoint[];
	};
	meal: {
		total: number;
		averagePerDay: number;
		allCount: number;
		mostCount: number;
		halfCount: number;
		littleCount: number;
		noneCount: number;
		allOrMostPercentage: number | null;
		mostCommonIntakes: MealLog['intake'][];
	};
	poop: {
		total: number;
		averagePerDay: number;
		normalCount: number;
		softCount: number;
		hardCount: number;
		coprophagiaCount: number;
		normalPercentage: number | null;
		softPercentage: number | null;
		hardPercentage: number | null;
	};
	hospital: {
		latest: HospitalLog | null;
		count: number;
		costTotalYen: number;
		costRecordedCount: number;
	};
	symptom: SymptomTrendSummary;
};

export type PeriodHealthTrendComparison = {
	current: PeriodHealthTrends;
	previous: PeriodHealthTrends;
	periods: TrendComparisonPeriods;
};

function formatPeriodLabel(start: Date, end: Date) {
	const crossesYear = start.getFullYear() !== end.getFullYear();
	const format = (date: Date) => `${crossesYear ? `${date.getFullYear()}年` : ''}${date.getMonth() + 1}月${date.getDate()}日`;
	return `${format(start)}〜${format(end)}`;
}

function createPeriodPoints(referenceDate: Date, days: TrendPeriodDays): TrendChartPoint[] {
	const firstDay = startOfLocalDay(referenceDate);
	firstDay.setDate(firstDay.getDate() - (days - 1));
	return Array.from({ length: days }, (_, index) => {
		const date = new Date(firstDay);
		date.setDate(firstDay.getDate() + index);
		return {
			date: toLocalDateKey(date),
			ariaLabel: new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date),
			value: null,
		};
	});
}

function percentage(count: number, total: number) {
	return total === 0 ? null : Math.round((count / total) * 100);
}

export function getPeriodHealthTrends(
	poopLogs: readonly PoopLog[],
	mealLogs: readonly MealLog[],
	walkLogs: readonly WalkLog[],
	weightLogs: readonly WeightLog[],
	hospitalLogs: readonly HospitalLog[],
	symptomLogs: readonly SymptomLog[],
	periodDays: TrendPeriodDays,
	referenceDate = new Date(),
): PeriodHealthTrends {
	const { start, end } = getLocalDayRange(referenceDate, periodDays);
	const periodEnd = startOfLocalDay(referenceDate);
	const recentPoop = poopLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const recentMeal = mealLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const recentWalk = walkLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const recentWeight = weightLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const recentHospital = hospitalLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const symptom = buildSymptomTrendSummary(symptomLogs, { start, end });

	const weightByDay = new Map<string, WeightLog>();
	for (const log of recentWeight) {
		const key = toLocalDateKey(new Date(log.datetime));
		const current = weightByDay.get(key);
		if (!current || new Date(log.datetime).getTime() > new Date(current.datetime).getTime()) weightByDay.set(key, log);
	}
	const weightPoints = createPeriodPoints(referenceDate, periodDays).map((point) => ({ ...point, value: weightByDay.get(point.date)?.weightKg ?? null }));
	const dailyWeights = Array.from(weightByDay.values());
	const sortedAllWeights = [...weightLogs].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
	const latestWeight = [...recentWeight].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0] ?? null;
	const latestWeightIndex = latestWeight ? sortedAllWeights.findIndex((log) => log.id === latestWeight.id) : -1;
	const previousWeight = latestWeightIndex >= 0 ? sortedAllWeights[latestWeightIndex + 1] ?? null : null;

	const walkMinutesByDay = new Map<string, number>();
	for (const log of recentWalk) {
		const key = toLocalDateKey(new Date(log.datetime));
		walkMinutesByDay.set(key, (walkMinutesByDay.get(key) ?? 0) + log.durationMinutes);
	}
	const walkPoints = createPeriodPoints(referenceDate, periodDays).map((point) => ({ ...point, value: walkMinutesByDay.get(point.date) ?? 0 }));
	const walkMinutes = recentWalk.reduce((total, log) => total + log.durationMinutes, 0);

	const mealCounts: Record<MealLog['intake'], number> = { all: 0, most: 0, half: 0, little: 0, none: 0 };
	recentMeal.forEach((log) => { mealCounts[log.intake] += 1; });
	const intakeOrder: MealLog['intake'][] = ['all', 'most', 'half', 'little', 'none'];
	const maximumIntakeCount = Math.max(...intakeOrder.map((intake) => mealCounts[intake]));
	const mostCommonIntakes = maximumIntakeCount === 0 ? [] : intakeOrder.filter((intake) => mealCounts[intake] === maximumIntakeCount);

	const normalCount = recentPoop.filter((log) => log.condition === 'normal').length;
	const softCount = recentPoop.filter((log) => log.condition === 'soft').length;
	const hardCount = recentPoop.filter((log) => log.condition === 'hard').length;
	const costRecordedLogs = recentHospital.filter((log) => log.costYen !== undefined);
	const latestHospital = [...hospitalLogs].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0] ?? null;

	return {
		periodDays,
		periodLabel: formatPeriodLabel(start, periodEnd),
		totalRecords: recentPoop.length + recentMeal.length + recentWalk.length + recentWeight.length + recentHospital.length + symptom.logCount,
		weight: {
			count: recentWeight.length,
			latest: latestWeight,
			previous: previousWeight,
			differenceKg: latestWeight && previousWeight ? Math.round((latestWeight.weightKg - previousWeight.weightKg) * 100) / 100 : null,
			averageKg: dailyWeights.length ? dailyWeights.reduce((total, log) => total + log.weightKg, 0) / dailyWeights.length : null,
			daily: weightPoints,
		},
		walk: {
			count: recentWalk.length,
			totalMinutes: walkMinutes,
			averageMinutesPerWalk: recentWalk.length ? walkMinutes / recentWalk.length : null,
			averageWalksPerDay: recentWalk.length / periodDays,
			daily: walkPoints,
		},
		meal: {
			total: recentMeal.length,
			averagePerDay: recentMeal.length / periodDays,
			allCount: mealCounts.all,
			mostCount: mealCounts.most,
			halfCount: mealCounts.half,
			littleCount: mealCounts.little,
			noneCount: mealCounts.none,
			allOrMostPercentage: percentage(mealCounts.all + mealCounts.most, recentMeal.length),
			mostCommonIntakes,
		},
		poop: {
			total: recentPoop.length,
			averagePerDay: recentPoop.length / periodDays,
			normalCount,
			softCount,
			hardCount,
			coprophagiaCount: recentPoop.filter((log) => log.coprophagia).length,
			normalPercentage: percentage(normalCount, recentPoop.length),
			softPercentage: percentage(softCount, recentPoop.length),
			hardPercentage: percentage(hardCount, recentPoop.length),
		},
		hospital: {
			latest: latestHospital,
			count: recentHospital.length,
			costTotalYen: costRecordedLogs.reduce((total, log) => total + (log.costYen ?? 0), 0),
			costRecordedCount: costRecordedLogs.length,
		},
		symptom,
	};
}

export function getPeriodHealthTrendComparison(
	logs: TrendLogCollections,
	periodDays: TrendPeriodDays,
	referenceDate = new Date(),
): PeriodHealthTrendComparison {
	const periods = getTrendComparisonPeriods(periodDays, referenceDate);
	const previousReferenceDate = new Date(periods.previous.end);
	previousReferenceDate.setDate(previousReferenceDate.getDate() - 1);

	return {
		current: getPeriodHealthTrends(logs.poop, logs.meal, logs.walk, logs.weight, logs.hospital, logs.symptom, periodDays, referenceDate),
		previous: getPeriodHealthTrends(logs.poop, logs.meal, logs.walk, logs.weight, logs.hospital, logs.symptom, periodDays, previousReferenceDate),
		periods,
	};
}

function createDailyPoints(referenceDate: Date): DailyTrendPoint[] {
	const firstDay = startOfLocalDay(referenceDate);
	firstDay.setDate(firstDay.getDate() - 6);
	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(firstDay);
		date.setDate(firstDay.getDate() + index);
		return {
			date: toLocalDateKey(date),
			label: index === 6 ? '今日' : new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(date).replace('曜日', ''),
			ariaLabel: new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date),
			value: 0,
		};
	});
}

function increment(points: DailyTrendPoint[], datetime: string, amount = 1) {
	const key = toLocalDateKey(new Date(datetime));
	const point = points.find((item) => item.date === key);
	if (point) point.value += amount;
}

export function getWeeklyHealthTrends(
	poopLogs: readonly PoopLog[],
	mealLogs: readonly MealLog[],
	walkLogs: readonly WalkLog[],
	referenceDate = new Date(),
): WeeklyHealthTrends {
	const { start, end } = getLocalDayRange(referenceDate, 7);
	const periodEnd = startOfLocalDay(referenceDate);
	const recentPoop = poopLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const recentMeal = mealLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const recentWalk = walkLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const poopDaily = createDailyPoints(referenceDate);
	const mealDaily = createDailyPoints(referenceDate);
	const walkDaily = createDailyPoints(referenceDate);
	recentPoop.forEach((log) => increment(poopDaily, log.datetime));
	recentMeal.forEach((log) => increment(mealDaily, log.datetime));
	recentWalk.forEach((log) => increment(walkDaily, log.datetime, log.durationMinutes));
	const walkMinutes = recentWalk.reduce((total, log) => total + log.durationMinutes, 0);

	return {
		periodLabel: formatPeriodLabel(start, periodEnd),
		poop: {
			total: recentPoop.length,
			normalCount: recentPoop.filter((log) => log.condition === 'normal').length,
			softCount: recentPoop.filter((log) => log.condition === 'soft').length,
			hardCount: recentPoop.filter((log) => log.condition === 'hard').length,
			coprophagiaCount: recentPoop.filter((log) => log.coprophagia).length,
			daily: poopDaily,
		},
		meal: {
			total: recentMeal.length,
			allCount: recentMeal.filter((log) => log.intake === 'all').length,
			mostCount: recentMeal.filter((log) => log.intake === 'most').length,
			halfCount: recentMeal.filter((log) => log.intake === 'half').length,
			littleCount: recentMeal.filter((log) => log.intake === 'little').length,
			noneCount: recentMeal.filter((log) => log.intake === 'none').length,
			daily: mealDaily,
		},
		walk: {
			count: recentWalk.length,
			totalMinutes: walkMinutes,
			averageMinutesPerDay: Math.round(walkMinutes / 7),
			daily: walkDaily,
		},
	};
}
