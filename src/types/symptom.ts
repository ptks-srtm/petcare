export const SYMPTOM_TYPES = ['vomiting', 'cough', 'sneeze', 'itching', 'lowEnergy', 'eyeDischarge', 'other'] as const;

export type SymptomType = (typeof SYMPTOM_TYPES)[number];

export const SYMPTOM_TYPE_LABELS: Record<SymptomType, string> = {
	vomiting: '吐いた',
	cough: '咳',
	sneeze: 'くしゃみ',
	itching: 'かく・なめる',
	lowEnergy: '元気がない（いつもより）',
	eyeDischarge: '目やに',
	other: 'その他',
};

export type SymptomLog = {
	id: string;
	datetime: string;
	symptoms: SymptomType[];
	otherSymptom?: string;
	memo?: string;
};

export type NewSymptomLog = Omit<SymptomLog, 'id'>;

export function getSymptomDisplayLabels(log: Pick<SymptomLog, 'symptoms' | 'otherSymptom'>) {
	return SYMPTOM_TYPES
		.filter((symptom) => log.symptoms.includes(symptom))
		.map((symptom) => symptom === 'other' && log.otherSymptom ? `その他：${log.otherSymptom}` : SYMPTOM_TYPE_LABELS[symptom]);
}
