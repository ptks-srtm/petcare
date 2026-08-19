import assert from 'node:assert/strict';
import test from 'node:test';
import { AnalysisQuestion, type AnalysisData } from '../types/analysis.ts';
import { analysisEngine } from './analysisEngine.ts';
import { createPetCareBackup, parsePetCareBackup, PERSISTED_STORAGE_KEYS, resetPetCareData, restorePetCareBackup } from './dataBackup.ts';
import {
	addCustomMemoKeyword,
	CUSTOM_MEMO_KEYWORDS_MAX_COUNT,
	CUSTOM_MEMO_KEYWORDS_STORAGE_KEY,
	deleteCustomMemoKeyword,
	getAllMemoKeywords,
	getMemoKeyword,
	loadCustomMemoKeywords,
	saveCustomMemoKeywords,
	updateCustomMemoKeyword,
} from './memoKeywords.ts';

function installStorage() {
	const values = new Map<string, string>();
	const storage = {
		get length() { return values.size; },
		clear() { values.clear(); },
		key(index: number) { return [...values.keys()][index] ?? null; },
		getItem(key: string) { return values.get(key) ?? null; },
		removeItem(key: string) { values.delete(key); },
		setItem(key: string, value: string) { values.set(key, value); },
	} satisfies Storage;
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent() { return true; } } });
	return { storage, values };
}

function cleanupStorage() {
	delete (globalThis as { window?: unknown }).window;
}

function emptyData(overrides: Partial<AnalysisData> = {}): AnalysisData {
	return { poopLogs: [], mealLogs: [], walkLogs: [], weightLogs: [], hospitalLogs: [], medicationLogs: [], vaccineLogs: [], groomingLogs: [], ...overrides };
}

function customKeyword(index: number) {
	return { id: `custom:${index}`, label: `語${index}`, patterns: [`語${index}`] };
}

function validBackup(customKeywords: unknown = []) {
	return {
		version: '1.6.0',
		exportedAt: '2026-08-09T00:00:00.000Z',
		data: {
			profile: null, poopLogs: [], mealLogs: [], walkLogs: [], hospitalLogs: [], weightLogs: [],
			medicationLogs: [], vaccineLogs: [], groomingLogs: [], poopLocationOptions: [], customKeywords,
		},
	};
}

test('カスタム注目語を空配列で保存・読込できる', () => {
	const { values } = installStorage();
	assert.equal(saveCustomMemoKeywords([]), true);
	assert.equal(values.get(CUSTOM_MEMO_KEYWORDS_STORAGE_KEY), '[]');
	assert.deepEqual(loadCustomMemoKeywords(), []);
	cleanupStorage();
});

test('カスタム注目語を追加・更新・削除する', () => {
	installStorage();
	const added = addCustomMemoKeyword('  実家  ');
	assert.equal(added.ok, true);
	if (!added.ok) return;
	assert.equal(added.keywords[0].label, '実家');
	assert.deepEqual(added.keywords[0].patterns, ['実家']);
	const id = added.keywords[0].id;
	const updated = updateCustomMemoKeyword(id, ' 帰省先 ');
	assert.equal(updated.ok, true);
	if (!updated.ok) return;
	assert.equal(updated.keywords[0].label, '帰省先');
	assert.deepEqual(updated.keywords[0].patterns, ['帰省先']);
	const deleted = deleteCustomMemoKeyword(id);
	assert.equal(deleted.ok, true);
	if (deleted.ok) assert.deepEqual(deleted.keywords, []);
	cleanupStorage();
});

test('labelは20 UTF-16 code unitsを許可し21を拒否する', () => {
	installStorage();
	const accepted = addCustomMemoKeyword('あ'.repeat(20));
	assert.equal(accepted.ok, true);
	assert.equal(loadCustomMemoKeywords()[0].label.length, 20);
	assert.equal(addCustomMemoKeyword('い'.repeat(21)).ok, false);
	assert.equal(loadCustomMemoKeywords().length, 1);
	cleanupStorage();
});

