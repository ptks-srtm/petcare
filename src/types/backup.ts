import type { PoopLog } from './log';
import type { MealLog } from './meal';
import type { PetProfile } from './profile';
import type { PoopLocationOption } from './poopLocation';
import type { WalkLog } from './walk';
import type { HospitalLog } from './hospital';

export type PetCareBackupData = {
	profile: PetProfile | null;
	poopLogs: PoopLog[];
	mealLogs: MealLog[];
	walkLogs: WalkLog[];
	hospitalLogs: HospitalLog[];
	poopLocationOptions: PoopLocationOption[];
};

export type PetCareBackup = {
	version: string;
	exportedAt: string;
	data: PetCareBackupData;
};
