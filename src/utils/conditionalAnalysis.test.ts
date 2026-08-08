import assert from 'node:assert/strict';
import test from 'node:test';
import { AnalysisQuestion, type AnalysisData } from '../types/analysis.ts';
import { analysisEngine } from './analysisEngine.ts';
import { buildDailyAnalysisIndex } from './analysisDailyIndex.ts';

function makeData(overrides: Partial<AnalysisData> = {}): AnalysisData {
	return {
		poopLogs: [], mealLogs: [], walkLogs: [], weightLogs: [], hospitalLogs: [],
		medicationLogs: [], vaccineLogs: [], groomingLogs: [], ...overrides,
	};
}

function poop(id: string, datetime: string, coprophagia = false, condition: 'normal' | 'soft' | 'hard' = 'normal', memo = '') {
	return { id, datetime, coprophagia, condition, location: '室内', memo };
}

function meal(id: string, datetime: string, intake: 'all' | 'most' | 'half' | 'little' | 'none' = 'all', memo?: string) {
	return { id, datetime, mealType: 'breakfast' as const, intake, memo };
}

test('日別索引はローカル日付ごとに同日複数ログを保持し不正日時を除外する', () => {
	const index = buildDailyAnalysisIndex(makeData({
		poopLogs: [
			poop('p1', '2026-01-31T23:59'),
			poop('p2', '2026-02-01T00:00'),
			poop('p3', 'invalid'),
		],
		mealLogs: [meal('m1', '2026-02-01T12:00')],
	}));
	assert.deepEqual([...index.keys()].sort(), ['2026-01-31', '2026-02-01']);
	assert.equal(index.get('2026-02-01')?.poopLogs.length, 1);
	assert.equal(index.get('2026-02-01')?.mealLogs.length, 1);
});

test('日別索引は8種類すべてを対応する配列へ格納する', () => {
	const datetime = '2026-08-01T12:00';
	const index = buildDailyAnalysisIndex(makeData({
		poopLogs: [poop('p1', datetime)],
		mealLogs: [meal('m1', datetime)],
		walkLogs: [{ id: 'walk1', datetime, durationMinutes: 10 }],
		weightLogs: [{ id: 'weight1', datetime, weightKg: 6.2 }],
		hospitalLogs: [{ id: 'hospital1', datetime }],
		medicationLogs: [{ id: 'medication1', datetime, medicineName: '薬' }],
		vaccineLogs: [{ id: 'vaccine1', datetime, vaccineName: 'ワクチン' }],
		groomingLogs: [{ id: 'grooming1', datetime, services: ['shampoo'] }],
	}));
	const entry = index.get('2026-08-01');
	assert.ok(entry);
	assert.deepEqual(entry.poopLogs.map((log) => log.id), ['p1']);
	assert.deepEqual(entry.mealLogs.map((log) => log.id), ['m1']);
	assert.deepEqual(entry.walkLogs.map((log) => log.id), ['walk1']);
	assert.deepEqual(entry.weightLogs.map((log) => log.id), ['weight1']);
	assert.deepEqual(entry.hospitalLogs.map((log) => log.id), ['hospital1']);
	assert.deepEqual(entry.medicationLogs.map((log) => log.id), ['medication1']);
	assert.deepEqual(entry.vaccineLogs.map((log) => log.id), ['vaccine1']);
	assert.deepEqual(entry.groomingLogs.map((log) => log.id), ['grooming1']);
});

test('日別索引は年末とうるう日を別のローカル日として扱う', () => {
	const index = buildDailyAnalysisIndex(makeData({ poopLogs: [
		poop('p1', '2024-02-29T00:00'),
		poop('p2', '2026-12-31T23:59'),
		poop('p3', '2027-01-01T00:00'),
	] }));
	assert.deepEqual([...index.keys()].sort(), ['2024-02-29', '2026-12-31', '2027-01-01']);
});

