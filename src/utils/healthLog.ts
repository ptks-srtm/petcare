import type { PoopLog } from '../types/log';
import type { MealLog } from '../types/meal';
import type { WalkLog } from '../types/walk';
import { sortLogsNewestFirst } from './logDate';

export type HealthLogEntry =
	| { kind: 'poop'; id: string; datetime: string; log: PoopLog }
	| { kind: 'meal'; id: string; datetime: string; log: MealLog }
	| { kind: 'walk'; id: string; datetime: string; log: WalkLog };

export type HealthLogKind = HealthLogEntry['kind'];
export type HealthLogTarget = Pick<HealthLogEntry, 'kind' | 'id'>;

export function getHealthLogKey(target: HealthLogTarget) {
	return `${target.kind}-${target.id}`;
}

export function combineHealthLogs(
	poopLogs: readonly PoopLog[],
	mealLogs: readonly MealLog[],
	walkLogs: readonly WalkLog[],
): HealthLogEntry[] {
	return sortLogsNewestFirst([
		...poopLogs.map((log) => ({ kind: 'poop' as const, id: log.id, datetime: log.datetime, log })),
		...mealLogs.map((log) => ({ kind: 'meal' as const, id: log.id, datetime: log.datetime, log })),
		...walkLogs.map((log) => ({ kind: 'walk' as const, id: log.id, datetime: log.datetime, log })),
	]);
}
