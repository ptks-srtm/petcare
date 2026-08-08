import type { AnalysisData } from '../types/analysis.ts';
import type { DailyAnalysisEntry, DailyAnalysisIndex } from '../types/conditionalAnalysis.ts';
import { toLocalDateKey } from './logDate.ts';

type LogCollectionKey = keyof AnalysisData;

const collectionKeys: readonly LogCollectionKey[] = [
	'poopLogs',
	'mealLogs',
	'walkLogs',
	'weightLogs',
	'hospitalLogs',
	'medicationLogs',
	'vaccineLogs',
	'groomingLogs',
];

export function buildDailyAnalysisIndex(data: AnalysisData): DailyAnalysisIndex {
	const index: DailyAnalysisIndex = new Map();

	for (const collectionKey of collectionKeys) {
		for (const log of data[collectionKey]) {
			const date = new Date(log.datetime);
			if (Number.isNaN(date.getTime())) continue;
			const dateKey = toLocalDateKey(date);
			const entry = index.get(dateKey) ?? createDailyEntry(dateKey);
			pushLog(entry, collectionKey, log);
			index.set(dateKey, entry);
		}
	}

	return index;
}

export function getAnalyzableMemos(entry: DailyAnalysisEntry): string[] {
	return [
		...entry.poopLogs.map((log) => log.memo),
		...entry.mealLogs.map((log) => log.memo),
		...entry.walkLogs.map((log) => log.memo),
		...entry.hospitalLogs.map((log) => log.memo),
		...entry.medicationLogs.map((log) => log.memo),
		...entry.vaccineLogs.map((log) => log.memo),
		...entry.groomingLogs.map((log) => log.memo),
	].filter((memo): memo is string => typeof memo === 'string' && memo.trim().length > 0);
}

function createDailyEntry(dateKey: string): DailyAnalysisEntry {
	return {
		dateKey,
		poopLogs: [],
		mealLogs: [],
		walkLogs: [],
		weightLogs: [],
		hospitalLogs: [],
		medicationLogs: [],
		vaccineLogs: [],
		groomingLogs: [],
	};
}

function pushLog(entry: DailyAnalysisEntry, key: LogCollectionKey, log: AnalysisData[LogCollectionKey][number]) {
	// collectionKeyとlogはAnalysisDataの同じコレクションから取得している。
	(entry[key] as Array<typeof log>).push(log);
}