test('空文字・標準語重複・NFKC小文字化後の重複を拒否する', () => {
	installStorage();
	assert.equal(addCustomMemoKeyword('   ').ok, false);
	assert.equal(addCustomMemoKeyword('雨').ok, false);
	assert.equal(addCustomMemoKeyword('ＡＢＣ').ok, true);
	assert.equal(addCustomMemoKeyword('abc').ok, false);
	cleanupStorage();
});

test('29件から30件目を追加できる', () => {
	installStorage();
	assert.equal(saveCustomMemoKeywords(Array.from({ length: 29 }, (_, index) => customKeyword(index))), true);
	const result = addCustomMemoKeyword('30件目');
	assert.equal(result.ok, true);
	assert.equal(loadCustomMemoKeywords().length, 30);
	cleanupStorage();
});

test('30件から31件目を拒否し既存30件を維持する', () => {
	installStorage();
	const keywords = Array.from({ length: CUSTOM_MEMO_KEYWORDS_MAX_COUNT }, (_, index) => customKeyword(index));
	assert.equal(saveCustomMemoKeywords(keywords), true);
	const result = addCustomMemoKeyword('追加分');
	assert.equal(result.ok, false);
	if (!result.ok) assert.match(result.error, /30件/);
	assert.deepEqual(loadCustomMemoKeywords(), keywords);
	cleanupStorage();
});

test('30件時もIDを維持して編集できpatternsを新labelへ同期する', () => {
	installStorage();
	const keywords = Array.from({ length: 30 }, (_, index) => customKeyword(index));
	assert.equal(saveCustomMemoKeywords(keywords), true);
	const result = updateCustomMemoKeyword('custom:0', '更新した語');
	assert.equal(result.ok, true);
	assert.equal(loadCustomMemoKeywords().length, 30);
	assert.deepEqual(loadCustomMemoKeywords()[0], { id: 'custom:0', label: '更新した語', patterns: ['更新した語'] });
	cleanupStorage();
});

test('30件から削除後に再追加して30件へ戻せる', () => {
	installStorage();
	assert.equal(saveCustomMemoKeywords(Array.from({ length: 30 }, (_, index) => customKeyword(index))), true);
	assert.equal(deleteCustomMemoKeyword('custom:0').ok, true);
	assert.equal(loadCustomMemoKeywords().length, 29);
	assert.equal(addCustomMemoKeyword('再追加').ok, true);
	assert.equal(loadCustomMemoKeywords().length, 30);
	cleanupStorage();
});

test('編集時は自分自身を除外しtrim後同一labelも保存できる', () => {
	installStorage();
	assert.equal(saveCustomMemoKeywords([{ id: 'custom:home', label: '実家', patterns: ['実家'] }]), true);
	assert.equal(updateCustomMemoKeyword('custom:home', '実家').ok, true);
	assert.equal(updateCustomMemoKeyword('custom:home', '  実家  ').ok, true);
	assert.deepEqual(loadCustomMemoKeywords(), [{ id: 'custom:home', label: '実家', patterns: ['実家'] }]);
	cleanupStorage();
});

test('別カスタム語・標準語・正規化後の重複への編集を拒否し元データを維持する', () => {
	installStorage();
	const original = [
		{ id: 'custom:home', label: '実家', patterns: ['実家'] },
		{ id: 'custom:trip', label: '旅行前', patterns: ['旅行前'] },
		{ id: 'custom:ascii', label: 'ＡＢＣ', patterns: ['ＡＢＣ'] },
	];
	assert.equal(saveCustomMemoKeywords(original), true);
	for (const label of ['旅行前', '雨', 'abc', 'ABC']) {
		assert.equal(updateCustomMemoKeyword('custom:home', label).ok, false, label);
		assert.deepEqual(loadCustomMemoKeywords(), original, label);
	}
	cleanupStorage();
});

