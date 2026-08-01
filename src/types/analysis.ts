import type { GroomingLog } from './grooming';
import type { HospitalLog } from './hospital';
import type { PoopLog } from './log';
import type { MealLog } from './meal';
import type { MedicationLog } from './medication';
import type { VaccineLog } from './vaccine';
import type { WalkLog } from './walk';
import type { WeightLog } from './weight';

export const AnalysisQuestion = {
	PoopTime: 'poop_time',
	PoopPlace: 'poop_place',
	PoopState: 'poop_state',
	MealPattern: 'meal_pattern',
	WalkPattern: 'walk_pattern',
	WeightTrend: 'weight_trend',
	HospitalSummary: 'hospital_summary',
	CareSummary: 'care_summary',
	MemoKeywords: 'memo_keywords',
} as const;

export type AnalysisQuestion = (typeof AnalysisQuestion)[keyof typeof AnalysisQuestion];

export type AnalysisResult = {
	title: string;
	summary: string;
	facts: string[];
	relatedLogs: number;
	hasEnoughData: boolean;
	note?: string;
};

export type AnalysisData = {
	poopLogs: readonly PoopLog[];
	mealLogs: readonly MealLog[];
	walkLogs: readonly WalkLog[];
	weightLogs: readonly WeightLog[];
	hospitalLogs: readonly HospitalLog[];
	medicationLogs: readonly MedicationLog[];
	vaccineLogs: readonly VaccineLog[];
	groomingLogs: readonly GroomingLog[];
};

export type AnalysisOptions = {
	referenceDate?: Date;
};

export interface AnalysisEngine {
	analyze(question: AnalysisQuestion, data: AnalysisData, options?: AnalysisOptions): AnalysisResult;
}
