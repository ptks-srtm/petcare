import assert from 'node:assert/strict';
import test from 'node:test';
import type { PeriodHealthTrends, TrendPeriodDays } from './healthTrends';
import { evaluateTrendInsights, getTrendComparisonPeriods } from './trendInsights.ts';

type TrendOverrides = {
	poop?: Partial<PeriodHealthTrends['poop']>;
	meal?: Partial<PeriodHealthTrends['meal']>;
	walk?: Partial<PeriodHealthTrends['walk']>;
};

function makeTrends(periodDays: TrendPeriodDays, overrides: TrendOverrides = {}): PeriodHealthTrends {
	return {
		periodDays,
		periodLabel: '',
		totalRecords: 0,
		weight: { count: 0, latest: null, previous: null, differenceKg: null, averageKg: null, daily: [] },
		walk: { count: 0, totalMinutes: 0, averageMinutesPerWalk: null, averageWalksPerDay: 0, daily: [], ...overrides.walk },
		meal: { total: 0, averagePerDay: 0, allCount: 0, mostCount: 0, halfCount: 0, littleCount: 0, noneCount: 0, allOrMostPercentage: null, mostCommonIntakes: [], ...overrides.meal },
		poop: { total: 0, averagePerDay: 0, normalCount: 0, softCount: 0, hardCount: 0, coprophagiaCount: 0, normalPercentage: null, softPercentage: null, hardPercentage: null, ...overrides.poop },
		hospital: { latest: null, count: 0, costTotalYen: 0, costRecordedCount: 0 },
	};
}

function getInsights(periodDays: TrendPeriodDays, current: TrendOverrides, previous: TrendOverrides) {
	return getEvaluation(periodDays, current, previous).insights;
}

function getEvaluation(periodDays: TrendPeriodDays, current: TrendOverrides, previous: TrendOverrides) {
	return evaluateTrendInsights({ periodDays, current: makeTrends(periodDays, current), previous: makeTrends(periodDays, previous) });
}

