import { AnalysisQuestion, type AnalysisRequest } from '../types/analysis.ts';
import type { MemoKeywordDefinition, MemoKeywordId } from './memoKeywords.ts';

export const ANALYSIS_QUERY_MAX_LENGTH = 100;

export type AnalysisRouteFailureReason =
	| 'empty'
	| 'too_long'
	| 'ambiguous'
	| 'unsupported'
	| 'medical';

export type AnalysisRouteResult =
	| { kind: 'matched'; request: AnalysisRequest }
	| { kind: 'unknown'; reason: AnalysisRouteFailureReason };

type KeywordMatch = {
	keyword: MemoKeywordDefinition;
	matchedPattern: string;
};

type NonKeywordAnalysisQuestion = Exclude<AnalysisQuestion, typeof AnalysisQuestion.MemoKeywordDays>;

type AnalysisTargetCategory =
	| 'coprophagia'
	| 'poop'
	| 'meal'
	| 'walk'
	| 'weight'
	| 'hospital'
	| 'care'
	| 'memo'
	| 'medication'
	| 'vaccine';

const medicalPatterns = [
	/病院.*(?:行く|いく).*べき/,
	/受診.*べき/,
	/原因/,
	/病気/,
	/診断/,
	/治療/,
	/治る/,
	/危険/,
	/異常/,
	/大丈夫/,
	/薬.*飲ませても/,
];

export function routeAnalysisQuery(
	query: string,
	availableKeywords: readonly MemoKeywordDefinition[],
): AnalysisRouteResult {
	const trimmed = query.trim();
	if (!trimmed) return { kind: 'unknown', reason: 'empty' };
	if (trimmed.length > ANALYSIS_QUERY_MAX_LENGTH) return { kind: 'unknown', reason: 'too_long' };

	const normalized = normalizeQuery(trimmed);
	if (medicalPatterns.some((pattern) => pattern.test(normalized))) {
		return { kind: 'unknown', reason: 'medical' };
	}

	const compoundQuestions = collectCompoundQuestions(normalized);
	if (compoundQuestions.length > 1) return { kind: 'unknown', reason: 'ambiguous' };
	if (compoundQuestions.length === 1) return { kind: 'matched', request: { question: compoundQuestions[0] } };

	if (collectTargetCategories(normalized).length > 1) {
		return { kind: 'unknown', reason: 'ambiguous' };
	}

	const candidates = collectQuestionCandidates(normalized);
	if (candidates.length > 1) return { kind: 'unknown', reason: 'ambiguous' };
	if (candidates.length === 1) return { kind: 'matched', request: { question: candidates[0] } };

	if (hasAny(normalized, ['日', 'とき', 'どうだった', 'まとめ', '記録を見る'])) {
		const keywordMatches = findKeywordMatches(normalized, availableKeywords);
		if (keywordMatches.length > 1) return { kind: 'unknown', reason: 'ambiguous' };
		if (keywordMatches.length === 1) {
			return {
				kind: 'matched',
				request: {
					question: AnalysisQuestion.MemoKeywordDays,
					keywordId: keywordMatches[0].keyword.id as MemoKeywordId,
				},
			};
		}
	}

	return { kind: 'unknown', reason: 'unsupported' };
}

function collectCompoundQuestions(query: string): NonKeywordAnalysisQuestion[] {
	const questions = new Set<NonKeywordAnalysisQuestion>();
	const hasCoprophagia = query.includes('食糞');
	const hasHospital = hasAny(query, ['病院', '受診']);
	const hasNoMeal = hasAny(query, ['食べなかった', '食べていない']);

	if (hasHospital && hasAny(query, ['受診前', '病院前', '病院の前', '受診の前'])) {
		questions.add(AnalysisQuestion.BeforeLatestHospital);
	}
	if (hasCoprophagia
		&& query.includes('日')
		&& hasAny(query, ['記録', 'まとめ'])
		&& !hasAny(query, ['時間', '何時', 'いつ', '場所', 'どこ'])) {
		questions.add(AnalysisQuestion.CoprophagiaDaySummary);
	}
	if (hasNoMeal && query.includes('日')) {
		questions.add(AnalysisQuestion.NoMealDaySummary);
	}

	return [...questions];
}

