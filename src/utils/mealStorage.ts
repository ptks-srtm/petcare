import type { MealLog } from '../types/meal';

export const MEAL_LOG_STORAGE_KEY = 'petcare:meal-logs';

const mealTypes = new Set<MealLog['mealType']>([
	'breakfast',
	'lunch',
	'dinner',
	'snack',
	'other',
]);
const intakeValues = new Set<MealLog['intake']>([
	'all',
	'most',
	'half',
	'little',
	'none',
]);

export function isMealLog(value: unknown): value is MealLog {
	if (!value || typeof value !== 'object') return false;

	const log = value as Record<string, unknown>;
	return (
		typeof log.id === 'string' &&
		log.id.length > 0 &&
		typeof log.datetime === 'string' &&
		!Number.isNaN(Date.parse(log.datetime)) &&
		typeof log.mealType === 'string' &&
		mealTypes.has(log.mealType as MealLog['mealType']) &&
		typeof log.intake === 'string' &&
		intakeValues.has(log.intake as MealLog['intake']) &&
		(log.memo === undefined || typeof log.memo === 'string')
	);
}

function getLocalStorage(): Storage | null {
	if (typeof window === 'undefined') return null;

	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export function loadMealLogs(): MealLog[] {
	const storage = getLocalStorage();
	if (!storage) return [];

	try {
		const value = storage.getItem(MEAL_LOG_STORAGE_KEY);
		if (!value) return [];

		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) && parsed.every(isMealLog) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveMealLogs(logs: readonly MealLog[]): boolean {
	const storage = getLocalStorage();
	if (!storage || !logs.every(isMealLog)) return false;

	try {
		storage.setItem(MEAL_LOG_STORAGE_KEY, JSON.stringify(logs));
		return true;
	} catch {
		return false;
	}
}

export function updateMealLog(logs: readonly MealLog[], updatedLog: MealLog): MealLog[] | null {
	if (!logs.some((log) => log.id === updatedLog.id)) return null;
	const nextLogs = logs.map((log) => log.id === updatedLog.id ? updatedLog : log);
	return saveMealLogs(nextLogs) ? nextLogs : null;
}

export function deleteMealLog(logs: readonly MealLog[], id: string): MealLog[] | null {
	if (!logs.some((log) => log.id === id)) return null;
	const nextLogs = logs.filter((log) => log.id !== id);
	return saveMealLogs(nextLogs) ? nextLogs : null;
}
