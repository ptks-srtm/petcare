export type LogType = 'poop' | 'meal' | 'walk' | 'hospital';

export const LOG_TYPE_META: Record<LogType, { label: string }> = {
	poop: { label: 'うんち' },
	meal: { label: 'ごはん' },
	walk: { label: 'さんぽ' },
	hospital: { label: '病院' },
};