function collectTargetCategories(query: string): AnalysisTargetCategory[] {
	const categories = new Set<AnalysisTargetCategory>();
	const hasCoprophagia = query.includes('食糞');
	if (hasCoprophagia) categories.add('coprophagia');
	if (!hasCoprophagia && hasAny(query, ['うんち', '便'])) categories.add('poop');
	if (hasAny(query, ['ごはん', '食事'])) categories.add('meal');
	if (hasAny(query, ['さんぽ', '散歩'])) categories.add('walk');
	if (query.includes('体重')) categories.add('weight');
	if (hasAny(query, ['病院', '受診'])) categories.add('hospital');
	if (hasAny(query, ['ケア', 'お手入れ'])) categories.add('care');
	if (query.includes('メモ')) categories.add('memo');
	if (hasAny(query, ['薬', 'お薬'])) categories.add('medication');
	if (query.includes('ワクチン')) categories.add('vaccine');
	return [...categories];
}

function collectQuestionCandidates(query: string): NonKeywordAnalysisQuestion[] {
	const candidates = new Set<NonKeywordAnalysisQuestion>();
	const hasCoprophagia = query.includes('食糞');
	const hasHospital = hasAny(query, ['病院', '受診']);
	const hasPoop = hasAny(query, ['うんち', '便']);
	const hasMeal = hasAny(query, ['ごはん', '食事']);
	const hasWalk = hasAny(query, ['さんぽ', '散歩']);
	const hasNoMeal = hasAny(query, ['食べなかった', '食べていない']);
	if (hasCoprophagia && hasAny(query, ['時間', '何時', 'いつ'])) {
		candidates.add(AnalysisQuestion.PoopTime);
	}
	if (hasCoprophagia && hasAny(query, ['場所', 'どこ'])) {
		candidates.add(AnalysisQuestion.PoopPlace);
	}
	if (hasPoop && hasAny(query, ['状態', 'やわらかい', '柔らかい', 'かたい', '硬い', 'ふつう'])) {
		candidates.add(AnalysisQuestion.PoopState);
	}
	if (hasMeal && !hasNoMeal && hasAny(query, ['回数', '何回', '頻度'])) {
		candidates.add(AnalysisQuestion.MealPattern);
	}
	if (hasWalk && hasAny(query, ['時間', '何分', 'どれくらい', '合計'])) {
		candidates.add(AnalysisQuestion.WalkPattern);
	}
	if (query.includes('体重') && hasAny(query, ['最近', '変化', '増減', '最新'])) {
		candidates.add(AnalysisQuestion.WeightTrend);
	}
	if (hasHospital
		&& hasAny(query, ['記録', 'まとめ', '回数', '費用', '最後'])
		&& !hasAny(query, ['受診前', '病院前', '病院の前', '受診の前'])) {
		candidates.add(AnalysisQuestion.HospitalSummary);
	}
	if (hasAny(query, ['ケア', 'お手入れ']) && hasAny(query, ['記録', '件数', 'まとめ'])) {
		candidates.add(AnalysisQuestion.CareSummary);
	}
	if (query.includes('メモ') && hasAny(query, ['言葉', '注目語', 'よく含まれる', '多い'])) {
		candidates.add(AnalysisQuestion.MemoKeywords);
	}

	return [...candidates];
}

function findKeywordMatches(
	query: string,
	availableKeywords: readonly MemoKeywordDefinition[],
): KeywordMatch[] {
	const matches = availableKeywords.flatMap((keyword) => {
		const patterns = keyword.patterns
			.map(normalizeQuery)
			.filter((pattern) => pattern && query.includes(pattern))
			.sort((a, b) => b.length - a.length);
		return patterns[0] ? [{ keyword, matchedPattern: patterns[0] }] : [];
	});

	return matches.filter((match) => !matches.some((other) =>
		other.keyword.id !== match.keyword.id
		&& other.matchedPattern.length > match.matchedPattern.length
		&& other.matchedPattern.includes(match.matchedPattern),
	));
}

function normalizeQuery(value: string) {
	return value.normalize('NFKC').toLowerCase().trim().replace(/[\s　]+/g, '');
}

function hasAny(value: string, patterns: readonly string[]) {
	return patterns.some((pattern) => value.includes(pattern));
}
