import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { AnalysisQuestion, type AnalysisData, type AnalysisResult } from '../types/analysis';
import { analysisEngine } from '../utils/analysisEngine';
import { ANALYSIS_QUERY_MAX_LENGTH, routeAnalysisQuery, type AnalysisRouteFailureReason } from '../utils/analysisQueryRouter';
import { getAllMemoKeywords, getMemoKeyword, type MemoKeywordId } from '../utils/memoKeywords';
import { AnalysisQuestionPicker } from './analysis/AnalysisQuestionPicker';
import { AnalysisResultView } from './analysis/AnalysisResultView';
import { FreeAnalysisQuestionForm } from './analysis/FreeAnalysisQuestionForm';

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

	function handleFreeQuerySubmit() {
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
				<h2 id="analysis-result-title" className="text-lg font-semibold text-slate-800">記録を分析</h2>
				<p className="mt-1 text-sm leading-relaxed text-slate-500">AIを使わず、このブラウザに保存された記録だけを集計します。</p>
			</div>
		</div>

		<FreeAnalysisQuestionForm
			query={freeQuery}
			error={freeQueryError}
			maxLength={ANALYSIS_QUERY_MAX_LENGTH}
			onQueryChange={(value) => { setFreeQuery(value); setFreeQueryError(null); }}
			onSubmit={handleFreeQuerySubmit}
		/>
		<AnalysisQuestionPicker selectedQuestion={selectedQuestion} selectedKeywordId={selectedKeywordId} keywords={keywords} onAnalyze={handleAnalyze} onKeywordChange={handleKeywordChange} />
		<AnalysisResultView result={result} selectedQuestion={selectedQuestion} resultSource={resultSource} />
	</section>;
}
