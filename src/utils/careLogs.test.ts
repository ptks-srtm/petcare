import assert from 'node:assert/strict';
import test from 'node:test';
import type { PetCareBackup } from '../types/backup';
import type { GroomingLog } from '../types/grooming';
import type { MedicationLog } from '../types/medication';
import type { VaccineLog } from '../types/vaccine';
import type { SymptomLog } from '../types/symptom';
import { parsePetCareBackup, restorePetCareBackup } from './dataBackup.ts';
import { getHealthLogKey, combineHealthLogs } from './healthLog.ts';
import { isGroomingLog, normalizeGroomingServices } from './groomingStorage.ts';
import { isMedicationLog } from './medicationStorage.ts';
import { isVaccineLog } from './vaccineStorage.ts';
import { isValidDatetime } from './careLogValidation.ts';

const medication: MedicationLog = { id: 'm1', datetime: '2026-08-01T10:00', medicineName: 'お薬A', startDate: '2026-08-01', endDate: '2026-08-10' };
const vaccine: VaccineLog = { id: 'v1', datetime: '2026-08-01T11:00', vaccineName: '混合ワクチン', costYen: 0, nextVaccinationDate: '2027-08-01' };
const grooming: GroomingLog = { id: 'g1', datetime: '2026-08-01T12:00', services: ['shampoo', 'nailTrim'], location: 'salon', costYen: 5000 };
const symptom: SymptomLog = { id: 's1', datetime: '2026-08-01T13:00', symptoms: ['cough', 'other'], otherSymptom: '足をかばっている', memo: '補足' };

function backup(version = '1.6.0') {
	return { version, exportedAt: '2026-08-01T00:00:00.000Z', data: { profile: null, poopLogs: [], mealLogs: [], walkLogs: [], hospitalLogs: [], weightLogs: [], medicationLogs: [medication], vaccineLogs: [vaccine], groomingLogs: [grooming], symptomLogs: version === '1.9.0' ? [symptom] : [], poopLocationOptions: [], customKeywords: [{ id: 'custom:home', label: '実家', patterns: ['実家'] }] } };
}

test('datetime-local形式の実在日時だけを受理する', () => {
	for (const value of ['2026-02-28T10:00', '2024-02-29T23:59', '2026-12-31T00:00', '2026-01-01T09:05']) {
		assert.equal(isValidDatetime(value), true, value);
	}
	for (const value of ['2026-02-29T10:00', '2026-02-30T10:00', '2025-04-31T09:30', '2026-13-01T10:00', '2026-00-10T10:00', '2026-01-01T24:00', '2026-01-01T10:60', '2026-1-1T10:00', '2026-01-01 10:00', 'invalid', '', null, 20260101]) {
		assert.equal(isValidDatetime(value), false, String(value));
	}
});

test('お薬ログを検証する', () => {
	assert.equal(isMedicationLog(medication), true);
	assert.equal(isMedicationLog({ ...medication, medicineName: '   ' }), false);
	assert.equal(isMedicationLog({ ...medication, startDate: '2026-08-10', endDate: '2026-08-01' }), false);
	assert.equal(isMedicationLog({ ...medication, startDate: '2026-02-30' }), false);
	assert.equal(isMedicationLog({ ...medication, datetime: 'invalid' }), false);
	assert.equal(isMedicationLog({ ...medication, datetime: '2026-02-30T10:00' }), false);
});

test('ワクチンログを検証する', () => {
	assert.equal(isVaccineLog(vaccine), true);
	assert.equal(isVaccineLog({ ...vaccine, vaccineName: '' }), false);
	assert.equal(isVaccineLog({ ...vaccine, costYen: -1 }), false);
	assert.equal(isVaccineLog({ ...vaccine, costYen: 1.5 }), false);
	assert.equal(isVaccineLog({ ...vaccine, nextVaccinationDate: '2026-13-01' }), false);
	assert.equal(isVaccineLog({ ...vaccine, datetime: '2025-04-31T09:30' }), false);
});

