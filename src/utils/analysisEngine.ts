import { AnalysisQuestion, type AnalysisData, type AnalysisEngine, type AnalysisRequest, type AnalysisResult } from '../types/analysis.ts';
import { getLocalDayRange, isWithinRange } from './healthSummary.ts';
import { analyzeBeforeLatestHospital, analyzeCoprophagiaDays, analyzeMemoKeywordDays, analyzeNoMealDays } from './conditionalAnalysis.ts';
import { countMemoKeywords, getMemoKeyword } from './memoKeywords.ts';

export const INSUFFICIENT_ANALYSIS_MESSAGE = '分析できる記録がまだ十分ではありません。';
export const LIMITED_SAMPLE_MESSAGE = '記録数が少ないため、参考としてご覧ください。';

const titles: Record<AnalysisQuestion, string> = {
	[AnalysisQuestion.PoopTime]: '食糞が記録された時間',
	[AnalysisQuestion.PoopPlace]: '食糞が記録された場所',
	[AnalysisQuestion.PoopState]: 'うんちの状態',
	[AnalysisQuestion.MealPattern]: 'ごはんの回数',
	[AnalysisQuestion.WalkPattern]: 'さんぽ時間',
	[AnalysisQuestion.WeightTrend]: '最近の体重変化',
	[AnalysisQuestion.HospitalSummary]: '病院の記録',
	[AnalysisQuestion.CareSummary]: 'ケアの記録',
	[AnalysisQuestion.MemoKeywords]: 'メモでよく記録されていること',
	[AnalysisQuestion.CoprophagiaDaySummary]: '食糞ありの日の記録',
	[AnalysisQuestion.NoMealDaySummary]: 'ごはんを食べなかった日の記録',
	[AnalysisQuestion.BeforeLatestHospital]: '最新の病院受診前の記録',
	[AnalysisQuestion.MemoKeywordDays]: 'メモの言葉から見る記録',
};

export const analysisEngine: AnalysisEngine = {
	analyze(question, data, options = {}) {
		const referenceDate = options.referenceDate ?? new Date();
		switch (question) {
			case AnalysisQuestion.PoopTime:
				return analyzeCoprophagiaTime(data);
			case AnalysisQuestion.PoopPlace:
				return analyzeCoprophagiaPlace(data);
			case AnalysisQuestion.WeightTrend:
				return analyzeWeightTrend(data, referenceDate);
			case AnalysisQuestion.MealPattern:
				return analyzeMealPattern(data, referenceDate);
			case AnalysisQuestion.WalkPattern:
				return analyzeWalkPattern(data, referenceDate);
			case AnalysisQuestion.MemoKeywords:
				return analyzeMemoKeywords(data);
			case AnalysisQuestion.PoopState:
				return analyzePoopState(data);
			case AnalysisQuestion.HospitalSummary:
				return analyzeHospitalSummary(data);
			case AnalysisQuestion.CareSummary:
				return analyzeCareSummary(data);
			case AnalysisQuestion.CoprophagiaDaySummary:
				return analyzeCoprophagiaDays(data);
			case AnalysisQuestion.NoMealDaySummary:
				return analyzeNoMealDays(data);
			case AnalysisQuestion.BeforeLatestHospital:
				return analyzeBeforeLatestHospital(data);
			case AnalysisQuestion.MemoKeywordDays:
				return parameterRequiredResult();
			default:
				return insufficientResult(titles[question]);
		}
	},
	analyzeRequest(request: AnalysisRequest, data: AnalysisData, options = {}) {
		if (request.question === AnalysisQuestion.MemoKeywordDays) {
			const keyword = getMemoKeyword(request.keywordId);
			if (!keyword) return parameterRequiredResult();
			return analyzeMemoKeywordDays(data, keyword.id);
		}
		return analysisEngine.analyze(request.question, data, options);
	},
};

function parameterRequiredResult(): AnalysisResult {
	return {
		title: titles[AnalysisQuestion.MemoKeywordDays],
		summary: INSUFFICIENT_ANALYSIS_MESSAGE,
		facts: [],
		relatedLogs: 0,
		hasEnoughData: false,
		meta: [],
	};
}

function analyzeCoprophagiaTime(data: AnalysisData): AnalysisResult {
	const logs = data.poopLogs.filter((log) => log.coprophagia && isValidDate(log.datetime));
	if (logs.length < 2) return insufficientResult(titles[AnalysisQuestion.PoopTime], logs.length);

	const counts = new Map<number, number>();
	for (const log of logs) {
		const hour = new Date(log.datetime).getHours();
		counts.set(hour, (counts.get(hour) ?? 0) + 1);
	}
	const maximum = Math.max(...counts.values());
	const topHours = [...counts.entries()].filter(([, count]) => count === maximum).map(([hour]) => hour).sort((a, b) => a - b);
	const labels = topHours.map((hour) => `${hour}時台`);
	const summary = labels.length === 1
		? `食糞ありの記録では、${labels[0]}が${maximum}件で最も多くなっています。`
		: `食糞ありの記録では、${joinJapaneseList(labels)}がそれぞれ${maximum}件で最も多くなっています。`;

	return {
		title: titles[AnalysisQuestion.PoopTime],
		summary,
		facts: [...counts.entries()].sort(([a], [b]) => a - b).map(([hour, count]) => `食糞あり・${hour}時台：${count}件`),
		relatedLogs: logs.length,
		hasEnoughData: true,
		note: logs.length === 2 ? LIMITED_SAMPLE_MESSAGE : undefined,
	};
}

