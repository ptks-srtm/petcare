import type { PetCareBackup } from '../types/backup';
import { isMealLog, loadMealLogs, MEAL_LOG_STORAGE_KEY } from './mealStorage';
import { isPetProfile, loadPetProfile, PET_PROFILE_STORAGE_KEY } from './profileStorage';
import { isValidPoopLocationOptionList, loadPoopLocationOptions, POOP_LOCATION_OPTIONS_CHANGED_EVENT, POOP_LOCATION_OPTIONS_STORAGE_KEY } from './poopLocationOptions';
import { isPoopLog, loadPoopLogs, POOP_LOG_STORAGE_KEY } from './storage';
import { isWalkLog, loadWalkLogs, WALK_LOG_STORAGE_KEY } from './walkStorage';
import { HOSPITAL_LOG_STORAGE_KEY, isHospitalLog, loadHospitalLogs } from './hospitalStorage';

export const BACKUP_VERSION = '1.1.0';
const LEGACY_BACKUP_VERSIONS = new Set(['0.13.0', '0.14.0', '0.15.0', '1.0.0']);
const HOSPITAL_LOG_BACKUP_VERSIONS = new Set([BACKUP_VERSION]);
const SUPPORTED_BACKUP_VERSIONS = new Set([...LEGACY_BACKUP_VERSIONS, ...HOSPITAL_LOG_BACKUP_VERSIONS]);
export const PETCARE_DATA_CHANGED_EVENT = 'petcare:data-changed';

export const PERSISTED_STORAGE_KEYS = [
	PET_PROFILE_STORAGE_KEY,
	POOP_LOG_STORAGE_KEY,
	MEAL_LOG_STORAGE_KEY,
	WALK_LOG_STORAGE_KEY,
	HOSPITAL_LOG_STORAGE_KEY,
	POOP_LOCATION_OPTIONS_STORAGE_KEY,
] as const;

function getStorage() {
	if (typeof window === 'undefined') return null;
	try { return window.localStorage; } catch { return null; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createPetCareBackup(): PetCareBackup {
	return {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		data: {
			profile: loadPetProfile(),
			poopLogs: loadPoopLogs(),
			mealLogs: loadMealLogs(),
			walkLogs: loadWalkLogs(),
			hospitalLogs: loadHospitalLogs(),
			poopLocationOptions: loadPoopLocationOptions(),
		},
	};
}

export function parsePetCareBackup(input: string): PetCareBackup | null {
	try {
		const parsed: unknown = JSON.parse(input);
		if (!isRecord(parsed) || typeof parsed.version !== 'string' || !SUPPORTED_BACKUP_VERSIONS.has(parsed.version) || typeof parsed.exportedAt !== 'string' || Number.isNaN(Date.parse(parsed.exportedAt)) || !isRecord(parsed.data)) return null;
		const data = parsed.data;
		if (!Object.hasOwn(data, 'profile') || !Object.hasOwn(data, 'poopLogs') || !Object.hasOwn(data, 'mealLogs') || !Object.hasOwn(data, 'walkLogs') || !Object.hasOwn(data, 'poopLocationOptions')) return null;
		if (data.profile !== null && !isPetProfile(data.profile)) return null;
		if (!Array.isArray(data.poopLogs) || !data.poopLogs.every(isPoopLog)) return null;
		if (!Array.isArray(data.mealLogs) || !data.mealLogs.every(isMealLog)) return null;
		if (!Array.isArray(data.walkLogs) || !data.walkLogs.every(isWalkLog)) return null;
		const hasHospitalLogs = Object.hasOwn(data, 'hospitalLogs');
		if (HOSPITAL_LOG_BACKUP_VERSIONS.has(parsed.version) && !hasHospitalLogs) return null;
		const hospitalLogs = hasHospitalLogs ? data.hospitalLogs : [];
		if (!Array.isArray(hospitalLogs) || !hospitalLogs.every(isHospitalLog)) return null;
		if (!isValidPoopLocationOptionList(data.poopLocationOptions)) return null;
		return { ...parsed, data: { ...data, hospitalLogs } } as PetCareBackup;
	} catch {
		return null;
	}
}

export function restorePetCareBackup(backup: PetCareBackup): boolean {
	const storage = getStorage();
	if (!storage) return false;
	const previous = new Map(PERSISTED_STORAGE_KEYS.map((key) => [key, storage.getItem(key)]));
	try {
		if (backup.data.profile) storage.setItem(PET_PROFILE_STORAGE_KEY, JSON.stringify(backup.data.profile));
		else storage.removeItem(PET_PROFILE_STORAGE_KEY);
		storage.setItem(POOP_LOG_STORAGE_KEY, JSON.stringify(backup.data.poopLogs));
		storage.setItem(MEAL_LOG_STORAGE_KEY, JSON.stringify(backup.data.mealLogs));
		storage.setItem(WALK_LOG_STORAGE_KEY, JSON.stringify(backup.data.walkLogs));
		storage.setItem(HOSPITAL_LOG_STORAGE_KEY, JSON.stringify(backup.data.hospitalLogs));
		storage.setItem(POOP_LOCATION_OPTIONS_STORAGE_KEY, JSON.stringify(backup.data.poopLocationOptions));
		window.dispatchEvent(new Event(PETCARE_DATA_CHANGED_EVENT));
		window.dispatchEvent(new Event(POOP_LOCATION_OPTIONS_CHANGED_EVENT));
		window.dispatchEvent(new Event('petcare:logs-changed'));
		return true;
	} catch {
		for (const [key, value] of previous) {
			try {
				if (value === null) storage.removeItem(key);
				else storage.setItem(key, value);
			} catch { /* Keep the best available rollback state. */ }
		}
		return false;
	}
}

export function resetPetCareData(): boolean {
	const storage = getStorage();
	if (!storage) return false;
	try {
		PERSISTED_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
		return true;
	} catch {
		return false;
	}
}
