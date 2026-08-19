import assert from 'node:assert/strict';
import test from 'node:test';
import type { SymptomLog } from '../types/symptom.ts';
import { getSymptomDisplayLabels } from '../types/symptom.ts';
import { addSymptomLog, deleteSymptomLog, isSymptomLog, loadSymptomLogs, saveSymptomLogs, SYMPTOM_LOG_STORAGE_KEY, updateSymptomLog } from './symptomStorage.ts';
import { parsePetCareBackup, resetPetCareData, restorePetCareBackup } from './dataBackup.ts';

const single: SymptomLog = { id: 's1', datetime: '2026-08-18T21:00', symptoms: ['vomiting'], memo: '夕方のさんぽ後' };
const multiple: SymptomLog = { id: 's2', datetime: '2026-08-18T22:00', symptoms: ['vomiting', 'lowEnergy', 'other'], otherSymptom: '足をかばっている' };

function installStorage(options: { failWrite?: boolean } = {}) {
	const values = new Map<string, string>();
	const storage = {
		get length() { return values.size; }, clear() { values.clear(); }, key(index: number) { return [...values.keys()][index] ?? null; },
		getItem(key: string) { return values.get(key) ?? null; }, removeItem(key: string) { values.delete(key); },
		setItem(key: string, value: string) { if (options.failWrite) throw new Error('write'); values.set(key, value); },
	} satisfies Storage;
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent() { return true; } } });
	return values;
}

function cleanup() { delete (globalThis as { window?: unknown }).window; }

test('単一・複数の気になる体調ログを検証する', () => {
	assert.equal(isSymptomLog(single), true);
	assert.equal(isSymptomLog(multiple), true);
	assert.deepEqual(getSymptomDisplayLabels(multiple), ['吐いた', '元気がない（いつもより）', 'その他：足をかばっている']);
});

test('症状配列・日時・その他の不正値を拒否する', () => {
	for (const invalid of [
		{ ...single, symptoms: [] },
		{ ...single, symptoms: ['unknown'] },
		{ ...single, symptoms: ['vomiting', 'vomiting'] },
		{ ...single, datetime: '2026-02-30T10:00' },
		{ ...single, symptoms: ['other'], otherSymptom: undefined },
		{ ...single, symptoms: ['other'], otherSymptom: '   ' },
		{ ...single, otherSymptom: '不要' },
	]) assert.equal(isSymptomLog(invalid), false);
});

test('空配列・memo・その他を保存して読み込める', () => {
	installStorage();
	assert.equal(saveSymptomLogs([]), true);
	assert.deepEqual(loadSymptomLogs(), []);
	assert.equal(saveSymptomLogs([single, multiple]), true);
	assert.deepEqual(loadSymptomLogs(), [single, multiple]);
	cleanup();
});

test('不正JSON・非配列・不正record混入は全体を空配列にする', () => {
	const values = installStorage();
	for (const raw of ['{broken', '{}', JSON.stringify([single, { ...multiple, symptoms: [] }])]) {
		values.set(SYMPTOM_LOG_STORAGE_KEY, raw);
		assert.deepEqual(loadSymptomLogs(), []);
	}
	cleanup();
});

test('追加・更新・削除し更新時のIDを維持する', () => {
	installStorage();
	assert.deepEqual(addSymptomLog([], single), [single]);
	const updated = { ...single, symptoms: ['cough'] as SymptomLog['symptoms'] };
	assert.deepEqual(updateSymptomLog([single], updated), [updated]);
	assert.equal(updateSymptomLog([single], { ...updated, id: 'missing' }), null);
	assert.deepEqual(deleteSymptomLog([updated, multiple], updated.id), [multiple]);
	cleanup();
});

test('保存失敗はfalseまたはnullを返して例外を出さない', () => {
	installStorage({ failWrite: true });
	assert.equal(saveSymptomLogs([single]), false);
	assert.equal(addSymptomLog([], single), null);
	assert.equal(updateSymptomLog([single], { ...single, memo: '更新' }), null);
	assert.equal(deleteSymptomLog([single], single.id), null);
	cleanup();
});

test('1.9.0バックアップから全フィールドを復元できる', () => {
	installStorage();
	const parsed = parsePetCareBackup(JSON.stringify({
		version: '1.9.0', exportedAt: '2026-08-18T00:00:00.000Z', data: {
			profile: null, poopLogs: [], mealLogs: [], walkLogs: [], hospitalLogs: [], weightLogs: [], medicationLogs: [], vaccineLogs: [], groomingLogs: [], symptomLogs: [multiple], poopLocationOptions: [], customKeywords: [],
		},
	}));
	assert.ok(parsed);
	assert.equal(restorePetCareBackup(parsed), true);
	assert.deepEqual(loadSymptomLogs(), [multiple]);
	cleanup();
});

test('全データ削除で症状ログキーを削除して空配列へ戻す', () => {
	const values = installStorage();
	assert.equal(saveSymptomLogs([single]), true);
	assert.equal(resetPetCareData(), true);
	assert.equal(values.has(SYMPTOM_LOG_STORAGE_KEY), false);
	assert.deepEqual(loadSymptomLogs(), []);
	cleanup();
});