function analyzeCoprophagiaPlace(data: AnalysisData): AnalysisResult {
	const logs = data.poopLogs.filter((log) => log.coprophagia && log.location.trim().length > 0);
	if (logs.length < 2) return insufficientResult(titles[AnalysisQuestion.PoopPlace], logs.length);

	const counts = new Map<string, number>();
	for (const log of logs) counts.set(log.location, (counts.get(log.location) ?? 0) + 1);
	const maximum = Math.max(...counts.values());
	const topPlaces = [...counts.entries()].filter(([, count]) => count === maximum).map(([place]) => place).sort((a, b) => a.localeCompare(b, 'ja'));
	const summary = topPlaces.length === 1
		? `食糞ありの記録では、${topPlaces[0]}が${maximum}件で最も多くなっています。`
		: `食糞ありの記録では、${joinJapaneseList(topPlaces)}がそれぞれ${maximum}件で最も多くなっています。`;

	return {
		title: titles[AnalysisQuestion.PoopPlace],
		summary,
		facts: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja')).map(([place, count]) => `食糞あり・${place}：${count}件`),
		relatedLogs: logs.length,
		hasEnoughData: true,
		note: logs.length === 2 ? LIMITED_SAMPLE_MESSAGE : undefined,
	};
}

function analyzeWeightTrend(data: AnalysisData, referenceDate: Date): AnalysisResult {
	const { start, end } = getLocalDayRange(referenceDate, 30);
	const logs = data.weightLogs
		.filter((log) => isWithinRange(log.datetime, start, end))
		// 同一日時は既存の保存配列順を維持する。createdAt等を導入する場合に再検討する。
		.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
	if (logs.length < 2) return insufficientResult(titles[AnalysisQuestion.WeightTrend], logs.length);

	const oldest = logs[0];
	const latest = logs[logs.length - 1];
	const difference = normalizeDecimal(latest.weightKg - oldest.weightKg);
	const summary = difference > 0
		? `30日間で${formatWeight(difference)}kg増えています。`
		: difference < 0
			? `30日間で${formatWeight(Math.abs(difference))}kg減っています。`
			: '30日間で体重の差はありません。';

	return {
		title: titles[AnalysisQuestion.WeightTrend],
		summary,
		facts: [`最初の記録：${formatWeight(oldest.weightKg)}kg`, `最新の記録：${formatWeight(latest.weightKg)}kg`, `差分：${difference > 0 ? '+' : ''}${formatWeight(difference)}kg`],
		relatedLogs: logs.length,
		hasEnoughData: true,
		note: logs.length === 2 ? LIMITED_SAMPLE_MESSAGE : undefined,
	};
}

function analyzeMealPattern(data: AnalysisData, referenceDate: Date): AnalysisResult {
	const { start, end } = getLocalDayRange(referenceDate, 7);
	const logs = data.mealLogs.filter((log) => isWithinRange(log.datetime, start, end));
	if (logs.length === 0) return insufficientResult(titles[AnalysisQuestion.MealPattern]);
	const average = logs.length / 7;
	return {
		title: titles[AnalysisQuestion.MealPattern],
		summary: `直近7日間に${logs.length}件、1日平均${formatAverage(average)}件のごはんが記録されています。`,
		facts: [`総回数：${logs.length}件`, `1日平均：${formatAverage(average)}件`],
		relatedLogs: logs.length,
		hasEnoughData: true,
	};
}

function analyzeWalkPattern(data: AnalysisData, referenceDate: Date): AnalysisResult {
	const { start, end } = getLocalDayRange(referenceDate, 7);
	const logs = data.walkLogs.filter((log) => isWithinRange(log.datetime, start, end));
	if (logs.length === 0) return insufficientResult(titles[AnalysisQuestion.WalkPattern]);
	const total = logs.reduce((sum, log) => sum + log.durationMinutes, 0);
	const average = total / logs.length;
	return {
		title: titles[AnalysisQuestion.WalkPattern],
		summary: `直近7日間のさんぽは合計${total}分、1回平均${formatAverage(average)}分です。`,
		facts: [`合計時間：${total}分`, `記録回数：${logs.length}回`, `1回平均：${formatAverage(average)}分`],
		relatedLogs: logs.length,
		hasEnoughData: true,
	};
}

