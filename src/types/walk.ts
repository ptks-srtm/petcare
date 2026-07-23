export type WalkLog = {
	id: string;
	datetime: string;
	durationMinutes: number;
	memo?: string;
};

export type NewWalkLog = Omit<WalkLog, 'id'>;
