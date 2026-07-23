import type { PoopLog } from '../types/log';
import type { MealLog } from '../types/meal';
import type { WalkLog } from '../types/walk';

export type DailySummary = {
	poopCount: number;
	mealCount: number;
	walkCount: number;
	walkMinutes: number;
};

export type WeeklySummary = {
	poopCount: number;
	softPoopCount: number;
	hardPoopCount: number;
	coprophagiaCount: number;
	mealCount: number;
	allEatenCount: number;
	noneEatenCount: number;
	walkCount: number;
	walkMinutes: number;
};

export function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isWithinRange(datetime: string, start: Date, end: Date) {
	const timestamp = new Date(datetime).getTime();
	return !Number.isNaN(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
}

export function getLocalDayRange(referenceDate: Date, days: number) {
	const end = startOfLocalDay(referenceDate);
	end.setDate(end.getDate() + 1);
	const start = startOfLocalDay(referenceDate);
	start.setDate(start.getDate() - (days - 1));
	return { start, end };
}

export function getTodaySummary(
	poopLogs: readonly PoopLog[],
	mealLogs: readonly MealLog[],
	walkLogs: readonly WalkLog[],
	referenceDate = new Date(),
): DailySummary {
	const { start, end } = getLocalDayRange(referenceDate, 1);
	const todayPoopLogs = poopLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const todayMealLogs = mealLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const todayWalkLogs = walkLogs.filter((log) => isWithinRange(log.datetime, start, end));

	return {
		poopCount: todayPoopLogs.length,
		mealCount: todayMealLogs.length,
		walkCount: todayWalkLogs.length,
		walkMinutes: todayWalkLogs.reduce((total, log) => total + log.durationMinutes, 0),
	};
}

export function getLast7DaysSummary(
	poopLogs: readonly PoopLog[],
	mealLogs: readonly MealLog[],
	walkLogs: readonly WalkLog[],
	referenceDate = new Date(),
): WeeklySummary {
	const { start, end } = getLocalDayRange(referenceDate, 7);
	const recentPoopLogs = poopLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const recentMealLogs = mealLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const recentWalkLogs = walkLogs.filter((log) => isWithinRange(log.datetime, start, end));

	return {
		poopCount: recentPoopLogs.length,
		softPoopCount: recentPoopLogs.filter((log) => log.condition === 'soft').length,
		hardPoopCount: recentPoopLogs.filter((log) => log.condition === 'hard').length,
		coprophagiaCount: recentPoopLogs.filter((log) => log.coprophagia).length,
		mealCount: recentMealLogs.length,
		allEatenCount: recentMealLogs.filter((log) => log.intake === 'all').length,
		noneEatenCount: recentMealLogs.filter((log) => log.intake === 'none').length,
		walkCount: recentWalkLogs.length,
		walkMinutes: recentWalkLogs.reduce((total, log) => total + log.durationMinutes, 0),
	};
}

export function getHealthInsight(today: DailySummary, weekly: WeeklySummary): string | null {
	if (weekly.coprophagiaCount >= 1) return '直近7日間に食糞の記録があります。';
	if (weekly.softPoopCount >= 3) return `直近7日間で、やわらかめの便が${weekly.softPoopCount}回あります。`;
	if (weekly.hardPoopCount >= 3) return `直近7日間で、かための便が${weekly.hardPoopCount}回あります。`;
	if (today.mealCount === 0) return '今日はまだごはんの記録がありません。';
	if (today.walkCount === 0) return '今日はまださんぽの記録がありません。';
	return null;
}
