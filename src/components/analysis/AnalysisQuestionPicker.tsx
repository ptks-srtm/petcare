import { ChevronDown } from 'lucide-react';
import { AnalysisQuestion, type AnalysisQuestion as AnalysisQuestionValue } from '../../types/analysis';
import type { MemoKeywordDefinition, MemoKeywordId } from '../../utils/memoKeywords';
import { ANALYSIS_QUESTION_GROUPS } from './analysisQuestionGroups';

export function AnalysisQuestionPicker({ selectedQuestion, selectedKeywordId, keywords, onAnalyze, onKeywordChange }: {
	selectedQuestion: AnalysisQuestionValue | null;
	selectedKeywordId: MemoKeywordId | null;
	keywords: readonly MemoKeywordDefinition[];
	onAnalyze: (question: AnalysisQuestionValue) => void;
	onKeywordChange: (value: string) => void;
}) {
	return <div className="mt-5 min-w-0">
		<h3 className="px-1 text-sm font-semibold text-slate-700">質問例から選ぶ</h3>
		<div className="mt-2 space-y-2">
			{ANALYSIS_QUESTION_GROUPS.map((group) => <details key={group.label} className="group min-w-0 overflow-hidden rounded-2xl border border-border-soft bg-white">
				<summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-sky [&::-webkit-details-marker]:hidden">
					<span>{group.label}（{group.questions.length}）</span>
					<ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
				</summary>
				<fieldset className="border-t border-slate-100 px-3 pt-3 pb-4">
					<legend className="sr-only">{group.label}の質問</legend>
					<div className="grid min-w-0 gap-2">
						{group.questions.map((question) => <div key={question.value} className="min-w-0">
							<button
								type="button"
								aria-pressed={selectedQuestion === question.value}
								onClick={() => onAnalyze(question.value)}
								className={`min-h-11 w-full rounded-xl border px-4 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky ${selectedQuestion === question.value ? 'border-brand-sky bg-brand-subtle text-brand-primary' : 'border-border-soft bg-white text-slate-700 hover:bg-slate-50'}`}
							>
								{question.label}
							</button>
							{question.value === AnalysisQuestion.MemoKeywordDays && selectedQuestion === question.value && <div className="mt-2 min-w-0 rounded-xl border border-border-soft bg-brand-subtle/35 p-3">
								<label htmlFor="analysis-memo-keyword" className="mb-1.5 block text-sm font-semibold text-slate-700">注目語</label>
								<select
									id="analysis-memo-keyword"
									value={selectedKeywordId ?? ''}
									onChange={(event) => onKeywordChange(event.target.value)}
									className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-border-soft bg-white px-3 text-base text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky"
								>
									<option value="">注目語を選択</option>
									{keywords.map((keyword) => <option key={keyword.id} value={keyword.id}>{keyword.label}</option>)}
								</select>
							</div>}
						</div>)}
					</div>
				</fieldset>
			</details>)}
		</div>
	</div>;
}
