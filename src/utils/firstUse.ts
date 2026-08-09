import type { AnalysisData } from '../types/analysis';

export type FirstUseLogData = Pick<AnalysisData,
	| 'poopLogs'
	| 'mealLogs'
	| 'walkLogs'
	| 'weightLogs'
	| 'hospitalLogs'
	| 'medicationLogs'
	| 'vaccineLogs'
	| 'groomingLogs'
> & { profile?: unknown };

export function isFirstUse(data: FirstUseLogData) {
	return data.poopLogs.length === 0
		&& data.mealLogs.length === 0
		&& data.walkLogs.length === 0
		&& data.weightLogs.length === 0
		&& data.hospitalLogs.length === 0
		&& data.medicationLogs.length === 0
		&& data.vaccineLogs.length === 0
		&& data.groomingLogs.length === 0;
}
