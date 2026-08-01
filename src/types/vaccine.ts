export type VaccineLog = {
	id: string;
	datetime: string;
	vaccineName: string;
	hospitalName?: string;
	nextVaccinationDate?: string;
	costYen?: number;
	memo?: string;
};

export type NewVaccineLog = Omit<VaccineLog, 'id'>;
