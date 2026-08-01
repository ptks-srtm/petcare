import { Lightbulb } from 'lucide-react';
import type { TrendInsightEvaluation } from '../types/trendInsights';
import { LOG_TYPE_META } from '../utils/logTypeMeta';
import { LogTypeIcon } from './LogTypeIcon';

export function TrendInsights({ evaluation }: { evaluation: TrendInsightEvaluation }) {
	const emptyMessage = evaluation.hasSufficientData
		? 'この期間に、設定した基準以上の変化はありません。'
		: '記録が増えると、前の期間との変化を確認できます。';
	return <section aria-labelledby="trend-insights-title" className="pc-card p-5">
		<div className="flex items-center gap-3">
			<span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><Lightbulb size={21} strokeWidth={1.8} /></span>
			<div className="min-w-0"><h2 id="trend-insights-title" className="text-lg font-semibold text-slate-800">記録からの気づき</h2><p className="mt-1 text-xs leading-relaxed text-text-secondary">記録上の変化を表示しています。健康状態を判断するものではありません。</p></div>
		</div>
		{evaluation.insights.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-border-soft bg-brand-subtle/55 px-4 py-5 text-center text-sm leading-relaxed text-text-secondary">{emptyMessage}</p> : <ul className="mt-4 divide-y divide-border-soft">{evaluation.insights.map((insight) => <li key={insight.id} className="flex min-w-0 items-start gap-3 py-4 first:pt-0 last:pb-0"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><LogTypeIcon kind={insight.kind} size={20} /></span><div className="min-w-0"><p className="text-xs font-semibold text-brand-blue">{LOG_TYPE_META[insight.kind].label}</p><p className="mt-1 break-words text-sm leading-6 text-slate-600">{insight.message}</p></div></li>)}</ul>}
	</section>;
}
