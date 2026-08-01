import type { TrendInsight, TrendInsightContext, TrendInsightEvaluation, TrendInsightRule } from '../types/trendInsights';
import type { TrendComparisonPeriods, TrendPeriodDays } from './healthTrends';
import { getLocalDayRange } from './healthSummary.ts';

const MIN_POOP_RECORDS = 3;
const MIN_MEAL_RECORDS = 3;
const MIN_WALK_RECORDS = 2;
const PERCENTAGE_POINT_THRESHOLD = 20;
const WALK_CHANGE_PERCENT_THRESHOLD = 20;
const MAX_INSIGHTS = 3;

const PRIORITY = {
	coprophagia: 400,
	poopCondition: 300,
	mealNone: 200,
	walkMinutes: 100,
} as const;

function createInsight(id: string, priority: number, kind: TrendInsight['kind'], message: string): TrendInsight {
	return { id, kind, priority, message };
}

export function getTrendComparisonPeriods(
	periodDays: TrendPeriodDays,
	referenceDate = new Date(),
): TrendComparisonPeriods {
	const current = getLocalDayRange(referenceDate, periodDays);
	const previousReferenceDate = new Date(current.start);
	previousReferenceDate.setDate(previousReferenceDate.getDate() - 1);
	const previous = getLocalDayRange(previousReferenceDate, periodDays);
	return { current, previous };
}

function percentage(count: number, total: number) {
	return total === 0 ? 0 : (count / total) * 100;
}

function meetsPercentagePointThreshold(currentCount: number, currentTotal: number, previousCount: number, previousTotal: number) {
	const differenceNumerator = Math.abs((currentCount * previousTotal) - (previousCount * currentTotal));
	return differenceNumerator * 100 >= PERCENTAGE_POINT_THRESHOLD * currentTotal * previousTotal;
}

function formatDuration(totalMinutes: number) {
	if (totalMinutes < 60) return `${totalMinutes}分`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return minutes === 0 ? `${hours}時間` : `${hours}時間${minutes}分`;
}

const coprophagiaRule: TrendInsightRule = {
	id: 'coprophagia-count',
	priority: PRIORITY.coprophagia,
	evaluate(context) {
		const count = context.current.poop.coprophagiaCount;
		if (count < 1) return null;
		return createInsight('coprophagia-count', PRIORITY.coprophagia, 'poop', `食糞ありの記録が、この${context.periodDays}日間に${count}件あります。`);
	},
};

const poopConditionRule: TrendInsightRule = {
	id: 'poop-condition-percentage',
	priority: PRIORITY.poopCondition,
	evaluate(context) {
		const { current, previous, periodDays } = context;
		if (current.poop.total < MIN_POOP_RECORDS || previous.poop.total < MIN_POOP_RECORDS) return null;

		const candidates = [
			{ label: 'やわらかめ', currentCount: current.poop.softCount, previousCount: previous.poop.softCount },
			{ label: 'かため', currentCount: current.poop.hardCount, previousCount: previous.poop.hardCount },
		].filter((candidate) => meetsPercentagePointThreshold(candidate.currentCount, current.poop.total, candidate.previousCount, previous.poop.total));

		if (candidates.length === 0) return null;
		const selected = candidates.reduce((largest, candidate) => {
			const largestDifference = Math.abs(percentage(largest.currentCount, current.poop.total) - percentage(largest.previousCount, previous.poop.total));
			const candidateDifference = Math.abs(percentage(candidate.currentCount, current.poop.total) - percentage(candidate.previousCount, previous.poop.total));
			return candidateDifference > largestDifference ? candidate : largest;
		});
		const previousPercentage = Math.round(percentage(selected.previousCount, previous.poop.total));
		const currentPercentage = Math.round(percentage(selected.currentCount, current.poop.total));
		return createInsight('poop-condition-percentage', PRIORITY.poopCondition, 'poop', `${selected.label}の割合は、前の${periodDays}日間の${previousPercentage}%から、この${periodDays}日間は${currentPercentage}%になっています。`);
	},
};

const mealNoneRule: TrendInsightRule = {
	id: 'meal-none-percentage',
	priority: PRIORITY.mealNone,
	evaluate(context) {
		const { current, previous, periodDays } = context;
		if (current.meal.total < MIN_MEAL_RECORDS || previous.meal.total < MIN_MEAL_RECORDS) return null;
		if (!meetsPercentagePointThreshold(current.meal.noneCount, current.meal.total, previous.meal.noneCount, previous.meal.total)) return null;
		const previousPercentage = Math.round(percentage(previous.meal.noneCount, previous.meal.total));
		const currentPercentage = Math.round(percentage(current.meal.noneCount, current.meal.total));
		return createInsight('meal-none-percentage', PRIORITY.mealNone, 'meal', `食べなかった割合は、前の${periodDays}日間の${previousPercentage}%から、この${periodDays}日間は${currentPercentage}%になっています。`);
	},
};

const walkMinutesRule: TrendInsightRule = {
	id: 'walk-total-minutes',
	priority: PRIORITY.walkMinutes,
	evaluate(context) {
		const { current, previous, periodDays } = context;
		if (current.walk.count < MIN_WALK_RECORDS || previous.walk.count < MIN_WALK_RECORDS || previous.walk.totalMinutes <= 0) return null;
		const difference = Math.abs(current.walk.totalMinutes - previous.walk.totalMinutes);
		if (difference * 100 < previous.walk.totalMinutes * WALK_CHANGE_PERCENT_THRESHOLD) return null;
		return createInsight('walk-total-minutes', PRIORITY.walkMinutes, 'walk', `さんぽ時間は、前の${periodDays}日間の${formatDuration(previous.walk.totalMinutes)}から、この${periodDays}日間は${formatDuration(current.walk.totalMinutes)}になっています。`);
	},
};

export const TREND_INSIGHT_RULES: readonly TrendInsightRule[] = [
	coprophagiaRule,
	poopConditionRule,
	mealNoneRule,
	walkMinutesRule,
];

function hasSufficientComparisonData(context: TrendInsightContext) {
	const canComparePoop = context.current.poop.total >= MIN_POOP_RECORDS && context.previous.poop.total >= MIN_POOP_RECORDS;
	const canCompareMeal = context.current.meal.total >= MIN_MEAL_RECORDS && context.previous.meal.total >= MIN_MEAL_RECORDS;
	const canCompareWalk = context.current.walk.count >= MIN_WALK_RECORDS
		&& context.previous.walk.count >= MIN_WALK_RECORDS
		&& context.previous.walk.totalMinutes > 0;
	return canComparePoop || canCompareMeal || canCompareWalk;
}

export function evaluateTrendInsights(context: TrendInsightContext): TrendInsightEvaluation {
	const candidates = TREND_INSIGHT_RULES
		.map((rule) => rule.evaluate(context))
		.filter((insight): insight is TrendInsight => insight !== null)
		.sort((a, b) => b.priority - a.priority);
	const selected: TrendInsight[] = [];
	const selectedKinds = new Set<TrendInsight['kind']>();

	for (const insight of candidates) {
		if (selectedKinds.has(insight.kind)) continue;
		selected.push(insight);
		selectedKinds.add(insight.kind);
		if (selected.length === MAX_INSIGHTS) break;
	}

	return {
		insights: selected,
		hasSufficientData: hasSufficientComparisonData(context),
	};
}
