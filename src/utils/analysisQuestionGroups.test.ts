import assert from 'node:assert/strict';
import test from 'node:test';
import { ANALYSIS_QUESTION_GROUPS } from '../components/analysis/analysisQuestionGroups.ts';
import { AnalysisQuestion } from '../types/analysis.ts';

test('分析質問は4カテゴリ・13件を既存順序で重複なく定義する', () => {
	assert.deepEqual(ANALYSIS_QUESTION_GROUPS.map((group) => group.label), ['うんち', '毎日の記録', 'ケア', '条件から見る']);
	assert.deepEqual(ANALYSIS_QUESTION_GROUPS.map((group) => group.questions.length), [3, 4, 2, 4]);
	const questions = ANALYSIS_QUESTION_GROUPS.flatMap((group) => group.questions.map((question) => question.value));
	assert.equal(questions.length, 13);
	assert.equal(new Set(questions).size, 13);
	assert.deepEqual(questions, [
		AnalysisQuestion.PoopTime,
		AnalysisQuestion.PoopPlace,
		AnalysisQuestion.PoopState,
		AnalysisQuestion.MealPattern,
		AnalysisQuestion.WalkPattern,
		AnalysisQuestion.WeightTrend,
		AnalysisQuestion.MemoKeywords,
		AnalysisQuestion.HospitalSummary,
		AnalysisQuestion.CareSummary,
		AnalysisQuestion.CoprophagiaDaySummary,
		AnalysisQuestion.NoMealDaySummary,
		AnalysisQuestion.BeforeLatestHospital,
		AnalysisQuestion.MemoKeywordDays,
	]);
});