test('不正JSONと不正recordは例外なく全体を空配列として扱う', () => {
	const { values } = installStorage();
	values.set(CUSTOM_MEMO_KEYWORDS_STORAGE_KEY, '{broken');
	assert.doesNotThrow(() => loadCustomMemoKeywords());
	assert.deepEqual(loadCustomMemoKeywords(), []);
	const invalidRecords = [
		[{ label: '実家', patterns: ['実家'] }],
		[{ id: 'home', label: '実家', patterns: ['実家'] }],
		[{ id: 'custom:home', label: '', patterns: [''] }],
		[{ id: 'custom:home', label: 'あ'.repeat(21), patterns: ['あ'.repeat(21)] }],
		[{ id: 'custom:home', label: '実家', patterns: '実家' }],
		[{ id: 'custom:home', label: '実家', patterns: ['帰省先'] }],
		[customKeyword(0), { ...customKeyword(1), id: 'custom:0' }],
		[customKeyword(0), { ...customKeyword(1), label: '語0', patterns: ['語0'] }],
	];
	for (const value of invalidRecords) {
		values.set(CUSTOM_MEMO_KEYWORDS_STORAGE_KEY, JSON.stringify(value));
		assert.deepEqual(loadCustomMemoKeywords(), []);
	}
	cleanupStorage();
});

test('全注目語は標準20語の後ろへカスタム語を追加する', () => {
	installStorage();
	assert.equal(saveCustomMemoKeywords([{ id: 'custom:home', label: '実家', patterns: ['実家'] }]), true);
	const all = getAllMemoKeywords();
	assert.equal(all.length, 21);
	assert.equal(all[19].label, '薬');
	assert.equal(all[20].label, '実家');
	cleanupStorage();
});

test('カスタム語はSprint2とSprint4の分析へ自動反映される', () => {
	installStorage();
	assert.equal(saveCustomMemoKeywords([{ id: 'custom:home', label: '実家', patterns: ['実家'] }]), true);
	const data = emptyData({ poopLogs: [
		{ id: 'p1', datetime: '2026-08-01T08:00', condition: 'normal', location: '室内', coprophagia: false, memo: '今日は実家へ行った' },
		{ id: 'p2', datetime: '2026-08-02T08:00', condition: 'soft', location: '室内', coprophagia: false, memo: '実家から帰宅' },
	] });
	const sprint2 = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, data);
	assert.ok(sprint2.facts.includes('「実家」を含むメモ：2件'));
	const sprint4 = analysisEngine.analyzeRequest({ question: AnalysisQuestion.MemoKeywordDays, keywordId: 'custom:home' }, data);
	assert.equal(sprint4.hasEnoughData, true);
	assert.equal(sprint4.summary, '「実家」を含むメモがある2日分の記録をまとめました。');
	assert.ok(sprint4.facts.includes('「実家」を含むメモ：2件'));
	assert.ok(getAllMemoKeywords().some((keyword) => keyword.id === 'custom:home'));
	cleanupStorage();
});

test('編集後は同じIDで新labelだけがSprint2とSprint4へ反映される', () => {
	installStorage();
	assert.equal(saveCustomMemoKeywords([{ id: 'custom:home', label: '実家', patterns: ['実家'] }]), true);
	const oldData = emptyData({ poopLogs: [
		{ id: 'p1', datetime: '2026-08-01T08:00', condition: 'normal', location: '室内', coprophagia: false, memo: '今日は実家へ行った' },
		{ id: 'p2', datetime: '2026-08-02T08:00', condition: 'normal', location: '室内', coprophagia: false, memo: '実家から帰宅' },
	] });
	assert.ok(analysisEngine.analyze(AnalysisQuestion.MemoKeywords, oldData).facts.some((fact) => fact.includes('実家')));
	assert.equal(analysisEngine.analyzeRequest({ question: AnalysisQuestion.MemoKeywordDays, keywordId: 'custom:home' }, oldData).hasEnoughData, true);
	assert.equal(updateCustomMemoKeyword('custom:home', '実家2').ok, true);
	assert.deepEqual(loadCustomMemoKeywords()[0], { id: 'custom:home', label: '実家2', patterns: ['実家2'] });
	assert.equal(analysisEngine.analyze(AnalysisQuestion.MemoKeywords, oldData).facts.some((fact) => fact.includes('実家')), false);
	assert.equal(analysisEngine.analyzeRequest({ question: AnalysisQuestion.MemoKeywordDays, keywordId: 'custom:home' }, oldData).hasEnoughData, false);
	const newData = emptyData({ poopLogs: [
		{ id: 'p3', datetime: '2026-08-03T08:00', condition: 'normal', location: '室内', coprophagia: false, memo: '実家2へ行った' },
		{ id: 'p4', datetime: '2026-08-04T08:00', condition: 'normal', location: '室内', coprophagia: false, memo: '実家2から帰宅' },
	] });
	assert.ok(analysisEngine.analyze(AnalysisQuestion.MemoKeywords, newData).facts.some((fact) => fact.includes('実家2')));
	assert.equal(analysisEngine.analyzeRequest({ question: AnalysisQuestion.MemoKeywordDays, keywordId: 'custom:home' }, newData).hasEnoughData, true);
	cleanupStorage();
});

