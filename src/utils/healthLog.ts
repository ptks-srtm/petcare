import type { PoopLog } from '../types/log';
import type { MealLog } from '../types/meal';
import type { WalkLog } from '../types/walk';
import type { HospitalLog } from '../types/hospital';
import type { WeightLog } from '../types/weight';
import type { MedicationLog } from '../types/medication';
import type { VaccineLog } from '../types/vaccine';
import type { GroomingLog } from '../types/grooming';
import type { SymptomLog } from '../types/symptom';
import { sortLogsNewestFirst } from './logDate.ts';

export type HealthLogEntry =
	| { kind: 'poop'; id: string; datetime: string; log: PoopLog }
	| { kind: 'meal'; id: string; datetime: string; log: MealLog }
	| { kind: 'walk'; id: string; datetime: string; log: WalkLog }
	| { kind: 'hospital'; id: string; datetime: string; log: HospitalLog }
	| { kind: 'medication'; id: string; datetime: string; log: MedicationLog }
	| { kind: 'vaccine'; id: string; datetime: string; log: VaccineLog }
	| { kind: 'weight'; id: string; datetime: string; log: WeightLog }
	| { kind: 'grooming'; id: string; datetime: string; log: GroomingLog }
	| { kind: 'symptom'; id: string; datetime: string; log: SymptomLog };

export type HealthLogKind = HealthLogEntry['kind'];
export type HealthLogTarget = Pick<HealthLogEntry, 'kind' | 'id'>;

export function getHealthLogKey(target: HealthLogTarget) {
	return `${target.kind}-${target.id}`;
}

export function combineHealthLogs(
	poopLogs: readonly PoopLog[],
	mealLogs: readonly MealLog[],
	walkLogs: readonly WalkLog[],
	hospitalLogs: readonly HospitalLog[] = [],
	weightLogs: readonly WeightLog[] = [],
	medicationLogs: readonly MedicationLog[] = [],
	vaccineLogs: readonly VaccineLog[] = [],
	groomingLogs: readonly GroomingLog[] = [],
	symptomLogs: readonly SymptomLog[] = [],
): HealthLogEntry[] {
	return sortLogsNewestFirst([
		...poopLogs.map((log) => ({ kind: 'poop' as const, id: log.id, datetime: log.datetime, log })),
		...mealLogs.map((log) => ({ kind: 'meal' as const, id: log.id, datetime: log.datetime, log })),
		...walkLogs.map((log) => ({ kind: 'walk' as const, id: log.id, datetime: log.datetime, log })),
		...hospitalLogs.map((log) => ({ kind: 'hospital' as const, id: log.id, datetime: log.datetime, log })),
		...weightLogs.map((log) => ({ kind: 'weight' as const, id: log.id, datetime: log.datetime, log })),
		...medicationLogs.map((log) => ({ kind: 'medication' as const, id: log.id, datetime: log.datetime, log })),
		...vaccineLogs.map((log) => ({ kind: 'vaccine' as const, id: log.id, datetime: log.datetime, log })),
		...groomingLogs.map((log) => ({ kind: 'grooming' as const, id: log.id, datetime: log.datetime, log })),
		...symptomLogs.map((log) => ({ kind: 'symptom' as const, id: log.id, datetime: log.datetime, log })),
	]);
}
