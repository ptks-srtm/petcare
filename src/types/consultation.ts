import type { PetProfile } from './profile';
import type { HealthLogEntry } from '../utils/healthLog';

export type ConsultationTopic = 'poop' | 'meal' | 'walk' | 'overall' | 'other';

export type ConsultationPet = {
	name?: string;
	species?: PetProfile['species'];
	breed?: string;
	birthDate?: string;
	sex?: PetProfile['sex'];
	weightKg?: number;
};

export type ConsultationSummary = {
	poop: { total: number; normalCount: number; softCount: number; hardCount: number; coprophagiaCount: number };
	meal: { total: number; allCount: number; mostCount: number; halfCount: number; littleCount: number; noneCount: number };
	walk: { count: number; totalMinutes: number; averageMinutesPerDay: number };
};

export type PetConsultationRequest = {
	topic: ConsultationTopic;
	concern: string;
	pet: ConsultationPet;
	period: { from: string; to: string; label: string };
	summary: ConsultationSummary;
	recentLogs: HealthLogEntry[];
};

export type PetConsultationResponse = {
	summary: string;
	observations: string[];
	checkPoints: string[];
	veterinaryGuidance: string[];
	urgentSigns: string[];
	suggestedRecords: string[];
	disclaimer: string;
};
