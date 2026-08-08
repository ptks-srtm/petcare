import type { AnalysisData, AnalysisResult } from '../types/analysis.ts';
import type { DailyAnalysisEntry } from '../types/conditionalAnalysis.ts';
import { buildDailyAnalysisIndex } from './analysisDailyIndex.ts';
import { isWithinRange, startOfLocalDay } from './healthSummary.ts';
import { countMemoKeywords } from './memoKeywords.ts';

const INSUFFICIENT_MESSAGE = '分析できる記録がまだ十分ではありません。';
const LIMITED_DAYS_MESSAGE = '対象となる日が少ないため、記録の確認用としてご覧ください。';
const LIMITED_LOGS_MESSAGE = '記録数が少ないため、確認用としてご覧ください。';

export function analyzeCoprophagiaDays(data: AnalysisData): AnalysisResult {
	const entries = [...buildDailyAnalysisIndex(data).values()]
		.filter((entry) => entry.poopLogs.some((log) => log.coprophagia));
	const coprophagiaLogs = entries.flatMap((entry) => entry.poopLogs.filter((log) => log.coprophagia));
	if (entries.length < 2) return insufficientResult('食糞ありの日の記録', coprophagiaLogs.length);

	const allPoopLogs = entries.flatMap((entry) => entry.poopLogs);
	const mealCount = entries.reduce((total, entry) => total + entry.mealLogs.length, 0);
	const walkMinutes = entries.reduce((total, entry) => total + sumWalkMinutes(entry), 0);
	const hospitalCount = entries.reduce((total, entry) => total + entry.hospitalLogs.length, 0);
	const keywords = countMemoKeywords(coprophagiaLogs.map((log) => log.memo).filter(isNonEmptyString));

	return {
		title: '食糞ありの日の記録',
		summary: `食糞ありの記録がある${entries.length}日分の記録をまとめました。`,
		facts: [
			`食糞あり：${coprophagiaLogs.length}件`,
			`対象日：${entries.length}日`,
			...poopConditionFacts(allPoopLogs),
			`ごはん：${mealCount}件`,
			`さんぽ：合計${walkMinutes}分`,
			`病院：${hospitalCount}件`,
			...keywords.map((keyword) => `注目語「${keyword.label}」：${keyword.count}件`),
		],
		relatedLogs: countEntryLogs(entries),
		hasEnoughData: true,
		note: entries.length === 2 ? LIMITED_DAYS_MESSAGE : undefined,
		meta: [{ label: '集計したログ', value: `${countEntryLogs(entries)}件` }],
	};
}

export function analyzeNoMealDays(data: AnalysisData): AnalysisResult {
	const entries = [...buildDailyAnalysisIndex(data).values()]
		.filter((entry) => entry.mealLogs.some((log) => log.intake === 'none'));
	const noMealLogs = entries.flatMap((entry) => entry.mealLogs.filter((log) => log.intake === 'none'));
	if (entries.length < 2) return insufficientResult('ごはんを食べなかった日の記録', noMealLogs.length);

	const poopLogs = entries.flatMap((entry) => entry.poopLogs);
	const walkMinutes = entries.reduce((total, entry) => total + sumWalkMinutes(entry), 0);
	const hospitalCount = entries.reduce((total, entry) => total + entry.hospitalLogs.length, 0);
	const keywords = countMemoKeywords(entries.flatMap(entryMemos));

	return {
		title: 'ごはんを食べなかった日の記録',
		summary: `ごはんを食べなかった記録がある${entries.length}日分の記録をまとめました。`,
		facts: [
			`食べなかった記録：${noMealLogs.length}件`,
			`対象日：${entries.length}日`,
			`さんぽ：合計${walkMinutes}分`,
			`対象日あたりのさんぽ平均：${formatOneDecimal(walkMinutes / entries.length)}分`,
			...poopConditionFacts(poopLogs),
			`食糞あり：${poopLogs.filter((log) => log.coprophagia).length}件`,
			`病院：${hospitalCount}件`,
			...keywords.map((keyword) => `注目語「${keyword.label}」：${keyword.count}件`),
		],
		relatedLogs: countEntryLogs(entries),
		hasEnoughData: true,
		note: entries.length === 2 ? LIMITED_DAYS_MESSAGE : undefined,
		meta: [{ label: '集計したログ', value: `${countEntryLogs(entries)}件` }],
	};
}

