import type { PoopLog } from './log';
import type { MealLog } from './meal';
import type { PetProfile } from './profile';
import type { PoopLocationOption } from './poopLocation';
import type { WalkLog } from './walk';
import type { HospitalLog } from './hospital';
import type { WeightLog } from './weight';
import type { MedicationLog } from './medication';
import type { VaccineLog } from './vaccine';
import type { GroomingLog } from './grooming';

export type PetCareBackupData = {
	profile: PetProfile | null;
	poopLogs: PoopLog[];
	mealLogs: MealLog[];
	walkLogs: WalkLog[];
	hospitalLogs: HospitalLog[];
	weightLogs: WeightLog[];
	medicationLogs: MedicationLog[];
	vaccineLogs: VaccineLog[];
	groomingLogs: GroomingLog[];
	poopLocationOptions: PoopLocationOption[];
};

export type PetCareBackup = {
	version: string;
	exportedAt: string;
	data: PetCareBackupData;
};
