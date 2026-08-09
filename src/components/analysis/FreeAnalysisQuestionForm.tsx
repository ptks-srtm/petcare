import type { SyntheticEvent } from 'react';

export function FreeAnalysisQuestionForm({ query, error, maxLength, onQueryChange, onSubmit }: {
	query: string;
	error: string | null;
	maxLength: number;
	onQueryChange: (value: string) => void;
	onSubmit: () => void;
}) {
	function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		onSubmit();
	}

	return <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-border-soft bg-brand-subtle/60 p-4" aria-labelledby="free-analysis-query-title">
		<label id="free-analysis-query-title" htmlFor="free-analysis-query" className="block text-sm font-semibold text-slate-700">記録について質問</label>
		<div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
			<input
				id="free-analysis-query"
				type="text"
				value={query}
				maxLength={maxLength}
				onChange={(event) => onQueryChange(event.target.value)}
				aria-invalid={Boolean(error)}
				aria-describedby={`free-analysis-query-help${error ? ' free-analysis-query-error' : ''}`}
				placeholder="最近のさんぽ時間は？"
				className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20"
			/>
			<button type="submit" className="pc-button-primary min-h-11 px-5 text-sm">調べる</button>
		</div>
		<div className="mt-1.5 flex items-start justify-between gap-3 text-xs text-slate-500">
			<p id="free-analysis-query-help" className="leading-relaxed">見たい記録を短い言葉で入力すると、対応する分析を表示します。</p>
			<span className="shrink-0 tabular-nums text-slate-400">{query.length}/{maxLength}</span>
		</div>
		{error && <p id="free-analysis-query-error" role="alert" className="mt-2 break-words text-sm font-medium leading-relaxed text-danger-strong">{error}</p>}
	</form>;
}