test('食糞ありの日はtrueだけを条件にし同日複数件でも対象日を重複させない', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.CoprophagiaDaySummary, makeData({
		poopLogs: [
			poop('p1', '2026-08-01T08:00', true, 'soft', '雨'),
			poop('p2', '2026-08-01T09:00', true, 'normal'),
			poop('p3', '2026-08-02T08:00', true, 'hard', '雨'),
			poop('p4', '2026-08-03T08:00', false),
		],
		mealLogs: [meal('m1', '2026-08-01T10:00'), meal('m2', '2026-08-02T10:00')],
		walkLogs: [{ id: 'w1', datetime: '2026-08-01T18:00', durationMinutes: 20 }, { id: 'w2', datetime: '2026-08-02T18:00', durationMinutes: 25 }],
		hospitalLogs: [{ id: 'h1', datetime: '2026-08-02T12:00' }],
	}));
	assert.equal(result.hasEnoughData, true);
	assert.equal(result.summary, '食糞ありの記録がある2日分の記録をまとめました。');
	assert.ok(result.facts.includes('食糞あり：3件'));
	assert.ok(result.facts.includes('対象日：2日'));
	assert.ok(result.facts.includes('やわらかめ：1件'));
	assert.ok(result.facts.includes('さんぽ：合計45分'));
	assert.ok(result.facts.includes('病院：1件'));
	assert.ok(result.facts.includes('注目語「雨」：2件'));
	assert.ok(result.note);
	assert.deepEqual(result.meta, [{ label: '集計したログ', value: '8件' }]);
});

test('食糞ありの対象日が1日なら不足、3日なら少数注記なし', () => {
	const oneDay = makeData({ poopLogs: [poop('p1', '2026-08-01T08:00', true), poop('p2', '2026-08-01T09:00', true)] });
	const threeDays = makeData({ poopLogs: [poop('p1', '2026-08-01T08:00', true), poop('p2', '2026-08-02T08:00', true), poop('p3', '2026-08-03T08:00', true)] });
	const insufficient = analysisEngine.analyze(AnalysisQuestion.CoprophagiaDaySummary, oneDay);
	assert.equal(insufficient.hasEnoughData, false);
	assert.deepEqual(insufficient.meta, []);
	assert.equal(analysisEngine.analyze(AnalysisQuestion.CoprophagiaDaySummary, threeDays).note, undefined);
});

test('食べなかった日はnoneだけを条件にし対象日の記録を集計する', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.NoMealDaySummary, makeData({
		mealLogs: [
			meal('m1', '2026-08-01T08:00', 'none', '留守番'),
			meal('m2', '2026-08-01T18:00', 'none'),
			meal('m3', '2026-08-02T08:00', 'none', '留守番'),
			meal('m4', '2026-08-03T08:00', 'all'),
		],
		poopLogs: [poop('p1', '2026-08-01T10:00', true, 'soft'), poop('p2', '2026-08-02T10:00', false, 'normal')],
		walkLogs: [{ id: 'w1', datetime: '2026-08-01T19:00', durationMinutes: 10 }, { id: 'w2', datetime: '2026-08-02T19:00', durationMinutes: 20 }],
		hospitalLogs: [{ id: 'h1', datetime: '2026-08-02T12:00' }],
	}));
	assert.equal(result.hasEnoughData, true);
	assert.ok(result.facts.includes('食べなかった記録：3件'));
	assert.ok(result.facts.includes('対象日：2日'));
	assert.ok(result.facts.includes('さんぽ：合計30分'));
	assert.ok(result.facts.includes('対象日あたりのさんぽ平均：15.0分'));
	assert.ok(result.facts.includes('食糞あり：1件'));
	assert.ok(result.facts.includes('病院：1件'));
	assert.ok(result.facts.includes('注目語「留守番」：2件'));
	assert.ok(result.note);
	assert.deepEqual(result.meta, [{ label: '集計したログ', value: '8件' }]);
});

test('食べなかった日の対象日数で不足と少数注記を判定する', () => {
	const oneDay = makeData({ mealLogs: [meal('m1', '2026-08-01T08:00', 'none')] });
	const threeDays = makeData({ mealLogs: [meal('m1', '2026-08-01T08:00', 'none'), meal('m2', '2026-08-02T08:00', 'none'), meal('m3', '2026-08-03T08:00', 'none')] });
	const insufficient = analysisEngine.analyze(AnalysisQuestion.NoMealDaySummary, oneDay);
	assert.equal(insufficient.hasEnoughData, false);
	assert.deepEqual(insufficient.meta, []);
	assert.equal(analysisEngine.analyze(AnalysisQuestion.NoMealDaySummary, threeDays).note, undefined);
});