test('お手入れログを検証・正規化する', () => {
	assert.equal(isGroomingLog(grooming), true);
	assert.deepEqual(normalizeGroomingServices(['cut', 'cut', 'shampoo']), ['cut', 'shampoo']);
	assert.equal(isGroomingLog({ ...grooming, services: [] }), false);
	assert.equal(isGroomingLog({ ...grooming, services: ['unknown'] }), false);
	assert.equal(isGroomingLog({ ...grooming, services: ['cut', 'cut'] }), false);
	assert.equal(isGroomingLog({ ...grooming, services: ['other'], otherService: '' }), false);
	assert.equal(isGroomingLog({ ...grooming, location: 'clinic' }), false);
	assert.equal(isGroomingLog({ ...grooming, costYen: -1 }), false);
	assert.equal(isGroomingLog({ ...grooming, costYen: 1.2 }), false);
	assert.equal(isGroomingLog({ ...grooming, datetime: '2026-02-29T10:00' }), false);
});

test('旧バックアップは新しい配列を空配列で補完する', () => {
	for (const version of ['0.13.0', '0.14.0', '0.15.0', '1.0.0', '1.1.0', '1.2.0', '1.5.0']) {
		const candidate = backup(version);
		delete (candidate.data as Partial<typeof candidate.data>).customKeywords;
		if (version !== '1.5.0') {
			delete (candidate.data as Partial<typeof candidate.data>).medicationLogs;
			delete (candidate.data as Partial<typeof candidate.data>).vaccineLogs;
			delete (candidate.data as Partial<typeof candidate.data>).groomingLogs;
		}
		if (!['1.1.0', '1.2.0', '1.5.0'].includes(version)) delete (candidate.data as Partial<typeof candidate.data>).hospitalLogs;
		if (!['1.2.0', '1.5.0'].includes(version)) delete (candidate.data as Partial<typeof candidate.data>).weightLogs;
		const parsed = parsePetCareBackup(JSON.stringify(candidate));
		assert.ok(parsed, version);
		assert.deepEqual(parsed.data.customKeywords, []);
		assert.deepEqual(parsed.data.symptomLogs, []);
	}
});

test('1.9.0バックアップはsymptomLogsを必須として厳格に検証する', () => {
	const valid = backup('1.9.0');
	assert.deepEqual(parsePetCareBackup(JSON.stringify(valid))?.data.symptomLogs, [symptom]);
	const missing = backup('1.9.0'); delete (missing.data as Partial<typeof missing.data>).symptomLogs;
	assert.equal(parsePetCareBackup(JSON.stringify(missing)), null);
	const nonArray = backup('1.9.0'); (nonArray.data as Record<string, unknown>).symptomLogs = {};
	assert.equal(parsePetCareBackup(JSON.stringify(nonArray)), null);
	const invalid = backup('1.9.0'); invalid.data.symptomLogs = [{ ...symptom, symptoms: [] }];
	assert.equal(parsePetCareBackup(JSON.stringify(invalid)), null);
});

test('1.6.0バックアップは全追加配列を厳格に検証する', () => {
	assert.ok(parsePetCareBackup(JSON.stringify(backup())));
	for (const key of ['medicationLogs', 'vaccineLogs', 'groomingLogs', 'customKeywords'] as const) {
		const missing = backup(); delete (missing.data as Partial<typeof missing.data>)[key];
		assert.equal(parsePetCareBackup(JSON.stringify(missing)), null);
		const nonArray = backup(); (nonArray.data as Record<string, unknown>)[key] = {};
		assert.equal(parsePetCareBackup(JSON.stringify(nonArray)), null);
	}
	const invalid = backup(); invalid.data.groomingLogs = [{ ...grooming, services: [] }];
	assert.equal(parsePetCareBackup(JSON.stringify(invalid)), null);
	const invalidDatetime = backup(); invalidDatetime.data.medicationLogs = [{ ...medication, datetime: '2026-02-30T10:00' }];
	assert.equal(parsePetCareBackup(JSON.stringify(invalidDatetime)), null);
	const invalidKeyword = backup(); invalidKeyword.data.customKeywords = [{ id: 'custom:bad', label: '   ', patterns: ['   '] }];
	assert.equal(parsePetCareBackup(JSON.stringify(invalidKeyword)), null);
});