function localDate(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDayCount(start: Date, end: Date) {
	let count = 0;
	const cursor = new Date(start);
	while (cursor < end) {
		count += 1;
		cursor.setDate(cursor.getDate() + 1);
	}
	return count;
}

for (const periodDays of [7, 30, 90] as const) {
	test(`${periodDays}日間の現在期間と前期間は連続し重複しない`, () => {
		const periods = getTrendComparisonPeriods(periodDays, new Date(2026, 7, 1, 18, 30));
		assert.equal(periods.previous.end.getTime(), periods.current.start.getTime());
		assert.equal(localDayCount(periods.current.start, periods.current.end), periodDays);
		assert.equal(localDayCount(periods.previous.start, periods.previous.end), periodDays);
		assert.equal(periods.current.start.getHours(), 0);
		assert.equal(periods.current.end.getHours(), 0);
	});
}

test('月末、年末、うるう年をローカル日付でまたぐ', () => {
	const monthEnd = getTrendComparisonPeriods(7, new Date(2026, 7, 1));
	assert.equal(localDate(monthEnd.current.start), '2026-07-26');
	assert.equal(localDate(monthEnd.previous.start), '2026-07-19');
	assert.equal(localDate(monthEnd.previous.end), '2026-07-26');

	const yearEnd = getTrendComparisonPeriods(7, new Date(2027, 0, 1));
	assert.equal(localDate(yearEnd.current.start), '2026-12-26');
	assert.equal(localDate(yearEnd.previous.end), '2026-12-26');

	const leapYear = getTrendComparisonPeriods(7, new Date(2028, 2, 1));
	assert.equal(localDate(leapYear.current.start), '2028-02-24');
	assert.equal(localDayCount(leapYear.current.start, leapYear.current.end), 7);
});

test('最低件数未満では割合とさんぽの気づきを出さない', () => {
	assert.deepEqual(getInsights(7, { poop: { total: 2, softCount: 2 } }, { poop: { total: 3, softCount: 0 } }), []);
	assert.deepEqual(getInsights(7, { meal: { total: 2, noneCount: 2 } }, { meal: { total: 3, noneCount: 0 } }), []);
	assert.deepEqual(getInsights(7, { walk: { count: 1, totalMinutes: 120 } }, { walk: { count: 2, totalMinutes: 100 } }), []);
});

test('全種類0件と最低件数未満はデータ不足として返す', () => {
	const cases: Array<[TrendOverrides, TrendOverrides]> = [
		[{}, {}],
		[{ poop: { total: 2, softCount: 1 } }, { poop: { total: 2, softCount: 1 } }],
		[{ meal: { total: 2, noneCount: 1 } }, { meal: { total: 2, noneCount: 1 } }],
		[{ walk: { count: 1, totalMinutes: 30 } }, { walk: { count: 1, totalMinutes: 30 } }],
	];
	for (const [current, previous] of cases) {
		const evaluation = getEvaluation(7, current, previous);
		assert.deepEqual(evaluation.insights, []);
		assert.equal(evaluation.hasSufficientData, false);
	}
});

test('最低件数を満たし基準未満の場合は比較可能として返す', () => {
	const cases: Array<[TrendOverrides, TrendOverrides]> = [
		[{ poop: { total: 100, softCount: 19 } }, { poop: { total: 100, softCount: 0 } }],
		[{ meal: { total: 100, noneCount: 19 } }, { meal: { total: 100, noneCount: 0 } }],
		[{ walk: { count: 2, totalMinutes: 119 } }, { walk: { count: 2, totalMinutes: 100 } }],
	];
	for (const [current, previous] of cases) {
		const evaluation = getEvaluation(7, current, previous);
		assert.deepEqual(evaluation.insights, []);
		assert.equal(evaluation.hasSufficientData, true);
	}
});

test('気づきがある場合も評価結果へ保持する', () => {
	const thresholdEvaluation = getEvaluation(7,
		{ meal: { total: 100, noneCount: 20 } },
		{ meal: { total: 100, noneCount: 0 } },
	);
	assert.equal(thresholdEvaluation.insights.length, 1);
	assert.equal(thresholdEvaluation.hasSufficientData, true);

	const coprophagiaEvaluation = getEvaluation(7, { poop: { coprophagiaCount: 1 } }, {});
	assert.equal(coprophagiaEvaluation.insights[0]?.id, 'coprophagia-count');
	assert.equal(coprophagiaEvaluation.hasSufficientData, false);
});

test('3件以上のうんち・ごはんと2件以上のさんぽを判定する', () => {
	const insights = getInsights(7,
		{ poop: { total: 3, softCount: 3 }, meal: { total: 3, noneCount: 3 }, walk: { count: 2, totalMinutes: 120 } },
		{ poop: { total: 3, softCount: 0 }, meal: { total: 3, noneCount: 0 }, walk: { count: 2, totalMinutes: 100 } },
	);
	assert.deepEqual(insights.map((insight) => insight.kind), ['poop', 'meal', 'walk']);
});

test('割合差19ポイントでは出さず20ポイントで出す', () => {
	assert.deepEqual(getInsights(30, { poop: { total: 100, softCount: 19 } }, { poop: { total: 100, softCount: 0 } }), []);
	assert.equal(getInsights(30, { poop: { total: 100, softCount: 20 } }, { poop: { total: 100, softCount: 0 } })[0]?.kind, 'poop');
	assert.deepEqual(getInsights(30, { meal: { total: 100, noneCount: 19 } }, { meal: { total: 100, noneCount: 0 } }), []);
	assert.equal(getInsights(30, { meal: { total: 100, noneCount: 20 } }, { meal: { total: 100, noneCount: 0 } })[0]?.kind, 'meal');
});

test('さんぽ差19%では出さず20%で出す', () => {
	assert.deepEqual(getInsights(7, { walk: { count: 2, totalMinutes: 119 } }, { walk: { count: 2, totalMinutes: 100 } }), []);
	assert.equal(getInsights(7, { walk: { count: 2, totalMinutes: 120 } }, { walk: { count: 2, totalMinutes: 100 } })[0]?.kind, 'walk');
});

test('やわらかめ・かためが両方該当すると変化ポイントが大きい1件だけを出す', () => {
	const largerHard = getInsights(7, { poop: { total: 10, softCount: 3, hardCount: 5 } }, { poop: { total: 10, softCount: 0, hardCount: 0 } });
	assert.equal(largerHard.length, 1);
	assert.match(largerHard[0].message, /^かための割合/);

	const tied = getInsights(7, { poop: { total: 10, softCount: 5, hardCount: 5 } }, { poop: { total: 10, softCount: 0, hardCount: 0 } });
	assert.equal(tied.length, 1);
	assert.match(tied[0].message, /^やわらかめの割合/);
});

test('優先順位順・種類ごと1件・最大3件に抑制する', () => {
	const insights = getInsights(7,
		{ poop: { total: 3, softCount: 3, coprophagiaCount: 1 }, meal: { total: 3, noneCount: 3 }, walk: { count: 2, totalMinutes: 120 } },
		{ poop: { total: 3, softCount: 0 }, meal: { total: 3, noneCount: 0 }, walk: { count: 2, totalMinutes: 100 } },
	);
	assert.deepEqual(insights.map((insight) => insight.id), ['coprophagia-count', 'meal-none-percentage', 'walk-total-minutes']);
	assert.equal(new Set(insights.map((insight) => insight.kind)).size, insights.length);
	assert.ok(insights.length <= 3);
});

test('選択期間・件数・割合・時間を固定テンプレートへ反映する', () => {
	const insights = getInsights(90,
		{ poop: { total: 5, softCount: 2, coprophagiaCount: 2 }, meal: { total: 5, noneCount: 2 }, walk: { count: 2, totalMinutes: 150 } },
		{ poop: { total: 5, softCount: 1 }, meal: { total: 5, noneCount: 1 }, walk: { count: 2, totalMinutes: 300 } },
	);
	assert.equal(insights[0].message, '食糞ありの記録が、この90日間に2件あります。');
	assert.equal(insights[1].message, '食べなかった割合は、前の90日間の20%から、この90日間は40%になっています。');
	assert.equal(insights[2].message, 'さんぽ時間は、前の90日間の5時間から、この90日間は2時間30分になっています。');
});

test('禁止表現を含まない', () => {
	const messages = getInsights(7,
		{ poop: { total: 3, softCount: 3, coprophagiaCount: 1 }, meal: { total: 3, noneCount: 3 }, walk: { count: 2, totalMinutes: 120 } },
		{ poop: { total: 3, softCount: 0 }, meal: { total: 3, noneCount: 0 }, walk: { count: 2, totalMinutes: 100 } },
	).map((insight) => insight.message).join(' ');
	for (const forbidden of ['改善', '悪化', '健康', '不健康', '異常', '危険', '注意が必要', '運動不足', '食欲低下', '病院へ行くべき', '原因は', '可能性があります']) {
		assert.equal(messages.includes(forbidden), false, forbidden);
	}
});

test('0件・片方だけの記録・該当ルールなしでは空配列を返す', () => {
	assert.deepEqual(getInsights(7, {}, {}), []);
	assert.deepEqual(getInsights(7, { meal: { total: 3, noneCount: 3 } }, {}), []);
	assert.deepEqual(getInsights(7, {}, { walk: { count: 2, totalMinutes: 100 } }), []);
	assert.deepEqual(getInsights(7, { poop: { total: 3, softCount: 1 } }, { poop: { total: 3, softCount: 1 } }), []);
});
