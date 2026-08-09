import { BarChart3 } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { AnalysisQuestion, type AnalysisData, type AnalysisResult } from '../types/analysis';
import { analysisEngine } from '../utils/analysisEngine';
import { ANALYSIS_QUERY_MAX_LENGTH, routeAnalysisQuery, type AnalysisRouteFailureReason } from '../utils/analysisQueryRouter';
import { getAllMemoKeywords, getMemoKeyword, type MemoKeywordId } from '../utils/memoKeywords';

const questionGroups = [
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

const routeErrorMessages: Record<AnalysisRouteFailureReason, string> = {
	empty: '質問を入力してください。',
	too_long: '質問は100文字以内で入力してください。',
	unsupported: 'この質問にはまだ対応していません。「食糞」「ごはん」「さんぽ」「体重」「病院」「メモの言葉」などを含めて、もう少し具体的に入力してください。',
	ambiguous: '複数の記録が含まれています。今回は、確認したい記録を1つに絞って入力してください。',
	medical: 'この機能では診断や受診判断には回答できません。保存された記録の件数や変化を確認する質問を入力してください。',
};

export function AnalysisResultCard({ data }: { data: AnalysisData }) {
	const [result, setResult] = useState<AnalysisResult | null>(null);
	const [selectedQuestion, setSelectedQuestion] = useState<AnalysisQuestion | null>(null);
	const [selectedKeywordId, setSelectedKeywordId] = useState<MemoKeywordId | null>(null);
	const [keywords] = useState(getAllMemoKeywords);
	const [freeQuery, setFreeQuery] = useState('');
	const [freeQueryError, setFreeQueryError] = useState<string | null>(null);
	const [resultSource, setResultSource] = useState<'free' | 'fixed' | null>(null);

	function handleFreeQuerySubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		const route = routeAnalysisQuery(freeQuery, keywords);
		setSelectedQuestion(null);
		setResultSource('free');
		if (route.kind === 'unknown') {
			setResult(null);
			setFreeQueryError(routeErrorMessages[route.reason]);
			return;
		}
		setFreeQueryError(null);
		setResult(analysisEngine.analyzeRequest(route.request, data));
	}

	function handleAnalyze(question: AnalysisQuestion) {
		setSelectedQuestion(question);
		setResultSource('fixed');
		setFreeQueryError(null);
		if (question === AnalysisQuestion.MemoKeywordDays) {
			setResult(selectedKeywordId
				? analysisEngine.analyzeRequest({ question, keywordId: selectedKeywordId }, data)
				: null);
			return;
		}
		setResult(analysisEngine.analyze(question, data));
	}

	function handleKeywordChange(value: string) {
		setResultSource('fixed');
		setFreeQueryError(null);
		const keyword = getMemoKeyword(value, keywords);
		if (!keyword) {
			setSelectedKeywordId(null);
			setResult(null);
			return;
		}
		const keywordId = keyword.id as MemoKeywordId;
		setSelectedKeywordId(keywordId);
		setResult(analysisEngine.analyzeRequest({ question: AnalysisQuestion.MemoKeywordDays, keywordId }, data));
	}

	return <section aria-labelledby="analysis-result-title" className="pc-card p-5">
		<div className="flex items-start gap-3">
			<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary" aria-hidden="true"><BarChart3 size={20} /></span>
			<div>
				<h2 id="analysis-result-title" className="text-lg font-semibold text-slate-800">分析結果</h2>
				<p className="mt-1 text-sm leading-relaxed text-slate-500">AIを使わず、このブラウザに保存された記録だけを集計します。</p>
			</div>
		</div>

		<form onSubmit={handleFreeQuerySubmit} className="mt-5 rounded-2xl border border-border-soft bg-brand-subtle/60 p-4" aria-labelledby="free-analysis-query-title">
			<label id="free-analysis-query-title" htmlFor="free-analysis-query" className="block text-sm font-semibold text-slate-700">記録について質問</label>
			<div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
				<input
					id="free-analysis-query"
					type="text"
					value={freeQuery}
					maxLength={ANALYSIS_QUERY_MAX_LENGTH}
					onChange={(event) => { setFreeQuery(event.target.value); setFreeQueryError(null); }}
					aria-invalid={Boolean(freeQueryError)}
					aria-describedby={`free-analysis-query-help${freeQueryError ? ' free-analysis-query-error' : ''}`}
					placeholder="最近のさんぽ時間は？"
					className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20"
				/>
				<button type="submit" className="pc-button-primary min-h-11 px-5 text-sm">調べる</button>
			</div>
			<div className="mt-1.5 flex items-start justify-between gap-3 text-xs text-slate-500">
				<p id="free-analysis-query-help" className="leading-relaxed">短い質問文を、ブラウザ内のルールで既存分析へ振り分けます。</p>
				<span className="shrink-0 tabular-nums text-slate-400">{freeQuery.length}/{ANALYSIS_QUERY_MAX_LENGTH}</span>
			</div>
			{freeQueryError && <p id="free-analysis-query-error" role="alert" className="mt-2 break-words text-sm font-medium leading-relaxed text-danger-strong">{freeQueryError}</p>}
		</form>

		<div className="mt-4 space-y-4" aria-label="分析する質問">
			{questionGroups.map((group) => <fieldset key={group.label} className="min-w-0">
				<legend className="mb-2 text-sm font-semibold text-slate-700">{group.label}</legend>
				<div className="grid min-w-0 gap-2">
					{group.questions.map((question) => <div key={question.value} className="min-w-0">
						<button
							type="button"
							aria-pressed={selectedQuestion === question.value}
							onClick={() => handleAnalyze(question.value)}
							className={`min-h-11 w-full rounded-xl border px-4 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky ${selectedQuestion === question.value ? 'border-brand-sky bg-brand-subtle text-brand-primary' : 'border-border-soft bg-white text-slate-700 hover:bg-slate-50'}`}
						>
							{question.label}
						</button>
						{question.value === AnalysisQuestion.MemoKeywordDays && selectedQuestion === question.value && <div className="mt-2 min-w-0 rounded-xl border border-border-soft bg-white p-3">
							<label htmlFor="analysis-memo-keyword" className="mb-1.5 block text-sm font-semibold text-slate-700">注目語</label>
							<select
								id="analysis-memo-keyword"
								value={selectedKeywordId ?? ''}
								onChange={(event) => handleKeywordChange(event.target.value)}
								className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-border-soft bg-white px-3 text-base text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky"
							>
								<option value="">注目語を選択</option>
								{keywords.map((keyword) => <option key={keyword.id} value={keyword.id}>{keyword.label}</option>)}
							</select>
						</div>}
					</div>)}
				</div>
			</fieldset>)}
		</div>

		<div className="mt-4 min-w-0 rounded-2xl border border-border-soft bg-slate-50/70 p-4 [overflow-wrap:anywhere]" aria-live="polite" aria-atomic="true">
			{result ? <>
				<h3 className="text-sm font-semibold text-slate-800">{result.title}</h3>
				<p className="mt-2 break-words text-sm leading-relaxed text-slate-700">{result.summary}</p>
				{result.description && <p className="mt-2 break-words text-xs leading-relaxed text-slate-500">{result.description}</p>}
				{result.facts.length > 0 && <ul className="mt-3 space-y-1.5 text-sm text-slate-600">{result.facts.map((fact) => <li key={fact} className="break-words">・{fact}</li>)}</ul>}
				{result.note && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-relaxed text-slate-500">{result.note}</p>}
				{result.meta !== undefined
					? result.meta.length > 0 && <dl className="mt-3 space-y-1 text-xs text-slate-500">{result.meta.map((item) => <div key={item.label} className="flex flex-wrap gap-x-1"><dt>{item.label}：</dt><dd>{item.value}</dd></div>)}</dl>
					: <p className="mt-3 text-xs text-slate-500">対象件数：{result.relatedLogs}件</p>}
			</> : <p className="text-sm leading-relaxed text-slate-500">{selectedQuestion === AnalysisQuestion.MemoKeywordDays
				? '注目語を選択してください。'
				: resultSource === 'free'
					? '質問を具体的に入力すると、対応する記録分析を表示します。'
					: '質問を選ぶと、ここに分析結果を表示します。'}</p>}
		</div>
	</section>;
}
