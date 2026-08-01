export type MedicationLog = {
	id: string;
	datetime: string;
	medicineName: string;
	dosage?: string;
	frequency?: string;
	startDate?: string;
	endDate?: string;
	hospitalName?: string;
	memo?: string;
};

export type NewMedicationLog = Omit<MedicationLog, 'id'>;
