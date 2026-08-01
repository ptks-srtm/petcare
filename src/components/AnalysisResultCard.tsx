import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { AnalysisQuestion, type AnalysisData, type AnalysisResult } from '../types/analysis';
import { analysisEngine } from '../utils/analysisEngine';

const questions = [
	{ value: AnalysisQuestion.PoopTime, label: '食糞しやすい時間は？' },
	{ value: AnalysisQuestion.PoopPlace, label: '食糞しやすい場所は？' },
	{ value: AnalysisQuestion.PoopState, label: '最近のうんち状態は？' },
	{ value: AnalysisQuestion.MealPattern, label: '最近のごはん回数は？' },
	{ value: AnalysisQuestion.WalkPattern, label: '最近のさんぽ時間は？' },
	{ value: AnalysisQuestion.WeightTrend, label: '最近の体重変化は？' },
	{ value: AnalysisQuestion.MemoKeywords, label: 'メモによく含まれる言葉は？' },
	{ value: AnalysisQuestion.HospitalSummary, label: '病院の記録をまとめると？' },
	{ value: AnalysisQuestion.CareSummary, label: 'ケアの記録件数は？' },
] as const;

export function AnalysisResultCard({ data }: { data: AnalysisData }) {
	const [result, setResult] = useState<AnalysisResult | null>(null);
	const [selectedQuestion, setSelectedQuestion] = useState<AnalysisQuestion | null>(null);

	function handleAnalyze(question: AnalysisQuestion) {
		setSelectedQuestion(question);
		setResult(analysisEngine.analyze(question, data));
	}

	return <section aria-labelledby="analysis-result-title" className="pc-card p-5">
		<div className="flex items-start gap-3">
			<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary" aria-hidden="true"><BarChart3 size={20} /></span>
			<div>
				<h2 id="analysis-result-title" className="text-lg font-semibold text-slate-800">分析結果</h2>
				<p className="mt-1 text-sm leading-relaxed text-slate-500">AIを使わず、このブラウザに保存された記録だけを集計します。</p>
			</div>
		</div>

		<div className="mt-4 grid gap-2" aria-label="分析する質問">
			{questions.map((question) => <button
				key={question.value}
				type="button"
				aria-pressed={selectedQuestion === question.value}
				onClick={() => handleAnalyze(question.value)}
				className={`min-h-11 rounded-xl border px-4 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky ${selectedQuestion === question.value ? 'border-brand-sky bg-brand-subtle text-brand-primary' : 'border-border-soft bg-white text-slate-700 hover:bg-slate-50'}`}
			>
				{question.label}
			</button>)}
		</div>

		<div className="mt-4 min-w-0 rounded-2xl border border-border-soft bg-slate-50/70 p-4 [overflow-wrap:anywhere]" aria-live="polite" aria-atomic="true">
			{result ? <>
				<h3 className="text-sm font-semibold text-slate-800">{result.title}</h3>
				<p className="mt-2 break-words text-sm leading-relaxed text-slate-700">{result.summary}</p>
				{result.facts.length > 0 && <ul className="mt-3 space-y-1.5 text-sm text-slate-600">{result.facts.map((fact) => <li key={fact} className="break-words">・{fact}</li>)}</ul>}
				{result.note && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-relaxed text-slate-500">{result.note}</p>}
				<p className="mt-3 text-xs text-slate-500">対象件数：{result.relatedLogs}件</p>
			</> : <p className="text-sm leading-relaxed text-slate-500">質問を選ぶと、ここに分析結果を表示します。</p>}
		</div>
	</section>;
}
