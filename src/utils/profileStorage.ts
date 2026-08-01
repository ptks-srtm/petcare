import type { PetProfile } from '../types/profile';
import { isProfileDefaultIconId } from './profileDefaultIcons.ts';

export const PET_PROFILE_STORAGE_KEY = 'petcare:pet-profile';

const speciesValues = new Set<PetProfile['species']>(['dog', 'cat']);
const sexValues = new Set<PetProfile['sex']>(['male', 'female']);

function getTodayValue() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function isPetProfile(value: unknown): value is PetProfile {
	if (!value || typeof value !== 'object') return false;

	const profile = value as Record<string, unknown>;
	return (
		typeof profile.id === 'string' &&
		profile.id.length > 0 &&
		typeof profile.name === 'string' &&
		profile.name.trim().length > 0 &&
		typeof profile.species === 'string' &&
		speciesValues.has(profile.species as PetProfile['species']) &&
		typeof profile.breed === 'string' &&
		profile.breed.trim().length > 0 &&
		typeof profile.sex === 'string' &&
		sexValues.has(profile.sex as PetProfile['sex']) &&
		typeof profile.birthday === 'string' &&
		/^\d{4}-\d{2}-\d{2}$/.test(profile.birthday) &&
		!Number.isNaN(Date.parse(`${profile.birthday}T00:00:00`)) &&
		profile.birthday <= getTodayValue() &&
		(profile.photo === undefined || typeof profile.photo === 'string')
		&& (profile.defaultIconId === undefined || isProfileDefaultIconId(profile.defaultIconId))
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

export function loadPetProfile(): PetProfile | null {
	const storage = getLocalStorage();
	if (!storage) return null;

	try {
		const value = storage.getItem(PET_PROFILE_STORAGE_KEY);
		if (!value) return null;

		const parsed: unknown = JSON.parse(value);
		return isPetProfile(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function savePetProfile(profile: PetProfile): boolean {
	const storage = getLocalStorage();
	if (!storage || !isPetProfile(profile)) return false;

	try {
		storage.setItem(PET_PROFILE_STORAGE_KEY, JSON.stringify(profile));
		return true;
	} catch {
		return false;
	}
}