test('最新病院受診前は直前7日を含み受診日と8日前を除外する', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.BeforeLatestHospital, makeData({
		hospitalLogs: [{ id: 'h1', datetime: '2026-07-01T09:00' }, { id: 'h2', datetime: '2026-08-08T10:00' }],
		poopLogs: [
			poop('outside', '2026-07-31T23:59', true, 'soft'),
			poop('start', '2026-08-01T00:00', true, 'soft'),
			poop('end', '2026-08-07T23:59', false, 'hard'),
			poop('visit', '2026-08-08T00:00', true, 'soft'),
		],
		mealLogs: [meal('m1', '2026-08-02T08:00', 'none')],
		walkLogs: [{ id: 'w1', datetime: '2026-08-03T08:00', durationMinutes: 180 }],
		weightLogs: [{ id: 'wt1', datetime: '2026-08-04T08:00', weightKg: 6 }, { id: 'wt2', datetime: '2026-08-07T08:00', weightKg: 6.2 }],
	}));
	assert.equal(result.hasEnoughData, true);
	assert.ok(result.facts.includes('受診日：8月8日'));
	assert.ok(result.facts.includes('対象期間：8月1日〜8月7日'));
	assert.ok(result.facts.includes('やわらかめ：1件'));
	assert.ok(result.facts.includes('かため：1件'));
	assert.ok(result.facts.includes('食糞あり：1件'));
	assert.ok(result.facts.includes('食べなかった：1件'));
	assert.ok(result.facts.includes('さんぽ：合計180分'));
	assert.ok(result.facts.includes('最新体重：6.2kg'));
	assert.equal(result.note, undefined);
	assert.deepEqual(result.meta, [{ label: '集計したログ', value: '6件' }]);
});

test('病院がない・前7日が空なら不足、1件だけなら少数注記を返す', () => {
	const noHospital = analysisEngine.analyze(AnalysisQuestion.BeforeLatestHospital, makeData());
	assert.equal(noHospital.hasEnoughData, false);
	assert.deepEqual(noHospital.meta, []);
	const emptyPeriod = makeData({ hospitalLogs: [{ id: 'h1', datetime: '2026-08-08T10:00' }] });
	const emptyResult = analysisEngine.analyze(AnalysisQuestion.BeforeLatestHospital, emptyPeriod);
	assert.equal(emptyResult.hasEnoughData, false);
	assert.deepEqual(emptyResult.meta, []);
	const oneLog = makeData({ hospitalLogs: emptyPeriod.hospitalLogs, mealLogs: [meal('m1', '2026-08-01T08:00')] });
	assert.ok(analysisEngine.analyze(AnalysisQuestion.BeforeLatestHospital, oneLog).note);
});

test('新しい3分析の本文に禁止表現を含めない', () => {
	const data = makeData({
		poopLogs: [poop('p1', '2026-08-01T08:00', true), poop('p2', '2026-08-02T08:00', true)],
		mealLogs: [meal('m1', '2026-08-01T08:00', 'none'), meal('m2', '2026-08-02T08:00', 'none')],
		hospitalLogs: [{ id: 'h1', datetime: '2026-08-08T10:00' }],
	});
	const text = [AnalysisQuestion.CoprophagiaDaySummary, AnalysisQuestion.NoMealDaySummary, AnalysisQuestion.BeforeLatestHospital]
		.flatMap((question) => {
			const result = analysisEngine.analyze(question, data);
			return [result.summary, ...result.facts, result.note ?? ''];
		}).join(' ');
	for (const forbidden of ['原因', '関連', '関係', '影響', 'しやすい', '傾向', '改善', '悪化', '効果', '副作用', '可能性', '前兆']) {
		assert.equal(text.includes(forbidden), false);
	}
});
