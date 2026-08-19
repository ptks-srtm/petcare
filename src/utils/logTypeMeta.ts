export type LogType = 'poop' | 'meal' | 'walk' | 'hospital' | 'medication' | 'vaccine' | 'weight' | 'grooming' | 'symptom';

export const LOG_TYPE_META: Record<LogType, { label: string }> = {
	poop: { label: 'うんち' },
	meal: { label: 'ごはん' },
	walk: { label: 'さんぽ' },
	hospital: { label: '病院' },
	medication: { label: 'お薬' },
	vaccine: { label: 'ワクチン' },
	weight: { label: '体重' },
	grooming: { label: 'お手入れ' },
	symptom: { label: '気になる体調' },
};
