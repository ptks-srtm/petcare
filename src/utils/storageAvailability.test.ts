import assert from 'node:assert/strict';
import test from 'node:test';
import { isFirstUse } from './firstUse.ts';
import { checkStorageAvailability, STORAGE_CHECK_KEY } from './storageAvailability.ts';

function createStorage() {
	const values = new Map<string, string>();
	const storage = {
		get length() { return values.size; },
		clear() { values.clear(); },
		key(index: number) { return [...values.keys()][index] ?? null; },
		getItem(key: string) { return values.get(key) ?? null; },
		removeItem(key: string) { values.delete(key); },
		setItem(key: string, value: string) { values.set(key, value); },
	} satisfies Storage;
	return { storage, values };
}

function emptyLogs() {
	return { poopLogs: [], mealLogs: [], walkLogs: [], weightLogs: [], hospitalLogs: [], medicationLogs: [], vaccineLogs: [], groomingLogs: [] };
}

test('localStorageを読み書きでき、診断用キーを残さない', () => {
	const { storage, values } = createStorage();
	assert.deepEqual(checkStorageAvailability(storage), { status: 'available' });
	assert.equal(values.has(STORAGE_CHECK_KEY), false);
});

test('storageへアクセスできない場合はaccessとして扱う', () => {
	assert.deepEqual(checkStorageAvailability(null), { status: 'unavailable', reason: 'access' });
	Object.defineProperty(globalThis, 'window', { configurable: true, value: Object.defineProperty({}, 'localStorage', { get() { throw new Error('blocked'); } }) });
	assert.deepEqual(checkStorageAvailability(), { status: 'unavailable', reason: 'access' });
	delete (globalThis as { window?: unknown }).window;
});

test('setItemとgetItemの例外をwriteとして扱い、可能な範囲でcleanupする', () => {
	const setFailure = createStorage();
	setFailure.storage.setItem = () => { throw new Error('blocked'); };
	assert.deepEqual(checkStorageAvailability(setFailure.storage), { status: 'unavailable', reason: 'write' });
	assert.equal(setFailure.values.has(STORAGE_CHECK_KEY), false);

	const getFailure = createStorage();
	getFailure.storage.getItem = () => { throw new Error('blocked'); };
	assert.deepEqual(checkStorageAvailability(getFailure.storage), { status: 'unavailable', reason: 'write' });
	assert.equal(getFailure.values.has(STORAGE_CHECK_KEY), false);
});

test('removeItemが失敗した場合は例外を投げずwrite unavailableとして扱う', () => {
	const { storage, values } = createStorage();
	storage.removeItem = () => { throw new Error('blocked'); };
	let result: ReturnType<typeof checkStorageAvailability> | undefined;
	assert.doesNotThrow(() => { result = checkStorageAvailability(storage); });
	assert.deepEqual(result, { status: 'unavailable', reason: 'write' });
	assert.equal(values.has(STORAGE_CHECK_KEY), true);
});

test('全8ログが0件ならプロフィール有無にかかわらず初回状態になる', () => {
	assert.equal(isFirstUse({ ...emptyLogs(), profile: null }), true);
	assert.equal(isFirstUse({ ...emptyLogs(), profile: { id: 'pet' } }), true);
});

test('毎日・ケアのいずれか1ログでもあれば初回状態ではない', () => {
	for (const key of Object.keys(emptyLogs()) as Array<keyof ReturnType<typeof emptyLogs>>) {
		assert.equal(isFirstUse({ ...emptyLogs(), [key]: [{}] }), false, key);
	}
});
