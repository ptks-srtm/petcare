import type { GroomingLog } from './grooming';
import type { HospitalLog } from './hospital';
import type { PoopLog } from './log';
import type { MealLog } from './meal';
import type { MedicationLog } from './medication';
import type { VaccineLog } from './vaccine';
import type { WalkLog } from './walk';
import type { WeightLog } from './weight';

export type DailyAnalysisEntry = {
	dateKey: string;
	poopLogs: PoopLog[];
	mealLogs: MealLog[];
	walkLogs: WalkLog[];
	weightLogs: WeightLog[];
	hospitalLogs: HospitalLog[];
	medicationLogs: MedicationLog[];
	vaccineLogs: VaccineLog[];
	groomingLogs: GroomingLog[];
};

export type DailyAnalysisIndex = Map<string, DailyAnalysisEntry>;
