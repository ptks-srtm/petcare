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

test('メモが空または1件だけならデータ不足を返す', () => {
	const empty = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData());
	const oneMemo = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData({
		mealLogs: [{ id: 'm1', datetime: '2026-08-01T08:00', mealType: 'breakfast', intake: 'all', memo: '公園' }],
	}));
	assert.equal(empty.summary, INSUFFICIENT_ANALYSIS_MESSAGE);
	assert.equal(empty.relatedLogs, 0);
	assert.equal(oneMemo.summary, INSUFFICIENT_ANALYSIS_MESSAGE);
	assert.equal(oneMemo.relatedLogs, 1);
});

test('同じ注目語は1メモ内で重複しても1件として数える', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData({
		mealLogs: [{ id: 'm1', datetime: '2026-08-01T08:00', mealType: 'breakfast', intake: 'all', memo: '散歩、散歩、散歩' }],
		walkLogs: [{ id: 's1', datetime: '2026-08-01T09:00', durationMinutes: 10, memo: '今日は散歩に行った' }],
	}));
	assert.equal(result.summary, '保存されているメモでは、「散歩」を含む記録が2件で最も多くなっています。');
	assert.deepEqual(result.facts, ['「散歩」を含むメモ：2件']);
	assert.equal(result.relatedLogs, 2);
	assert.ok(!result.facts.some((fact) => fact.includes('4回')));
});

test('日本語自然文から定義済み注目語だけを抽出する', () => {
	const cases = [
		{ memo: '今日は雨で散歩が短めだった', expected: ['雨', '散歩', '散歩短め'] },
		{ memo: '留守番のあとに食糞した', expected: ['留守番'] },
		{ memo: '病院帰りで少し疲れていた', expected: ['病院'] },
		{ memo: '朝はごはんを食べなかった', expected: ['朝', 'ごはん'] },
		{ memo: '薬を飲んだあと眠そう', expected: ['薬'] },
	];
	for (const [index, item] of cases.entries()) {
		const result = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData({
			poopLogs: [
				{ ...poop(`p${index}-1`, '2026-08-01T08:00', '廊下', false), memo: item.memo },
				{ ...poop(`p${index}-2`, '2026-08-01T09:00', '廊下', false), memo: item.memo },
			],
		}));
		const text = result.facts.join(' ');
		for (const keyword of item.expected) assert.ok(text.includes(`「${keyword}」`));
		for (const fragment of ['病院帰', 'りで', 'はごはんを', 'べなかった', 'めだった']) assert.equal(text.includes(fragment), false);
	}
});

test('定義済みの1文字注目語を集計する', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData({
		mealLogs: [{ id: 'm1', datetime: '2026-08-01T08:00', mealType: 'breakfast', intake: 'all', memo: '朝は雨、夜は雪' }],
		walkLogs: [{ id: 's1', datetime: '2026-08-01T09:00', durationMinutes: 10, memo: '薬は夜に飲んだ' }],
	}));
	const text = result.facts.join(' ');
	for (const keyword of ['雨', '薬', '朝', '夜', '雪']) assert.ok(text.includes(`「${keyword}」`));
});

test('定義済みpatternの表記だけを同じラベルへ統合する', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData({
		mealLogs: [{ id: 'm1', datetime: '2026-08-01T08:00', mealType: 'breakfast', intake: 'all', memo: '雨天だった' }],
		walkLogs: [{ id: 's1', datetime: '2026-08-01T09:00', durationMinutes: 10, memo: '雨の公園' }],
	}));
	assert.equal(result.facts[0], '「雨」を含むメモ：2件');
});

test('同率は注目語定義順で安定させ上位5件だけ返す', () => {
	const memo = '朝 夜 雨 雪 暑い 寒い 雷';
	const result = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData({
		mealLogs: [{ id: 'm1', datetime: '2026-08-01T08:00', mealType: 'breakfast', intake: 'all', memo }],
		walkLogs: [{ id: 's1', datetime: '2026-08-01T09:00', durationMinutes: 10, memo }],
	}));
	assert.deepEqual(result.facts, ['「朝」を含むメモ：2件', '「夜」を含むメモ：2件', '「雨」を含むメモ：2件', '「雪」を含むメモ：2件', '「暑い」を含むメモ：2件']);
	assert.equal(result.summary, '保存されているメモでは、「朝」、「夜」、「雨」、「雪」と「暑い」を含む記録がそれぞれ2件で最も多くなっています。');
});

test('メモが2件以上でも注目語がなければデータ不足を返す', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData({
		mealLogs: [{ id: 'm1', datetime: '2026-08-01T08:00', mealType: 'breakfast', intake: 'all', memo: '特記事項なし' }],
		walkLogs: [{ id: 's1', datetime: '2026-08-01T09:00', durationMinutes: 10, memo: 'いつもどおり' }],
	}));
	assert.equal(result.hasEnoughData, false);
	assert.equal(result.relatedLogs, 2);
});

