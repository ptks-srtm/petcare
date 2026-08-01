export type LogType = 'poop' | 'meal' | 'walk' | 'hospital' | 'weight';

export const LOG_TYPE_META: Record<LogType, { label: string }> = {
	poop: { label: 'うんち' },
	meal: { label: 'ごはん' },
	walk: { label: 'さんぽ' },
	hospital: { label: '病院' },
	weight: { label: '体重' },
};
