import type { WeightLog } from '../types/weight';

export const WEIGHT_LOG_STORAGE_KEY = 'petcare:weight-logs';

export function isValidWeightKg(value: unknown): value is number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.01 || value > 200) return false;
	return Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON * 100;
}

export function isWeightLog(value: unknown): value is WeightLog {
	if (!value || typeof value !== 'object') return false;
	const log = value as Record<string, unknown>;
	return (
		typeof log.id === 'string' &&
		log.id.length > 0 &&
		typeof log.datetime === 'string' &&
		!Number.isNaN(Date.parse(log.datetime)) &&
		isValidWeightKg(log.weightKg) &&
		(log.memo === undefined || (typeof log.memo === 'string' && log.memo.length > 0))
	);
}

function getLocalStorage(): Storage | null {
	if (typeof window === 'undefined') return null;
	try { return window.localStorage; } catch { return null; }
}

export function loadWeightLogs(): WeightLog[] {
	const storage = getLocalStorage();
	if (!storage) return [];
	try {
		const value = storage.getItem(WEIGHT_LOG_STORAGE_KEY);
		if (!value) return [];
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) && parsed.every(isWeightLog) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveWeightLogs(logs: readonly WeightLog[]): boolean {
	const storage = getLocalStorage();
	if (!storage || !logs.every(isWeightLog)) return false;
	try {
		storage.setItem(WEIGHT_LOG_STORAGE_KEY, JSON.stringify(logs));
		return true;
	} catch {
		return false;
	}
}

export function updateWeightLog(logs: readonly WeightLog[], updatedLog: WeightLog): WeightLog[] | null {
	if (!logs.some((log) => log.id === updatedLog.id)) return null;
	const nextLogs = logs.map((log) => log.id === updatedLog.id ? updatedLog : log);
	return saveWeightLogs(nextLogs) ? nextLogs : null;
}

export function deleteWeightLog(logs: readonly WeightLog[], id: string): WeightLog[] | null {
	if (!logs.some((log) => log.id === id)) return null;
	const nextLogs = logs.filter((log) => log.id !== id);
	return saveWeightLogs(nextLogs) ? nextLogs : null;
}
