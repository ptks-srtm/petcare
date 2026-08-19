import assert from 'node:assert/strict';
import test from 'node:test';
import type { SymptomLog } from '../types/symptom.ts';
import { getPeriodHealthTrendComparison, type TrendLogCollections } from './healthTrends.ts';
import { getLocalDayRange } from './healthSummary.ts';
import { buildSymptomTrendSummary } from './symptomTrends.ts';

function symptomLog(id: string, datetime: string, symptoms: SymptomLog['symptoms'], extras: Partial<SymptomLog> = {}): SymptomLog {
	return { id, datetime, symptoms, ...extras };
}

function summary(logs: readonly SymptomLog[], referenceDate: Date, days: 7 | 30 | 90) {
	return buildSymptomTrendSummary(logs, getLocalDayRange(referenceDate, days));
}

for (const days of [7, 30, 90] as const) {
	test(`気になる体調を既存${days}日期間で集計する`, () => {
		const referenceDate = new Date(2026, 7, 19, 10, 0);
		const { start, end } = getLocalDayRange(referenceDate, days);
		const logs = [
			symptomLog('start', `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}T00:00`, ['cough']),
			symptomLog('end', `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}T00:00`, ['sneeze']),
		];
		const result = buildSymptomTrendSummary(logs, { start, end });
		assert.equal(result.logCount, 1);
		assert.deepEqual(result.counts, [{ type: 'cough', label: '咳', count: 1 }]);
	});
}

test('月末・年末・うるう年をまたぐローカル期間を集計する', () => {
	const cases = [
		{ reference: new Date(2026, 7, 1, 12), datetime: '2026-07-31T23:59' },
		{ reference: new Date(2027, 0, 1, 12), datetime: '2026-12-31T23:59' },
		{ reference: new Date(2028, 2, 1, 12), datetime: '2028-02-29T23:59' },
	];
	for (const [index, item] of cases.entries()) {
		assert.equal(summary([symptomLog(String(index), item.datetime, ['vomiting'])], item.reference, 7).logCount, 1);
	}
});

test('今日の未来時刻を含み明日以降を除外する', () => {
	const result = summary([
		symptomLog('future-today', '2026-08-19T23:59', ['vomiting']),
		symptomLog('tomorrow', '2026-08-20T00:00', ['cough']),
	], new Date(2026, 7, 19, 9, 0), 7);
	assert.equal(result.logCount, 1);
	assert.deepEqual(result.counts, [{ type: 'vomiting', label: '吐いた', count: 1 }]);
});

test('ログ件数と複数症状の内訳を分けて集計する', () => {
	const result = summary([
		symptomLog('one', '2026-08-18T08:00', ['vomiting', 'lowEnergy']),
		symptomLog('two', '2026-08-19T08:00', ['vomiting']),
	], new Date(2026, 7, 19, 12), 7);
	assert.equal(result.logCount, 2);
	assert.deepEqual(result.counts, [
		{ type: 'vomiting', label: '吐いた', count: 2 },
		{ type: 'lowEnergy', label: '元気がない（いつもより）', count: 1 },
	]);
});

test('0件typeを除外し同率はSYMPTOM_TYPES順にする', () => {
	const result = summary([
		symptomLog('one', '2026-08-18T08:00', ['lowEnergy', 'cough']),
		symptomLog('two', '2026-08-19T08:00', ['sneeze']),
	], new Date(2026, 7, 19, 12), 7);
	assert.deepEqual(result.counts.map(({ type }) => type), ['cough', 'sneeze', 'lowEnergy']);
	assert.equal(result.counts.some(({ type }) => type === 'other'), false);
});

test('otherは件数だけを集計し自由入力とmemo原文を含めない', () => {
	const result = summary([
		symptomLog('one', '2026-08-18T08:00', ['other'], { otherSymptom: '足をかばっている', memo: '夕方のさんぽ後' }),
	], new Date(2026, 7, 19, 12), 7);
	assert.deepEqual(result.counts, [{ type: 'other', label: 'その他', count: 1 }]);
	assert.doesNotMatch(JSON.stringify(result), /足をかばっている|夕方のさんぽ後/);
});

test('最新日時は保存順に依存せず元配列を変更しない', () => {
	const logs = [
		symptomLog('latest', '2026-08-19T21:00', ['cough']),
		symptomLog('oldest', '2026-08-17T09:00', ['cough']),
		symptomLog('middle', '2026-08-18T18:00', ['cough']),
	];
	const before = structuredClone(logs);
	const result = summary(logs, new Date(2026, 7, 19, 12), 7);
	assert.equal(result.latestDatetime, '2026-08-19T21:00');
	assert.deepEqual(logs, before);
});

test('現在・前期間の症状summaryを生成し症状ログをtotalRecordsへ含める', () => {
	const logs: TrendLogCollections = {
		poop: [], meal: [], walk: [], weight: [], hospital: [],
		symptom: [
			symptomLog('current', '2026-08-18T08:00', ['vomiting']),
			symptomLog('previous', '2026-08-10T08:00', ['cough']),
		],
	};
	const result = getPeriodHealthTrendComparison(logs, 7, new Date(2026, 7, 19, 12));
	assert.equal(result.current.symptom.logCount, 1);
	assert.equal(result.previous.symptom.logCount, 1);
	assert.equal(result.current.totalRecords, 1);
	assert.equal(result.current.poop.total, 0);
	assert.equal(result.current.meal.total, 0);
	assert.equal(result.current.walk.count, 0);
	assert.equal(result.current.weight.count, 0);
	assert.equal(result.current.hospital.count, 0);
});

test('症状0件では空summaryを返し既存集計へ加算しない', () => {
	const logs: TrendLogCollections = { poop: [], meal: [], walk: [], weight: [], hospital: [], symptom: [] };
	const result = getPeriodHealthTrendComparison(logs, 30, new Date(2026, 7, 19, 12)).current;
	assert.deepEqual(result.symptom, { logCount: 0, counts: [], latestDatetime: null });
	assert.equal(result.totalRecords, 0);
});

test('症状Trendsの生成値に評価・推測表現を含めない', () => {
	const result = summary([symptomLog('one', '2026-08-19T08:00', ['vomiting'])], new Date(2026, 7, 19, 12), 7);
	const serialized = JSON.stringify(result);
	for (const forbidden of ['多い', '頻発', '傾向', '増えた', '減った', '改善', '悪化', '原因', '可能性']) {
		assert.equal(serialized.includes(forbidden), false, forbidden);
	}
});
