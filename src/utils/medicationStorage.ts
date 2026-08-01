import type { MedicationLog } from '../types/medication';
import { isNonEmptyString, isOptionalDateValue, isOptionalNonEmptyString, isValidDatetime } from './careLogValidation.ts';

export const MEDICATION_LOG_STORAGE_KEY = 'petcare:medication-logs';

export function isMedicationLog(value: unknown): value is MedicationLog {
	if (!value || typeof value !== 'object') return false;
	const log = value as Record<string, unknown>;
	if (!(isNonEmptyString(log.id) && isValidDatetime(log.datetime) && isNonEmptyString(log.medicineName) && isOptionalNonEmptyString(log.dosage) && isOptionalNonEmptyString(log.frequency) && isOptionalDateValue(log.startDate) && isOptionalDateValue(log.endDate) && isOptionalNonEmptyString(log.hospitalName) && isOptionalNonEmptyString(log.memo))) return false;
	return !(typeof log.startDate === 'string' && typeof log.endDate === 'string' && log.endDate < log.startDate);
}

function getStorage(): Storage | null { if (typeof window === 'undefined') return null; try { return window.localStorage; } catch { return null; } }
export function loadMedicationLogs(): MedicationLog[] { const storage = getStorage(); if (!storage) return []; try { const raw = storage.getItem(MEDICATION_LOG_STORAGE_KEY); if (!raw) return []; const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) && parsed.every(isMedicationLog) ? parsed : []; } catch { return []; } }
export function saveMedicationLogs(logs: readonly MedicationLog[]) { const storage = getStorage(); if (!storage || !logs.every(isMedicationLog)) return false; try { storage.setItem(MEDICATION_LOG_STORAGE_KEY, JSON.stringify(logs)); return true; } catch { return false; } }
export function updateMedicationLog(logs: readonly MedicationLog[], updated: MedicationLog) { if (!isMedicationLog(updated) || !logs.some((log) => log.id === updated.id)) return null; const next = logs.map((log) => log.id === updated.id ? updated : log); return saveMedicationLogs(next) ? next : null; }
export function deleteMedicationLog(logs: readonly MedicationLog[], id: string) { if (!logs.some((log) => log.id === id)) return null; const next = logs.filter((log) => log.id !== id); return saveMedicationLogs(next) ? next : null; }
