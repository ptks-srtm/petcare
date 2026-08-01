import type { HospitalLog } from '../types/hospital';

export const HOSPITAL_LOG_STORAGE_KEY = 'petcare:hospital-logs';

function isOptionalString(value: unknown) {
	return value === undefined || (typeof value === 'string' && value.length > 0);
}

function isValidDateValue(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isHospitalLog(value: unknown): value is HospitalLog {
	if (!value || typeof value !== 'object') return false;
	const log = value as Record<string, unknown>;
	return (
		typeof log.id === 'string' &&
		log.id.length > 0 &&
		typeof log.datetime === 'string' &&
		!Number.isNaN(Date.parse(log.datetime)) &&
		isOptionalString(log.hospitalName) &&
		isOptionalString(log.reason) &&
		isOptionalString(log.diagnosis) &&
		isOptionalString(log.prescription) &&
		(log.costYen === undefined || (typeof log.costYen === 'number' && Number.isSafeInteger(log.costYen) && log.costYen >= 0)) &&
		(log.nextVisitDate === undefined || (typeof log.nextVisitDate === 'string' && isValidDateValue(log.nextVisitDate))) &&
		isOptionalString(log.memo)
	);
}

function getLocalStorage(): Storage | null {
	if (typeof window === 'undefined') return null;
	try { return window.localStorage; } catch { return null; }
}

export function loadHospitalLogs(): HospitalLog[] {
	const storage = getLocalStorage();
	if (!storage) return [];
	try {
		const value = storage.getItem(HOSPITAL_LOG_STORAGE_KEY);
		if (!value) return [];
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) && parsed.every(isHospitalLog) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveHospitalLogs(logs: readonly HospitalLog[]): boolean {
	const storage = getLocalStorage();
	if (!storage || !logs.every(isHospitalLog)) return false;
	try {
		storage.setItem(HOSPITAL_LOG_STORAGE_KEY, JSON.stringify(logs));
		return true;
	} catch {
		return false;
	}
}

export function updateHospitalLog(logs: readonly HospitalLog[], updatedLog: HospitalLog): HospitalLog[] | null {
	if (!logs.some((log) => log.id === updatedLog.id)) return null;
	const nextLogs = logs.map((log) => log.id === updatedLog.id ? updatedLog : log);
	return saveHospitalLogs(nextLogs) ? nextLogs : null;
}

export function deleteHospitalLog(logs: readonly HospitalLog[], id: string): HospitalLog[] | null {
	if (!logs.some((log) => log.id === id)) return null;
	const nextLogs = logs.filter((log) => log.id !== id);
	return saveHospitalLogs(nextLogs) ? nextLogs : null;
}
