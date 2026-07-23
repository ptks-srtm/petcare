import type { PoopLog } from '../types/log';
import type { MealLog } from '../types/meal';
import type { WalkLog } from '../types/walk';
import { getLocalDayRange, isWithinRange, startOfLocalDay } from './healthSummary';
import { toLocalDateKey } from './logDate';

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

function formatPeriodLabel(start: Date, end: Date) {
	const crossesYear = start.getFullYear() !== end.getFullYear();
	const format = (date: Date) => `${crossesYear ? `${date.getFullYear()}年` : ''}${date.getMonth() + 1}月${date.getDate()}日`;
	return `${format(start)}〜${format(end)}`;
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
