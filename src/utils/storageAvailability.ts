export const STORAGE_CHECK_KEY = 'petcare:storage-check';

export type StorageAvailabilityStatus =
	| { status: 'available' }
	| { status: 'unavailable'; reason: 'access' | 'write' };

function getBrowserStorage(): Storage | null {
	if (typeof window === 'undefined') return null;
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export function checkStorageAvailability(storage: Storage | null = getBrowserStorage()): StorageAvailabilityStatus {
	if (!storage) return { status: 'unavailable', reason: 'access' };

	try {
		storage.setItem(STORAGE_CHECK_KEY, '1');
		if (storage.getItem(STORAGE_CHECK_KEY) !== '1') {
			try { storage.removeItem(STORAGE_CHECK_KEY); } catch { /* Cleanup is best-effort after a failed check. */ }
			return { status: 'unavailable', reason: 'write' };
		}
	} catch {
		try { storage.removeItem(STORAGE_CHECK_KEY); } catch { /* Cleanup is best-effort after a failed check. */ }
		return { status: 'unavailable', reason: 'write' };
	}

	try {
		storage.removeItem(STORAGE_CHECK_KEY);
	} catch {
		return { status: 'unavailable', reason: 'write' };
	}

	return { status: 'available' };
}
