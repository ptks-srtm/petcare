import { GROOMING_LOCATIONS, GROOMING_SERVICES, type GroomingLog, type GroomingService } from '../types/grooming.ts';
import { isNonEmptyString, isOptionalCostYen, isOptionalDateValue, isOptionalNonEmptyString, isValidDatetime } from './careLogValidation.ts';

export const GROOMING_LOG_STORAGE_KEY = 'petcare:grooming-logs';

export function normalizeGroomingServices(values: readonly GroomingService[]) {
	return [...new Set(values)];
}

export function isGroomingLog(value: unknown): value is GroomingLog {
	if (!value || typeof value !== 'object') return false;
	const log = value as Record<string, unknown>;
	if (!Array.isArray(log.services) || log.services.length === 0 || new Set(log.services).size !== log.services.length || !log.services.every((service) => typeof service === 'string' && GROOMING_SERVICES.includes(service as GroomingService))) return false;
	if (log.location !== undefined && (typeof log.location !== 'string' || !GROOMING_LOCATIONS.includes(log.location as typeof GROOMING_LOCATIONS[number]))) return false;
	if (log.services.includes('other') && !isNonEmptyString(log.otherService)) return false;
	return isNonEmptyString(log.id) && isValidDatetime(log.datetime) && isOptionalNonEmptyString(log.salonName) && isOptionalNonEmptyString(log.otherService) && isOptionalCostYen(log.costYen) && isOptionalDateValue(log.nextCareDate) && isOptionalNonEmptyString(log.memo);
}

function getStorage(): Storage | null { if (typeof window === 'undefined') return null; try { return window.localStorage; } catch { return null; } }
export function loadGroomingLogs(): GroomingLog[] { const storage = getStorage(); if (!storage) return []; try { const raw = storage.getItem(GROOMING_LOG_STORAGE_KEY); if (!raw) return []; const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) && parsed.every(isGroomingLog) ? parsed : []; } catch { return []; } }
export function saveGroomingLogs(logs: readonly GroomingLog[]) { const storage = getStorage(); if (!storage || !logs.every(isGroomingLog)) return false; try { storage.setItem(GROOMING_LOG_STORAGE_KEY, JSON.stringify(logs)); return true; } catch { return false; } }
export function updateGroomingLog(logs: readonly GroomingLog[], updated: GroomingLog) { if (!isGroomingLog(updated) || !logs.some((log) => log.id === updated.id)) return null; const next = logs.map((log) => log.id === updated.id ? updated : log); return saveGroomingLogs(next) ? next : null; }
export function deleteGroomingLog(logs: readonly GroomingLog[], id: string) { if (!logs.some((log) => log.id === id)) return null; const next = logs.filter((log) => log.id !== id); return saveGroomingLogs(next) ? next : null; }
