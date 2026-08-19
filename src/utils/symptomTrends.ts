import { SYMPTOM_TYPES, SYMPTOM_TYPE_LABELS, type SymptomLog, type SymptomType } from '../types/symptom.ts';
import { isWithinRange } from './healthSummary.ts';

export type SymptomTrendCount = {
	type: SymptomType;
	label: string;
	count: number;
};

export type SymptomTrendSummary = {
	logCount: number;
	counts: SymptomTrendCount[];
	latestDatetime: string | null;
};

export function buildSymptomTrendSummary(
	logs: readonly SymptomLog[],
	range: { start: Date; end: Date },
): SymptomTrendSummary {
	const logsInRange = logs.filter((log) => isWithinRange(log.datetime, range.start, range.end));
	const counts = SYMPTOM_TYPES
		.map((type, order) => ({
			type,
			label: SYMPTOM_TYPE_LABELS[type],
			count: logsInRange.filter((log) => log.symptoms.includes(type)).length,
			order,
		}))
		.filter(({ count }) => count > 0)
		.sort((a, b) => b.count - a.count || a.order - b.order)
		.map(({ type, label, count }) => ({ type, label, count }));
	const latestDatetime = logsInRange.reduce<string | null>((latest, log) => (
		latest === null || new Date(log.datetime).getTime() > new Date(latest).getTime() ? log.datetime : latest
	), null);

	return { logCount: logsInRange.length, counts, latestDatetime };
}