test('1.6.0バックアップのcustomKeywords不正条件を個別に拒否する', () => {
	const makeKeyword = (index: number) => ({ id: `custom:${index}`, label: `語${index}`, patterns: [`語${index}`] });
	const cases: Array<[string, unknown]> = [
		['31件', Array.from({ length: 31 }, (_, index) => makeKeyword(index))],
		['空label', [{ id: 'custom:empty', label: '', patterns: [''] }]],
		['21文字label', [{ id: 'custom:long', label: 'あ'.repeat(21), patterns: ['あ'.repeat(21)] }]],
		['patterns非配列', [{ id: 'custom:patterns', label: '実家', patterns: '実家' }]],
		['patterns不一致', [{ id: 'custom:patterns', label: '実家', patterns: ['帰省先'] }]],
		['prefixなし', [{ id: 'home', label: '実家', patterns: ['実家'] }]],
		['ID重複', [makeKeyword(0), { ...makeKeyword(1), id: 'custom:0' }]],
		['標準語重複', [{ id: 'custom:rain', label: '雨', patterns: ['雨'] }]],
		['カスタム語重複', [makeKeyword(0), { ...makeKeyword(1), label: '語0', patterns: ['語0'] }]],
		['NFKC重複', [
			{ id: 'custom:wide', label: 'ＡＢＣ', patterns: ['ＡＢＣ'] },
			{ id: 'custom:narrow', label: 'ABC', patterns: ['ABC'] },
		]],
		['大文字小文字重複', [
			{ id: 'custom:upper', label: 'ABC', patterns: ['ABC'] },
			{ id: 'custom:lower', label: 'abc', patterns: ['abc'] },
		]],
	];
	for (const [name, customKeywords] of cases) {
		const candidate = backup();
		(candidate.data as Record<string, unknown>).customKeywords = customKeywords;
		assert.equal(parsePetCareBackup(JSON.stringify(candidate)), null, name);
	}
});

test('正常な1.6.0バックアップはcustomKeywords空配列と複数件を受理する', () => {
	const empty = backup();
	empty.data.customKeywords = [];
	assert.deepEqual(parsePetCareBackup(JSON.stringify(empty))?.data.customKeywords, []);
	const multiple = backup();
	multiple.data.customKeywords = [
		{ id: 'custom:home', label: '実家', patterns: ['実家'] },
		{ id: 'custom:trip', label: '旅行前', patterns: ['旅行前'] },
	];
	assert.deepEqual(parsePetCareBackup(JSON.stringify(multiple))?.data.customKeywords, multiple.data.customKeywords);
});

test('不正日時のバックアップ拒否時はlocalStorageへ書き込まない', () => {
	let writes = 0;
	const storage = { length: 0, clear() {}, key() { return null; }, getItem() { return 'existing'; }, removeItem() { writes += 1; }, setItem() { writes += 1; } } satisfies Storage;
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent() { return true; } } });
	const invalid = backup(); invalid.data.vaccineLogs = [{ ...vaccine, datetime: '2025-04-31T09:30' }];
	const parsed = parsePetCareBackup(JSON.stringify(invalid));
	assert.equal(parsed, null);
	assert.equal(writes, 0);
	delete (globalThis as { window?: unknown }).window;
});

