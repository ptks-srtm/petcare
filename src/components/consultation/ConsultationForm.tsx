import type { SyntheticEvent } from 'react';
import type { ConsultationTopic } from '../../types/consultation';

const topics: { value: ConsultationTopic; label: string }[] = [
	{ value: 'poop', label: 'うんちについて' },
	{ value: 'meal', label: 'ごはんについて' },
	{ value: 'walk', label: 'さんぽについて' },
	{ value: 'overall', label: '全体的な体調について' },
	{ value: 'other', label: 'その他' },
];

export function ConsultationForm({ topic, concern, isSubmitting, error, onTopicChange, onConcernChange, onSubmit }: {
	topic: ConsultationTopic | null;
	concern: string;
	isSubmitting: boolean;
	error: string | null;
	onTopicChange: (topic: ConsultationTopic) => void;
	onConcernChange: (concern: string) => void;
	onSubmit: () => void;
}) {
	function handleSubmit(event: SyntheticEvent<HTMLFormElement>) { event.preventDefault(); onSubmit(); }
	const canSubmit = Boolean(topic && concern.trim()) && !isSubmitting;
	return (
		<form onSubmit={handleSubmit} className="pc-card p-5" aria-labelledby="consult-form-title">
			<h2 id="consult-form-title" className="text-xl font-semibold text-slate-800">相談内容</h2>
			<fieldset aria-required="true" className="mt-5"><legend className="text-sm font-semibold text-slate-700">相談テーマ</legend><div className="mt-2 grid grid-cols-2 gap-2">{topics.map((item, index) => <label key={item.value} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-sm font-semibold transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-sky ${topic === item.value ? 'pc-choice-selected' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} ${item.value === 'overall' ? 'col-span-2' : ''}`}><input required={index === 0} type="radio" name="consultation-topic" value={item.value} checked={topic === item.value} onChange={() => onTopicChange(item.value)} className="sr-only" /><span>{item.label}</span><span className="sr-only">{topic === item.value ? '選択中' : ''}</span></label>)}</div></fieldset>
			<div className="mt-5"><div className="flex items-center justify-between gap-3"><label htmlFor="consultation-concern" className="text-sm font-semibold text-slate-700">気になっていること</label><span className="text-xs tabular-nums text-slate-400">{concern.length}/500</span></div><textarea id="consultation-concern" required maxLength={500} rows={5} value={concern} onChange={(event) => onConcernChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={`consultation-help${error ? ' consultation-error' : ''}`} placeholder="昨日から便がやわらかいのが気になります" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" /><p id="consultation-help" className="mt-1.5 text-xs leading-relaxed text-slate-400">いつから、どのような変化があるかを書くと、記録と照らし合わせやすくなります。</p>{error && <p id="consultation-error" role="alert" className="mt-2 text-sm font-medium text-danger-strong">{error}</p>}</div>
			<div className="mt-5 rounded-2xl border border-border-soft bg-brand-subtle p-4 text-xs leading-relaxed text-slate-600">この機能は診断や治療を行うものではありません。記録を整理し、受診時の確認ポイントを考えるための参考情報です。体調に異変がある場合は、動物病院へ相談してください。</div>
			<button type="submit" disabled={!canSubmit} className="pc-button-primary mt-5 w-full px-5 text-base">{isSubmitting ? '記録を確認しています…' : '相談を送信する'}</button><p aria-live="polite" className="sr-only">{isSubmitting ? '記録を確認しています' : ''}</p>
		</form>
	);
}
