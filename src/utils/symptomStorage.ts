import { SYMPTOM_TYPES, type SymptomLog, type SymptomType } from '../types/symptom.ts';
import { isNonEmptyString, isOptionalNonEmptyString, isValidDatetime } from './careLogValidation.ts';

export const SYMPTOM_LOG_STORAGE_KEY = 'petcare:symptom-logs';

export function isSymptomLog(value: unknown): value is SymptomLog {
	if (!value || typeof value !== 'object') return false;
	const log = value as Record<string, unknown>;
	if (!Array.isArray(log.symptoms) || log.symptoms.length === 0 || new Set(log.symptoms).size !== log.symptoms.length) return false;
	if (!log.symptoms.every((symptom) => typeof symptom === 'string' && SYMPTOM_TYPES.includes(symptom as SymptomType))) return false;
	if (log.symptoms.includes('other')) {
		if (!isNonEmptyString(log.otherSymptom)) return false;
	} else if (log.otherSymptom !== undefined) {
		return false;
	}
	return isNonEmptyString(log.id) && isValidDatetime(log.datetime) && isOptionalNonEmptyString(log.memo);
}

function getStorage(): Storage | null {
	if (typeof window === 'undefined') return null;
	try { return window.localStorage; } catch { return null; }
}

export function loadSymptomLogs(): SymptomLog[] {
	const storage = getStorage();
	if (!storage) return [];
	try {
		const raw = storage.getItem(SYMPTOM_LOG_STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) && parsed.every(isSymptomLog) ? parsed : [];
	} catch { return []; }
}

export function saveSymptomLogs(logs: readonly SymptomLog[]) {
	const storage = getStorage();
	if (!storage || !logs.every(isSymptomLog)) return false;
	try { storage.setItem(SYMPTOM_LOG_STORAGE_KEY, JSON.stringify(logs)); return true; } catch { return false; }
}

export function addSymptomLog(logs: readonly SymptomLog[], added: SymptomLog) {
	if (!isSymptomLog(added) || logs.some((log) => log.id === added.id)) return null;
	const next = [added, ...logs];
	return saveSymptomLogs(next) ? next : null;
}

export function updateSymptomLog(logs: readonly SymptomLog[], updated: SymptomLog) {
	if (!isSymptomLog(updated) || !logs.some((log) => log.id === updated.id)) return null;
	const next = logs.map((log) => log.id === updated.id ? updated : log);
	return saveSymptomLogs(next) ? next : null;
}

export function deleteSymptomLog(logs: readonly SymptomLog[], id: string) {
	if (!logs.some((log) => log.id === id)) return null;
	const next = logs.filter((log) => log.id !== id);
	return saveSymptomLogs(next) ? next : null;
}
