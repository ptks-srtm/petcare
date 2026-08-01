import type { PeriodHealthTrends, TrendPeriodDays } from '../utils/healthTrends';

export type TrendInsightKind = 'walk' | 'meal' | 'poop';

export type TrendInsight = {
	id: string;
	kind: TrendInsightKind;
	priority: number;
	message: string;
};

export type TrendInsightEvaluation = {
	insights: TrendInsight[];
	hasSufficientData: boolean;
};

export type TrendInsightContext = {
	periodDays: TrendPeriodDays;
	current: PeriodHealthTrends;
	previous: PeriodHealthTrends;
};

export type TrendInsightRule = {
	id: string;
	priority: number;
	evaluate: (context: TrendInsightContext) => TrendInsight | null;
};
