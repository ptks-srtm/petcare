import type { PoopLog } from '../types/log';
import type { MealLog } from '../types/meal';
import type { WalkLog } from '../types/walk';
import type { HospitalLog } from '../types/hospital';
import type { WeightLog } from '../types/weight';
import { sortLogsNewestFirst } from './logDate';

export type HealthLogEntry =
	| { kind: 'poop'; id: string; datetime: string; log: PoopLog }
	| { kind: 'meal'; id: string; datetime: string; log: MealLog }
	| { kind: 'walk'; id: string; datetime: string; log: WalkLog }
	| { kind: 'hospital'; id: string; datetime: string; log: HospitalLog }
	| { kind: 'weight'; id: string; datetime: string; log: WeightLog };

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
): HealthLogEntry[] {
	return sortLogsNewestFirst([
		...poopLogs.map((log) => ({ kind: 'poop' as const, id: log.id, datetime: log.datetime, log })),
		...mealLogs.map((log) => ({ kind: 'meal' as const, id: log.id, datetime: log.datetime, log })),
		...walkLogs.map((log) => ({ kind: 'walk' as const, id: log.id, datetime: log.datetime, log })),
		...hospitalLogs.map((log) => ({ kind: 'hospital' as const, id: log.id, datetime: log.datetime, log })),
		...weightLogs.map((log) => ({ kind: 'weight' as const, id: log.id, datetime: log.datetime, log })),
	]);
}