test('削除後は標準20語を維持しSprint2とSprint4から安全に除外する', () => {
	installStorage();
	const memo = '今日は実家へ行った';
	assert.equal(saveCustomMemoKeywords([{ id: 'custom:home', label: '実家', patterns: ['実家'] }]), true);
	assert.equal(deleteCustomMemoKeyword('custom:home').ok, true);
	assert.equal(getAllMemoKeywords().length, 20);
	assert.equal(getAllMemoKeywords().some((keyword) => keyword.label === '実家'), false);
	assert.equal(getMemoKeyword('custom:home'), null);
	const data = emptyData({ poopLogs: [
		{ id: 'p1', datetime: '2026-08-01T08:00', condition: 'normal', location: '室内', coprophagia: false, memo },
		{ id: 'p2', datetime: '2026-08-02T08:00', condition: 'normal', location: '室内', coprophagia: false, memo },
	] });
	assert.equal(analysisEngine.analyze(AnalysisQuestion.MemoKeywords, data).facts.some((fact) => fact.includes('実家')), false);
	const result = analysisEngine.analyzeRequest({ question: AnalysisQuestion.MemoKeywordDays, keywordId: 'custom:home' }, data);
	assert.equal(result.hasEnoughData, false);
	assert.deepEqual(result.meta, []);
	assert.equal(data.poopLogs[0].memo, memo);
	cleanupStorage();
});

test('カスタム注目語をバックアップへ含めて復元できる', () => {
	installStorage();
	const custom = [{ id: 'custom:home', label: '実家', patterns: ['実家'] }];
	assert.equal(saveCustomMemoKeywords(custom), true);
	const backup = createPetCareBackup();
	assert.equal(backup.version, '1.9.0');
	assert.deepEqual(backup.data.customKeywords, custom);
	assert.equal(saveCustomMemoKeywords([]), true);
	assert.equal(restorePetCareBackup(backup), true);
	assert.deepEqual(loadCustomMemoKeywords(), custom);
	cleanupStorage();
});

test('正常な1.6.0バックアップは空配列・複数件・export再parse・restoreを保持する', () => {
	installStorage();
	assert.ok(parsePetCareBackup(JSON.stringify(validBackup([]))));
	const custom = [customKeyword(0), customKeyword(1)];
	assert.deepEqual(parsePetCareBackup(JSON.stringify(validBackup(custom)))?.data.customKeywords, custom);
	assert.equal(saveCustomMemoKeywords(custom), true);
	const reparsed = parsePetCareBackup(JSON.stringify(createPetCareBackup()));
	assert.ok(reparsed);
	assert.deepEqual(reparsed.data.customKeywords, custom);
	assert.equal(saveCustomMemoKeywords([]), true);
	assert.equal(restorePetCareBackup(reparsed), true);
	assert.deepEqual(loadCustomMemoKeywords(), custom);
	cleanupStorage();
});

test('全データ削除でカスタム語と既存キーを削除し標準20語を維持する', () => {
	const { values } = installStorage();
	for (const key of PERSISTED_STORAGE_KEYS) values.set(key, '[]');
	values.set(CUSTOM_MEMO_KEYWORDS_STORAGE_KEY, JSON.stringify([{ id: 'custom:home', label: '実家', patterns: ['実家'] }]));
	assert.equal(resetPetCareData(), true);
	for (const key of PERSISTED_STORAGE_KEYS) assert.equal(values.has(key), false, key);
	assert.deepEqual(loadCustomMemoKeywords(), []);
	assert.equal(getAllMemoKeywords().length, 20);
	cleanupStorage();
});
