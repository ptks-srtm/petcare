import assert from 'node:assert/strict';
import test from 'node:test';
import { AnalysisQuestion, type AnalysisData } from '../types/analysis.ts';
import { analysisEngine } from './analysisEngine.ts';
import { ANALYSIS_QUERY_MAX_LENGTH, routeAnalysisQuery } from './analysisQueryRouter.ts';
import { MEMO_KEYWORDS, type MemoKeywordDefinition } from './memoKeywords.ts';

const customKeywords: MemoKeywordDefinition[] = [
	{ id: 'custom:home', label: '実家', patterns: ['実家'] },
	{ id: 'custom:abc', label: 'ABC', patterns: ['ABC'] },
	{ id: 'custom:house', label: '家', patterns: ['家'] },
];
const keywords = [...MEMO_KEYWORDS, ...customKeywords];

function matchedQuestion(query: string) {
	const result = routeAnalysisQuery(query, keywords);
	assert.equal(result.kind, 'matched', query);
	return result.kind === 'matched' ? result.request : null;
}

function emptyData(): AnalysisData {
	return { poopLogs: [], mealLogs: [], walkLogs: [], weightLogs: [], hospitalLogs: [], medicationLogs: [], vaccineLogs: [], groomingLogs: [] };
}

test('空文字・空白・100/101 UTF-16 code unitsの境界を判定する', () => {
	assert.deepEqual(routeAnalysisQuery('', keywords), { kind: 'unknown', reason: 'empty' });
	assert.deepEqual(routeAnalysisQuery('  　', keywords), { kind: 'unknown', reason: 'empty' });
	const queryPrefix = '最近の体重';
	const exactly100 = `${queryPrefix}${'？'.repeat(ANALYSIS_QUERY_MAX_LENGTH - queryPrefix.length)}`;
	assert.equal(exactly100.length, ANALYSIS_QUERY_MAX_LENGTH);
	assert.equal(routeAnalysisQuery(exactly100, keywords).kind, 'matched');
	assert.deepEqual(routeAnalysisQuery(`${exactly100}?`, keywords), { kind: 'unknown', reason: 'too_long' });
});

test('trim・NFKC・全角英数字・英字小文字化・全角疑問符を吸収する', () => {
	assert.equal(matchedQuestion('  食糞するのは何時？  ')?.question, AnalysisQuestion.PoopTime);
	const request = matchedQuestion('ＡＢＣの日の記録は？');
	assert.deepEqual(request, { question: AnalysisQuestion.MemoKeywordDays, keywordId: 'custom:abc' });
	assert.deepEqual(matchedQuestion('abcの日の記録は?'), request);
});

test('既存13分析へ代表質問をルーティングする', () => {
	const cases: Array<[string, AnalysisQuestion]> = [
		['食糞しやすい時間は？', AnalysisQuestion.PoopTime],
		['食糞する場所は？', AnalysisQuestion.PoopPlace],
		['最近のうんち状態は？', AnalysisQuestion.PoopState],
		['ごはん何回？', AnalysisQuestion.MealPattern],
		['最近散歩どれくらい？', AnalysisQuestion.WalkPattern],
		['最近の体重は？', AnalysisQuestion.WeightTrend],
		['メモによく含まれる言葉は？', AnalysisQuestion.MemoKeywords],
		['病院の記録をまとめて', AnalysisQuestion.HospitalSummary],
		['ケアの記録件数は？', AnalysisQuestion.CareSummary],
		['食糞ありの日の記録は？', AnalysisQuestion.CoprophagiaDaySummary],
		['食べなかった日の記録は？', AnalysisQuestion.NoMealDaySummary],
		['病院の前はどうだった？', AnalysisQuestion.BeforeLatestHospital],
		['雨の日の記録は？', AnalysisQuestion.MemoKeywordDays],
	];
	for (const [query, question] of cases) assert.equal(matchedQuestion(query)?.question, question, query);
	assert.deepEqual(matchedQuestion('雨の日の記録は？'), { question: AnalysisQuestion.MemoKeywordDays, keywordId: 'rain' });
});

test('食べなかった条件を通常のごはん回数へ誤ルーティングしない', () => {
	assert.equal(matchedQuestion('ごはん何回？')?.question, AnalysisQuestion.MealPattern);
	assert.equal(matchedQuestion('食事の回数は？')?.question, AnalysisQuestion.MealPattern);
	assert.equal(matchedQuestion('食べなかった日の記録は？')?.question, AnalysisQuestion.NoMealDaySummary);
	assert.equal(matchedQuestion('ごはんを食べなかった日はどうだった？')?.question, AnalysisQuestion.NoMealDaySummary);
	assert.deepEqual(routeAnalysisQuery('ごはんを食べなかったのは何回？', keywords), { kind: 'unknown', reason: 'unsupported' });
	assert.deepEqual(routeAnalysisQuery('食べていない', keywords), { kind: 'unknown', reason: 'unsupported' });
});

