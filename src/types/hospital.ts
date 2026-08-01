export type HospitalLog = {
	id: string;
	datetime: string;
	hospitalName?: string;
	reason?: string;
	diagnosis?: string;
	prescription?: string;
	costYen?: number;
	nextVisitDate?: string;
	memo?: string;
};

export type NewHospitalLog = Omit<HospitalLog, 'id'>;
