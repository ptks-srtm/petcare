import { AnalysisQuestion } from '../../types/analysis.ts';

export const ANALYSIS_QUESTION_GROUPS = [
	{ label: 'うんち', questions: [
		{ value: AnalysisQuestion.PoopTime, label: '食糞しやすい時間は？' },
		{ value: AnalysisQuestion.PoopPlace, label: '食糞しやすい場所は？' },
		{ value: AnalysisQuestion.PoopState, label: '最近のうんち状態は？' },
	] },
	{ label: '毎日の記録', questions: [
		{ value: AnalysisQuestion.MealPattern, label: '最近のごはん回数は？' },
		{ value: AnalysisQuestion.WalkPattern, label: '最近のさんぽ時間は？' },
		{ value: AnalysisQuestion.WeightTrend, label: '最近の体重変化は？' },
		{ value: AnalysisQuestion.MemoKeywords, label: 'メモによく含まれる言葉は？' },
	] },
	{ label: 'ケア', questions: [
		{ value: AnalysisQuestion.HospitalSummary, label: '病院の記録をまとめると？' },
		{ value: AnalysisQuestion.CareSummary, label: 'ケアの記録件数は？' },
	] },
	{ label: '条件から見る', questions: [
		{ value: AnalysisQuestion.CoprophagiaDaySummary, label: '食糞ありの日の記録は？' },
		{ value: AnalysisQuestion.NoMealDaySummary, label: 'ごはんを食べなかった日の記録は？' },
		{ value: AnalysisQuestion.BeforeLatestHospital, label: '最新の病院受診前の記録は？' },
		{ value: AnalysisQuestion.MemoKeywordDays, label: 'メモの言葉から記録を見る' },
	] },
] as const;