test('異なる分析対象が複数ある質問は一方だけを採用せずambiguousにする', () => {
	for (const query of [
		'最近の体重と散歩は？',
		'体重とごはんはどう？',
		'うんちと散歩の記録は？',
		'病院と体重の記録は？',
		'最近の体重と散歩時間は？',
		'ごはんと散歩は何回？',
		'病院と薬の記録は？',
	]) {
		assert.deepEqual(routeAnalysisQuery(query, keywords), { kind: 'unknown', reason: 'ambiguous' }, query);
	}
	assert.equal(matchedQuestion('最近の体重は？')?.question, AnalysisQuestion.WeightTrend);
	assert.equal(matchedQuestion('最近の散歩時間は？')?.question, AnalysisQuestion.WalkPattern);
});

test('明示的な複合分析は複数対象検出より先にルーティングする', () => {
	assert.equal(matchedQuestion('病院の前はどうだった？')?.question, AnalysisQuestion.BeforeLatestHospital);
	assert.equal(matchedQuestion('食糞ありの日の記録は？')?.question, AnalysisQuestion.CoprophagiaDaySummary);
	assert.equal(matchedQuestion('ごはんを食べなかった日の記録は？')?.question, AnalysisQuestion.NoMealDaySummary);
	assert.deepEqual(matchedQuestion('雨の日の記録は？'), { question: AnalysisQuestion.MemoKeywordDays, keywordId: 'rain' });
	assert.deepEqual(routeAnalysisQuery('病院の前と食べなかった日の記録は？', keywords), { kind: 'unknown', reason: 'ambiguous' });
});

test('標準・カスタム・pattern表記揺れ・1文字カスタム語をルーティングする', () => {
	assert.deepEqual(matchedQuestion('雨天の日はどうだった？'), { question: AnalysisQuestion.MemoKeywordDays, keywordId: 'rain' });
	assert.deepEqual(matchedQuestion('実家の日はどうだった？'), { question: AnalysisQuestion.MemoKeywordDays, keywordId: 'custom:home' });
	assert.deepEqual(matchedQuestion('家の日の記録は？'), { question: AnalysisQuestion.MemoKeywordDays, keywordId: 'custom:house' });
	assert.deepEqual(routeAnalysisQuery('実家の日はどうだった？', MEMO_KEYWORDS), { kind: 'unknown', reason: 'unsupported' });
});

test('包含関係は最長keyword、異なる複数keywordはambiguousにする', () => {
	assert.deepEqual(matchedQuestion('散歩短めの日の記録は？'), { question: AnalysisQuestion.MemoKeywordDays, keywordId: 'short-walk' });
	assert.deepEqual(routeAnalysisQuery('雨と実家の日の記録は？', keywords), { kind: 'unknown', reason: 'ambiguous' });
	assert.deepEqual(matchedQuestion('雨と雨天の日の記録は？'), { question: AnalysisQuestion.MemoKeywordDays, keywordId: 'rain' });
});

test('対象語だけで意図がない質問をmatchedにしない', () => {
	for (const query of ['散歩した', '病院', '食糞', 'ごはんがおいしい', '体重計を買った', '雨が降った']) {
		assert.notEqual(routeAnalysisQuery(query, keywords).kind, 'matched', query);
	}
});

test('曖昧な健康質問と複数分析候補を安全に返す', () => {
	for (const query of ['最近どう？', '元気？', '調子悪い？', '何か問題ある？']) {
		assert.deepEqual(routeAnalysisQuery(query, keywords), { kind: 'unknown', reason: 'unsupported' }, query);
	}
	assert.deepEqual(routeAnalysisQuery('最近の体重と散歩時間は？', keywords), { kind: 'unknown', reason: 'ambiguous' });
});

test('医療判断の質問をmedicalにし記録確認は許可する', () => {
	for (const query of ['病院へ行くべき？', '原因は？', 'この症状は病気？', '薬を飲ませてもいい？', '危険？', '異常？', '元気がないけど大丈夫？', '治る？']) {
		assert.deepEqual(routeAnalysisQuery(query, keywords), { kind: 'unknown', reason: 'medical' }, query);
	}
	assert.equal(matchedQuestion('病院の記録をまとめて')?.question, AnalysisQuestion.HospitalSummary);
	assert.equal(matchedQuestion('病院の前はどうだった？')?.question, AnalysisQuestion.BeforeLatestHospital);
	assert.equal(matchedQuestion('最後の受診記録は？')?.question, AnalysisQuestion.HospitalSummary);
});

test('matched requestは既存analyzeRequestと同じAnalysisResultを返す', () => {
	const data = emptyData();
	const request = matchedQuestion('最近の体重は？');
	assert.ok(request);
	assert.deepEqual(
		analysisEngine.analyzeRequest(request, data),
		analysisEngine.analyze(AnalysisQuestion.WeightTrend, data),
	);
	const unknown = routeAnalysisQuery('最近どう？', keywords);
	assert.equal(unknown.kind, 'unknown');
	assert.equal('request' in unknown, false);
});
