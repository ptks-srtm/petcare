import type { WalkLog } from '../types/walk';

export const WALK_LOG_STORAGE_KEY = 'petcare:walk-logs';

export function isWalkLog(value: unknown): value is WalkLog {
	if (!value || typeof value !== 'object') return false;

	const log = value as Record<string, unknown>;
	return (
		typeof log.id === 'string' &&
		log.id.length > 0 &&
		typeof log.datetime === 'string' &&
		!Number.isNaN(Date.parse(log.datetime)) &&
		typeof log.durationMinutes === 'number' &&
		Number.isInteger(log.durationMinutes) &&
		log.durationMinutes >= 1 &&
		log.durationMinutes <= 1440 &&
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

export function loadWalkLogs(): WalkLog[] {
	const storage = getLocalStorage();
	if (!storage) return [];
	try {
		const value = storage.getItem(WALK_LOG_STORAGE_KEY);
		if (!value) return [];
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) && parsed.every(isWalkLog) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveWalkLogs(logs: readonly WalkLog[]): boolean {
	const storage = getLocalStorage();
	if (!storage || !logs.every(isWalkLog)) return false;
	try {
		storage.setItem(WALK_LOG_STORAGE_KEY, JSON.stringify(logs));
		return true;
	} catch {
		return false;
	}
}

export function updateWalkLog(logs: readonly WalkLog[], updatedLog: WalkLog): WalkLog[] | null {
	if (!logs.some((log) => log.id === updatedLog.id)) return null;
	const nextLogs = logs.map((log) => log.id === updatedLog.id ? updatedLog : log);
	return saveWalkLogs(nextLogs) ? nextLogs : null;
}

export function deleteWalkLog(logs: readonly WalkLog[], id: string): WalkLog[] | null {
	if (!logs.some((log) => log.id === id)) return null;
	const nextLogs = logs.filter((log) => log.id !== id);
	return saveWalkLogs(nextLogs) ? nextLogs : null;
}
