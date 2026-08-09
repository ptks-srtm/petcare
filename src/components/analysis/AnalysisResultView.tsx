import { AnalysisQuestion, type AnalysisQuestion as AnalysisQuestionValue, type AnalysisResult } from '../../types/analysis';

export function AnalysisResultView({ result, selectedQuestion, resultSource }: {
	result: AnalysisResult | null;
	selectedQuestion: AnalysisQuestionValue | null;
	resultSource: 'free' | 'fixed' | null;
}) {
	return <div className="mt-5 min-w-0 rounded-2xl border border-border-soft bg-slate-50/70 p-4 [overflow-wrap:anywhere]" aria-live="polite" aria-atomic="true">
		{result ? <>
			<h3 className="text-base font-semibold text-slate-800">{result.title}</h3>
			<p className="mt-2 break-words text-sm font-medium leading-relaxed text-slate-700">{result.summary}</p>
			{result.description && <p className="mt-2 break-words text-xs leading-relaxed text-slate-500">{result.description}</p>}
			{result.facts.length > 0 && <ul className="mt-4 divide-y divide-slate-200/70 border-y border-slate-200/70 text-sm leading-relaxed text-slate-600">{result.facts.map((fact) => <li key={fact} className="break-words py-2.5">{fact}</li>)}</ul>}
			{result.note && <div className="mt-3 text-xs leading-relaxed text-slate-500"><p className="font-semibold text-slate-600">補足</p><p className="mt-1 break-words">{result.note}</p></div>}
			{result.meta !== undefined
				? result.meta.length > 0 && <dl className="mt-4 space-y-1 border-t border-slate-200/70 pt-3 text-xs text-slate-500">{result.meta.map((item) => <div key={item.label} className="flex flex-wrap gap-x-1"><dt>{item.label}：</dt><dd>{item.value}</dd></div>)}</dl>
				: <p className="mt-4 border-t border-slate-200/70 pt-3 text-xs text-slate-500">対象件数：{result.relatedLogs}件</p>}
			{!result.hasEnoughData && <div className="mt-4 rounded-xl border border-border-soft bg-white px-3 py-3 text-sm leading-relaxed text-slate-600"><p>記録が増えると分析できる内容が増えます。</p><a href="/#new-log-title" className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-blue focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">記録する</a></div>}
		</> : <p className="text-sm leading-relaxed text-slate-500">{selectedQuestion === AnalysisQuestion.MemoKeywordDays
			? '注目語を選択してください。'
			: resultSource === 'free'
				? '質問を具体的に入力すると、対応する記録分析を表示します。'
				: '質問を入力するか、質問例から選んでください。'}</p>}
	</div>;
}