test('不正なcustomKeywordsは復元前に拒否し既存localStorageへ書き込まない', () => {
	const initial = new Map<string, string>([
		['petcare:profile', '{"name":"既存"}'],
		['petcare:poop-logs', '[{"existing":true}]'],
		['petcare:meal-logs', '[{"existing":true}]'],
		['petcare:custom-keywords', '[{"id":"custom:old","label":"実家","patterns":["実家"]}]'],
	]);
	const values = new Map(initial);
	let writes = 0;
	const storage = {
		get length() { return values.size; },
		clear() { writes += 1; values.clear(); },
		key(index: number) { return [...values.keys()][index] ?? null; },
		getItem(key: string) { return values.get(key) ?? null; },
		removeItem(key: string) { writes += 1; values.delete(key); },
		setItem(key: string, value: string) { writes += 1; values.set(key, value); },
	} satisfies Storage;
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent() { return true; } } });
	const invalid = backup();
	invalid.data.customKeywords = [{ id: 'custom:bad', label: '実家', patterns: ['別名'] }];
	const parsed = parsePetCareBackup(JSON.stringify(invalid));
	assert.equal(parsed, null);
	assert.equal(writes, 0);
	assert.deepEqual(values, initial);
	delete (globalThis as { window?: unknown }).window;
});

test('新3種類を日時順・kind付きで統合する', () => {
	const logs = combineHealthLogs([], [], [], [], [], [medication], [vaccine], [grooming]);
	assert.deepEqual(logs.map((entry) => entry.kind), ['grooming', 'vaccine', 'medication']);
	assert.notEqual(getHealthLogKey({ kind: 'medication', id: 'same' }), getHealthLogKey({ kind: 'vaccine', id: 'same' }));
});

test('気になる体調を末尾入力のまま共通timelineへ統合し元配列を変更しない', () => {
	const symptomLogs = [symptom];
	const before = structuredClone(symptomLogs);
	const logs = combineHealthLogs([], [], [], [], [], [medication], [vaccine], [grooming], symptomLogs);
	assert.deepEqual(logs.map((entry) => entry.kind), ['symptom', 'grooming', 'vaccine', 'medication']);
	assert.deepEqual(symptomLogs, before);
	assert.notEqual(getHealthLogKey({ kind: 'symptom', id: 'same' }), getHealthLogKey({ kind: 'grooming', id: 'same' }));
});

test('復元途中の失敗では症状ログと既存の保存値をロールバックする', () => {
	const values = new Map<string, string>([['petcare:medication-logs', '[{"old":true}]'], ['petcare:vaccine-logs', '[{"old":true}]'], ['petcare:grooming-logs', '[{"old":true}]'], ['petcare:symptom-logs', '[{"old":true}]'], ['petcare:custom-keywords', '[{"id":"custom:old","label":"以前","patterns":["以前"]}]']]);
	let shouldFail = true;
	const setCalls: string[] = [];
	const storage = { get length() { return values.size; }, clear() { values.clear(); }, key() { return null; }, getItem(key: string) { return values.get(key) ?? null; }, removeItem(key: string) { values.delete(key); }, setItem(key: string, value: string) { setCalls.push(key); if (shouldFail && key === 'petcare:poop-location-options') { shouldFail = false; throw new Error('quota'); } values.set(key, value); } } satisfies Storage;
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent() { return true; } } });
	assert.equal(restorePetCareBackup(backup('1.9.0') as PetCareBackup), false);
	assert.ok(setCalls.indexOf('petcare:symptom-logs') >= 0);
	assert.ok(setCalls.indexOf('petcare:symptom-logs') < setCalls.indexOf('petcare:poop-location-options'));
	assert.equal(values.get('petcare:medication-logs'), '[{"old":true}]');
	assert.equal(values.get('petcare:vaccine-logs'), '[{"old":true}]');
	assert.equal(values.get('petcare:grooming-logs'), '[{"old":true}]');
	assert.equal(values.get('petcare:symptom-logs'), '[{"old":true}]');
	assert.notEqual(values.get('petcare:symptom-logs'), JSON.stringify([symptom]));
	assert.equal(values.get('petcare:custom-keywords'), '[{"id":"custom:old","label":"以前","patterns":["以前"]}]');
	delete (globalThis as { window?: unknown }).window;
});
