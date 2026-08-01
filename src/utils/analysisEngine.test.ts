import assert from 'node:assert/strict';
import test from 'node:test';
import { AnalysisQuestion, type AnalysisData } from '../types/analysis.ts';
import type { PoopLog } from '../types/log';
import { analysisEngine, INSUFFICIENT_ANALYSIS_MESSAGE, LIMITED_SAMPLE_MESSAGE } from './analysisEngine.ts';

const referenceDate = new Date(2026, 7, 1, 12, 0);

function makeData(overrides: Partial<AnalysisData> = {}): AnalysisData {
	return {
		poopLogs: [],
		mealLogs: [],
		walkLogs: [],
		weightLogs: [],
		hospitalLogs: [],
		medicationLogs: [],
		vaccineLogs: [],
		groomingLogs: [],
		...overrides,
	};
}

function poop(id: string, datetime: string, location: string, coprophagia = true): PoopLog {
	return { id, datetime, location, coprophagia, condition: 'normal', memo: '' };
}

test('食糞の時間帯を時間単位で集計する', () => {
	const data = makeData({ poopLogs: [
		poop('p1', '2026-08-01T07:59', '廊下'),
		poop('p2', '2026-08-01T08:00', '廊下'),
		poop('p3', '2026-08-01T08:59', '散歩'),
		poop('p4', '2026-08-01T09:00', '散歩', false),
	] });
	const result = analysisEngine.analyze(AnalysisQuestion.PoopTime, data, { referenceDate });
	assert.equal(result.hasEnoughData, true);
	assert.equal(result.relatedLogs, 3);
	assert.equal(result.summary, '食糞ありの記録では、8時台が2件で最も多くなっています。');
	assert.deepEqual(result.facts, ['食糞あり・7時台：1件', '食糞あり・8時台：2件']);
});

test('境界時刻と同率最多の時間帯をすべて表示する', () => {
	const data = makeData({ poopLogs: [
		poop('p1', '2026-08-01T00:00', '廊下'),
		poop('p2', '2026-08-01T23:59', '散歩'),
	] });
	const result = analysisEngine.analyze(AnalysisQuestion.PoopTime, data);
	assert.equal(result.summary, '食糞ありの記録では、0時台と23時台がそれぞれ1件で最も多くなっています。');
	assert.equal(result.note, LIMITED_SAMPLE_MESSAGE);
});

test('食糞の場所を集計し同率最多をすべて表示する', () => {
	const data = makeData({ poopLogs: [
		poop('p1', '2026-08-01T08:00', '廊下'),
		poop('p2', '2026-08-01T09:00', '散歩'),
		poop('p3', '2026-08-01T10:00', '廊下'),
		poop('p4', '2026-08-01T11:00', '散歩'),
	] });
	const result = analysisEngine.analyze(AnalysisQuestion.PoopPlace, data);
	assert.equal(result.summary, '食糞ありの記録では、散歩と廊下がそれぞれ2件で最も多くなっています。');
	assert.equal(result.relatedLogs, 4);
	assert.equal(result.note, undefined);
});

test('食糞の場所の単独最多でも集計対象を明記する', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.PoopPlace, makeData({ poopLogs: [
		poop('p1', '2026-08-01T08:00', '廊下'),
		poop('p2', '2026-08-01T09:00', '廊下'),
		poop('p3', '2026-08-01T10:00', '散歩'),
	] }));
	assert.equal(result.summary, '食糞ありの記録では、廊下が2件で最も多くなっています。');
	assert.ok(result.facts.every((fact) => fact.startsWith('食糞あり・')));
});

test('直近30日間の最古と最新の体重差を返す', () => {
	const data = makeData({ weightLogs: [
		{ id: 'w0', datetime: '2026-06-01T08:00', weightKg: 5 },
		{ id: 'w1', datetime: '2026-07-05T08:00', weightKg: 6.1 },
		{ id: 'w2', datetime: '2026-08-01T08:00', weightKg: 6.4 },
	] });
	const result = analysisEngine.analyze(AnalysisQuestion.WeightTrend, data, { referenceDate });
	assert.equal(result.summary, '30日間で0.3kg増えています。');
	assert.equal(result.relatedLogs, 2);
	assert.deepEqual(result.facts, ['最初の記録：6.1kg', '最新の記録：6.4kg', '差分：+0.3kg']);
	assert.equal(result.note, LIMITED_SAMPLE_MESSAGE);
});

test('少数データの補足は2件のみに表示する', () => {
	const twoLogs = makeData({ poopLogs: [poop('p1', '2026-08-01T08:00', '廊下'), poop('p2', '2026-08-01T09:00', '廊下')] });
	const threeLogs = makeData({ poopLogs: [...twoLogs.poopLogs, poop('p3', '2026-08-01T10:00', '廊下')] });
	assert.equal(analysisEngine.analyze(AnalysisQuestion.PoopTime, twoLogs).note, LIMITED_SAMPLE_MESSAGE);
	assert.equal(analysisEngine.analyze(AnalysisQuestion.PoopTime, threeLogs).note, undefined);
	assert.equal(analysisEngine.analyze(AnalysisQuestion.PoopTime, makeData()).note, undefined);
});

test('ごはん回数とさんぽ時間を直近7日間で集計する', () => {
	const data = makeData({
		mealLogs: [
			{ id: 'm1', datetime: '2026-07-26T08:00', mealType: 'breakfast', intake: 'all' },
			{ id: 'm2', datetime: '2026-08-01T18:00', mealType: 'dinner', intake: 'most' },
		],
		walkLogs: [
			{ id: 's1', datetime: '2026-07-26T07:00', durationMinutes: 30 },
			{ id: 's2', datetime: '2026-08-01T19:00', durationMinutes: 60 },
		],
	});
	const meal = analysisEngine.analyze(AnalysisQuestion.MealPattern, data, { referenceDate });
	const walk = analysisEngine.analyze(AnalysisQuestion.WalkPattern, data, { referenceDate });
	assert.equal(meal.summary, '直近7日間に2件、1日平均0.3件のごはんが記録されています。');
	assert.equal(walk.summary, '直近7日間のさんぽは合計90分、1回平均45.0分です。');
});

test('空配列と最低件数未満では共通のデータ不足結果を返す', () => {
	const empty = makeData();
	for (const question of [AnalysisQuestion.PoopTime, AnalysisQuestion.PoopPlace, AnalysisQuestion.WeightTrend, AnalysisQuestion.MealPattern, AnalysisQuestion.WalkPattern]) {
		const result = analysisEngine.analyze(question, empty, { referenceDate });
		assert.equal(result.summary, INSUFFICIENT_ANALYSIS_MESSAGE);
		assert.equal(result.hasEnoughData, false);
		assert.equal(result.relatedLogs, 0);
	}

	const oneLog = makeData({ poopLogs: [poop('p1', '2026-08-01T08:00', '廊下')] });
	assert.equal(analysisEngine.analyze(AnalysisQuestion.PoopTime, oneLog).hasEnoughData, false);
	assert.equal(analysisEngine.analyze(AnalysisQuestion.PoopPlace, oneLog).hasEnoughData, false);
});

test('未実装のメモ分析は安全なデータ不足結果を返す', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData());
	assert.equal(result.title, 'メモのキーワード');
	assert.equal(result.summary, INSUFFICIENT_ANALYSIS_MESSAGE);
	assert.equal(result.hasEnoughData, false);
});