test('体重ログのメモはキーワード分析へ含めない', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.MemoKeywords, makeData({
		mealLogs: [{ id: 'm1', datetime: '2026-08-01T08:00', mealType: 'breakfast', intake: 'all', memo: '公園' }],
		walkLogs: [{ id: 's1', datetime: '2026-08-01T09:00', durationMinutes: 10, memo: '公園' }],
		weightLogs: [{ id: 'w1', datetime: '2026-08-01T10:00', weightKg: 6.2, memo: '対象外キーワード' }],
	}));
	assert.deepEqual(result.facts, ['「公園」を含むメモ：2件']);
	assert.equal(result.relatedLogs, 2);
});

test('直近30件のうんち状態を件数と割合で表示する', () => {
	const logs = [
		{ ...poop('p1', '2026-08-01T08:00', '廊下', false), condition: 'normal' as const },
		{ ...poop('p2', '2026-07-31T08:00', '廊下', false), condition: 'normal' as const },
		{ ...poop('p3', '2026-07-30T08:00', '廊下', false), condition: 'soft' as const },
		{ ...poop('p4', '2026-07-29T08:00', '廊下', false), condition: 'hard' as const },
	];
	const result = analysisEngine.analyze(AnalysisQuestion.PoopState, makeData({ poopLogs: logs }));
	assert.equal(result.summary, '直近4件のうんち状態を集計しました。');
	assert.deepEqual(result.facts, ['ふつう：2件（50%）', 'やわらかめ：1件（25%）', 'かため：1件（25%）']);
	assert.equal(result.relatedLogs, 4);
});

test('うんち状態が空ならデータ不足を返す', () => {
	assert.equal(analysisEngine.analyze(AnalysisQuestion.PoopState, makeData()).hasEnoughData, false);
});

test('病院まとめは費用未入力を0円扱いせず最後の受診日を表示する', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.HospitalSummary, makeData({ hospitalLogs: [
		{ id: 'h1', datetime: '2026-07-20T09:00' },
		{ id: 'h2', datetime: '2026-08-01T10:00' },
	] }));
	assert.equal(result.summary, '保存されている病院の記録は2件です。');
	assert.deepEqual(result.facts, ['受診回数：2件', '最後の受診日：2026年8月1日', '医療費：記録なし']);
});

test('病院まとめは入力済み費用だけを合計する', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.HospitalSummary, makeData({ hospitalLogs: [
		{ id: 'h1', datetime: '2026-07-20T09:00', costYen: 12000 },
		{ id: 'h2', datetime: '2026-07-25T09:00' },
		{ id: 'h3', datetime: '2026-08-01T10:00', costYen: 0 },
	] }));
	assert.ok(result.facts.includes('医療費合計：12,000円'));
	assert.ok(result.facts.includes('費用入力：2件'));
	assert.equal(result.relatedLogs, 3);
});

test('病院ログが空ならデータ不足を返す', () => {
	assert.equal(analysisEngine.analyze(AnalysisQuestion.HospitalSummary, makeData()).hasEnoughData, false);
});

test('ケアまとめは4種類の件数と合計を返す', () => {
	const result = analysisEngine.analyze(AnalysisQuestion.CareSummary, makeData({
		medicationLogs: [{ id: 'md1', datetime: '2026-08-01T08:00', medicineName: '薬A' }, { id: 'md2', datetime: '2026-08-01T09:00', medicineName: '薬B' }],
		vaccineLogs: [{ id: 'v1', datetime: '2026-08-01T10:00', vaccineName: '混合' }],
		weightLogs: [{ id: 'w1', datetime: '2026-08-01T11:00', weightKg: 6.2 }],
		groomingLogs: [{ id: 'g1', datetime: '2026-08-01T12:00', services: ['shampoo'] }],
	}));
	assert.equal(result.summary, '保存されているケアの記録は合計5件です。');
	assert.deepEqual(result.facts, ['お薬：2件', 'ワクチン：1件', '体重：1件', 'お手入れ：1件']);
	assert.equal(result.relatedLogs, 5);
});

test('ケア4種類がすべて0件ならデータ不足を返す', () => {
	assert.equal(analysisEngine.analyze(AnalysisQuestion.CareSummary, makeData()).hasEnoughData, false);
});

test('Sprint2の分析結果に診断・推測・提案の表現を含めない', () => {
	const data = makeData({
		poopLogs: [{ ...poop('p1', '2026-08-01T08:00', '廊下', false), memo: '公園' }, { ...poop('p2', '2026-07-31T08:00', '廊下', false), memo: '公園' }],
		hospitalLogs: [{ id: 'h1', datetime: '2026-08-01T10:00', costYen: 1000 }],
		medicationLogs: [{ id: 'md1', datetime: '2026-08-01T11:00', medicineName: '薬A' }],
	});
	const text = [AnalysisQuestion.MemoKeywords, AnalysisQuestion.PoopState, AnalysisQuestion.HospitalSummary, AnalysisQuestion.CareSummary]
		.flatMap((question) => {
			const result = analysisEngine.analyze(question, data);
			return [result.summary, ...result.facts, result.note ?? ''];
		})
		.join(' ');
	for (const forbidden of ['原因', '関連', 'しやすい', '可能性', '改善', '悪化', '診断', 'と思われます']) assert.equal(text.includes(forbidden), false);
});
