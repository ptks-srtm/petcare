import type { PoopLog } from '../types/log';
import type { MealLog } from '../types/meal';
import type { PetProfile } from '../types/profile';
import type { WalkLog } from '../types/walk';
import type { ConsultationHealthLog, ConsultationTopic, PetConsultationRequest } from '../types/consultation';
import { combineHealthLogs } from './healthLog';
import { getLocalDayRange, isWithinRange } from './healthSummary';
import { getWeeklyHealthTrends } from './healthTrends';

export function buildPetConsultationRequest({ topic, concern, profile, poopLogs, mealLogs, walkLogs, referenceDate = new Date() }: {
	topic: ConsultationTopic;
	concern: string;
	profile: PetProfile | null;
	poopLogs: readonly PoopLog[];
	mealLogs: readonly MealLog[];
	walkLogs: readonly WalkLog[];
	referenceDate?: Date;
}): PetConsultationRequest {
	const trends = getWeeklyHealthTrends(poopLogs, mealLogs, walkLogs, referenceDate);
	const { start, end } = getLocalDayRange(referenceDate, 7);
	const recentLogs = combineHealthLogs(poopLogs, mealLogs, walkLogs)
		.filter((entry): entry is ConsultationHealthLog => entry.kind === 'poop' || entry.kind === 'meal' || entry.kind === 'walk')
		.filter((entry) => isWithinRange(entry.datetime, start, end));
	return {
		topic,
		concern: concern.trim(),
		pet: profile ? { name: profile.name, species: profile.species, breed: profile.breed, birthDate: profile.birthday, sex: profile.sex } : {},
		period: { from: trends.poop.daily[0].date, to: trends.poop.daily[6].date, label: trends.periodLabel },
		summary: {
			poop: { total: trends.poop.total, normalCount: trends.poop.normalCount, softCount: trends.poop.softCount, hardCount: trends.poop.hardCount, coprophagiaCount: trends.poop.coprophagiaCount },
			meal: { total: trends.meal.total, allCount: trends.meal.allCount, mostCount: trends.meal.mostCount, halfCount: trends.meal.halfCount, littleCount: trends.meal.littleCount, noneCount: trends.meal.noneCount },
			walk: { count: trends.walk.count, totalMinutes: trends.walk.totalMinutes, averageMinutesPerDay: trends.walk.averageMinutesPerDay },
		},
		recentLogs,
	};
}