function analyzeMemoKeywords(data: AnalysisData): AnalysisResult {
	const memos = [
		...data.poopLogs.map((log) => log.memo),
		...data.mealLogs.map((log) => log.memo),
		...data.walkLogs.map((log) => log.memo),
		...data.hospitalLogs.map((log) => log.memo),
		...data.medicationLogs.map((log) => log.memo),
		...data.vaccineLogs.map((log) => log.memo),
		...data.groomingLogs.map((log) => log.memo),
	].filter((memo): memo is string => typeof memo === 'string' && memo.trim().length > 0);
	if (memos.length < 2) return insufficientResult(titles[AnalysisQuestion.MemoKeywords], memos.length);

	const keywords = countMemoKeywords(memos);
	if (keywords.length === 0) return insufficientResult(titles[AnalysisQuestion.MemoKeywords], memos.length);
	const maximum = keywords[0].count;
	const topLabels = keywords.filter((keyword) => keyword.count === maximum).map((keyword) => `「${keyword.label}」`);
	const summary = topLabels.length === 1
		? `保存されているメモでは、${topLabels[0]}を含む記録が${maximum}件で最も多くなっています。`
		: `保存されているメモでは、${joinJapaneseList(topLabels)}を含む記録がそれぞれ${maximum}件で最も多くなっています。`;

	return {
		title: titles[AnalysisQuestion.MemoKeywords],
		summary,
		facts: keywords.map((keyword) => `「${keyword.label}」を含むメモ：${keyword.count}件`),
		relatedLogs: memos.length,
		hasEnoughData: true,
		note: 'PetCareで定義した言葉がメモに含まれる件数を集計しています。',
	};
}

function analyzePoopState(data: AnalysisData): AnalysisResult {
	const logs = [...data.poopLogs]
		.filter((log) => isValidDate(log.datetime))
		.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
		.slice(0, 30);
	if (logs.length === 0) return insufficientResult(titles[AnalysisQuestion.PoopState]);

	const conditionLabels = { normal: 'ふつう', soft: 'やわらかめ', hard: 'かため' } as const;
	const conditions = ['normal', 'soft', 'hard'] as const;
	return {
		title: titles[AnalysisQuestion.PoopState],
		summary: `直近${logs.length}件のうんち状態を集計しました。`,
		facts: conditions.map((condition) => {
			const count = logs.filter((log) => log.condition === condition).length;
			return `${conditionLabels[condition]}：${count}件（${Math.round(count / logs.length * 100)}%）`;
		}),
		relatedLogs: logs.length,
		hasEnoughData: true,
	};
}

function analyzeHospitalSummary(data: AnalysisData): AnalysisResult {
	const logs = [...data.hospitalLogs]
		.filter((log) => isValidDate(log.datetime))
		.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
	if (logs.length === 0) return insufficientResult(titles[AnalysisQuestion.HospitalSummary]);

	const costLogs = logs.filter((log) => log.costYen !== undefined);
	const facts = [
		`受診回数：${logs.length}件`,
		`最後の受診日：${formatAnalysisDate(logs[0].datetime)}`,
		...(costLogs.length > 0
			? [`医療費合計：${formatYen(costLogs.reduce((total, log) => total + (log.costYen ?? 0), 0))}`, `費用入力：${costLogs.length}件`]
			: ['医療費：記録なし']),
	];
	return {
		title: titles[AnalysisQuestion.HospitalSummary],
		summary: `保存されている病院の記録は${logs.length}件です。`,
		facts,
		relatedLogs: logs.length,
		hasEnoughData: true,
	};
}

function analyzeCareSummary(data: AnalysisData): AnalysisResult {
	const counts = [
		['お薬', data.medicationLogs.length],
		['ワクチン', data.vaccineLogs.length],
		['体重', data.weightLogs.length],
		['お手入れ', data.groomingLogs.length],
	] as const;
	const total = counts.reduce((sum, [, count]) => sum + count, 0);
	if (total === 0) return insufficientResult(titles[AnalysisQuestion.CareSummary]);

	return {
		title: titles[AnalysisQuestion.CareSummary],
		summary: `保存されているケアの記録は合計${total}件です。`,
		facts: counts.map(([label, count]) => `${label}：${count}件`),
		relatedLogs: total,
		hasEnoughData: true,
	};
}

function insufficientResult(title: string, relatedLogs = 0): AnalysisResult {
	return { title, summary: INSUFFICIENT_ANALYSIS_MESSAGE, facts: [], relatedLogs, hasEnoughData: false };
}

function isValidDate(datetime: string) {
	return !Number.isNaN(new Date(datetime).getTime());
}

function normalizeDecimal(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatWeight(value: number) {
	return new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 }).format(value);
}

function formatAverage(value: number) {
	return new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatAnalysisDate(datetime: string) {
	return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(datetime));
}

function formatYen(value: number) {
	return `${new Intl.NumberFormat('ja-JP').format(value)}円`;
}

function joinJapaneseList(values: readonly string[]) {
	if (values.length <= 1) return values[0] ?? '';
	if (values.length === 2) return `${values[0]}と${values[1]}`;
	return `${values.slice(0, -1).join('、')}と${values.at(-1)}`;
}
