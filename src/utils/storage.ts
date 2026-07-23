import type { PoopLog } from '../types/log';

/** Sprint 1で排便記録の保存先として使うキー。 */
export const POOP_LOG_STORAGE_KEY = 'petcare:poop-logs';

const conditions = new Set<PoopLog['condition']>(['normal', 'soft', 'hard']);

export function isPoopLog(value: unknown): value is PoopLog {
	if (!value || typeof value !== 'object') return false;

	const log = value as Record<string, unknown>;
	return (
		typeof log.id === 'string' &&
		log.id.length > 0 &&
		typeof log.datetime === 'string' &&
		!Number.isNaN(Date.parse(log.datetime)) &&
		typeof log.condition === 'string' &&
		conditions.has(log.condition as PoopLog['condition']) &&
		typeof log.coprophagia === 'boolean' &&
		typeof log.location === 'string' &&
		log.location.trim().length > 0 &&
		typeof log.memo === 'string'
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

/** localStorageから検証済みの排便記録を読み込む。 */
export function loadPoopLogs(): PoopLog[] {
	const storage = getLocalStorage();
	if (!storage) return [];

	try {
		const value = storage.getItem(POOP_LOG_STORAGE_KEY);
		if (!value) return [];

		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) && parsed.every(isPoopLog) ? parsed : [];
	} catch {
		return [];
	}
}

/** localStorageへ排便記録を保存する。成功時はtrueを返す。 */
export function savePoopLogs(logs: readonly PoopLog[]): boolean {
	const storage = getLocalStorage();
	if (!storage) return false;

	try {
		storage.setItem(POOP_LOG_STORAGE_KEY, JSON.stringify(logs));
		return true;
	} catch {
		return false;
	}
}

/** IDが一致する排便記録を更新し、保存後の配列を返す。 */
export function updatePoopLog(
	logs: readonly PoopLog[],
	updatedLog: PoopLog,
): PoopLog[] | null {
	if (!logs.some((log) => log.id === updatedLog.id)) return null;

	const nextLogs = logs.map((log) =>
		log.id === updatedLog.id ? updatedLog : log,
	);
	return savePoopLogs(nextLogs) ? nextLogs : null;
}

/** IDが一致する排便記録を削除し、保存後の配列を返す。 */
export function deletePoopLog(
	logs: readonly PoopLog[],
	id: string,
): PoopLog[] | null {
	if (!logs.some((log) => log.id === id)) return null;

	const nextLogs = logs.filter((log) => log.id !== id);
	return savePoopLogs(nextLogs) ? nextLogs : null;
}