export function analyzeBeforeLatestHospital(data: AnalysisData): AnalysisResult {
	const latestHospital = [...data.hospitalLogs]
		.filter((log) => isValidDate(log.datetime))
		.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0];
	if (!latestHospital) return insufficientResult('最新の病院受診前の記録');

	const end = startOfLocalDay(new Date(latestHospital.datetime));
	const start = new Date(end);
	start.setDate(start.getDate() - 7);
	const poopLogs = data.poopLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const mealLogs = data.mealLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const walkLogs = data.walkLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const weightLogs = data.weightLogs.filter((log) => isWithinRange(log.datetime, start, end));
	const relatedLogs = poopLogs.length + mealLogs.length + walkLogs.length + weightLogs.length;
	if (relatedLogs === 0) return insufficientResult('最新の病院受診前の記録');

	const latestWeight = [...weightLogs].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0];
	const lastTargetDate = new Date(end);
	lastTargetDate.setDate(lastTargetDate.getDate() - 1);

	return {
		title: '最新の病院受診前の記録',
		summary: '最新の病院受診前7日間に記録された内容をまとめました。',
		facts: [
			`受診日：${formatDate(new Date(latestHospital.datetime))}`,
			`対象期間：${formatDate(start)}〜${formatDate(lastTargetDate)}`,
			...poopConditionFacts(poopLogs),
			`食糞あり：${poopLogs.filter((log) => log.coprophagia).length}件`,
			`ごはん：${mealLogs.length}件`,
			`食べなかった：${mealLogs.filter((log) => log.intake === 'none').length}件`,
			`さんぽ：合計${walkLogs.reduce((total, log) => total + log.durationMinutes, 0)}分`,
			`体重：${weightLogs.length}件`,
			...(latestWeight ? [`最新体重：${formatWeight(latestWeight.weightKg)}kg`] : []),
		],
		relatedLogs,
		hasEnoughData: true,
		note: relatedLogs === 1 ? LIMITED_LOGS_MESSAGE : undefined,
		// 前7日間のうんち・ごはん・さんぽ・体重ログの合計。
		meta: [{ label: '集計したログ', value: `${relatedLogs}件` }],
	};
}

function insufficientResult(title: string, relatedLogs = 0): AnalysisResult {
	return { title, summary: INSUFFICIENT_MESSAGE, facts: [], relatedLogs, hasEnoughData: false, meta: [] };
}

function poopConditionFacts(logs: readonly AnalysisData['poopLogs'][number][]) {
	return [
		`ふつう：${logs.filter((log) => log.condition === 'normal').length}件`,
		`やわらかめ：${logs.filter((log) => log.condition === 'soft').length}件`,
		`かため：${logs.filter((log) => log.condition === 'hard').length}件`,
	];
}

function sumWalkMinutes(entry: DailyAnalysisEntry) {
	return entry.walkLogs.reduce((total, log) => total + log.durationMinutes, 0);
}

function countEntryLogs(entries: readonly DailyAnalysisEntry[]) {
	return entries.reduce((total, entry) => total
		+ entry.poopLogs.length
		+ entry.mealLogs.length
		+ entry.walkLogs.length
		+ entry.weightLogs.length
		+ entry.hospitalLogs.length
		+ entry.medicationLogs.length
		+ entry.vaccineLogs.length
		+ entry.groomingLogs.length, 0);
}

function entryMemos(entry: DailyAnalysisEntry) {
	return [
		...entry.poopLogs.map((log) => log.memo),
		...entry.mealLogs.map((log) => log.memo),
		...entry.walkLogs.map((log) => log.memo),
		...entry.hospitalLogs.map((log) => log.memo),
		...entry.medicationLogs.map((log) => log.memo),
		...entry.vaccineLogs.map((log) => log.memo),
		...entry.groomingLogs.map((log) => log.memo),
	].filter(isNonEmptyString);
}

function isNonEmptyString(value: string | undefined): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value: string) {
	return !Number.isNaN(new Date(value).getTime());
}

function formatOneDecimal(value: number) {
	return new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatWeight(value: number) {
	return new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 }).format(value);
}

function formatDate(date: Date) {
	return new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric' }).format(date);
}
