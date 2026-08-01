export type WeightLog = {
	id: string;
	datetime: string;
	weightKg: number;
	memo?: string;
};

export type NewWeightLog = Omit<WeightLog, 'id'>;
