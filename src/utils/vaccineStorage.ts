import type { VaccineLog } from '../types/vaccine';
import { isNonEmptyString, isOptionalCostYen, isOptionalDateValue, isOptionalNonEmptyString, isValidDatetime } from './careLogValidation.ts';

export const VACCINE_LOG_STORAGE_KEY = 'petcare:vaccine-logs';

export function isVaccineLog(value: unknown): value is VaccineLog {
	if (!value || typeof value !== 'object') return false;
	const log = value as Record<string, unknown>;
	return isNonEmptyString(log.id) && isValidDatetime(log.datetime) && isNonEmptyString(log.vaccineName) && isOptionalNonEmptyString(log.hospitalName) && isOptionalDateValue(log.nextVaccinationDate) && isOptionalCostYen(log.costYen) && isOptionalNonEmptyString(log.memo);
}

function getStorage(): Storage | null { if (typeof window === 'undefined') return null; try { return window.localStorage; } catch { return null; } }
export function loadVaccineLogs(): VaccineLog[] { const storage = getStorage(); if (!storage) return []; try { const raw = storage.getItem(VACCINE_LOG_STORAGE_KEY); if (!raw) return []; const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) && parsed.every(isVaccineLog) ? parsed : []; } catch { return []; } }
export function saveVaccineLogs(logs: readonly VaccineLog[]) { const storage = getStorage(); if (!storage || !logs.every(isVaccineLog)) return false; try { storage.setItem(VACCINE_LOG_STORAGE_KEY, JSON.stringify(logs)); return true; } catch { return false; } }
export function updateVaccineLog(logs: readonly VaccineLog[], updated: VaccineLog) { if (!isVaccineLog(updated) || !logs.some((log) => log.id === updated.id)) return null; const next = logs.map((log) => log.id === updated.id ? updated : log); return saveVaccineLogs(next) ? next : null; }
export function deleteVaccineLog(logs: readonly VaccineLog[], id: string) { if (!logs.some((log) => log.id === id)) return null; const next = logs.filter((log) => log.id !== id); return saveVaccineLogs(next) ? next : null; }
