export const GROOMING_SERVICES = ['cut', 'shampoo', 'nailTrim', 'earCleaning', 'brushing', 'dentalCare', 'other'] as const;
export type GroomingService = (typeof GROOMING_SERVICES)[number];

export const GROOMING_LOCATIONS = ['salon', 'home', 'other'] as const;
export type GroomingLocation = (typeof GROOMING_LOCATIONS)[number];

export type GroomingLog = {
	id: string;
	datetime: string;
	services: GroomingService[];
	location?: GroomingLocation;
	salonName?: string;
	otherService?: string;
	costYen?: number;
	nextCareDate?: string;
	memo?: string;
};

export type NewGroomingLog = Omit<GroomingLog, 'id'>;
