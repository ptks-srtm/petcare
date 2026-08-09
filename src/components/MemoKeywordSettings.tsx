import { Plus } from 'lucide-react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { MemoKeywordDefinition } from '../utils/memoKeywords';
import {
	addCustomMemoKeyword,
	CUSTOM_MEMO_KEYWORDS_CHANGED_EVENT,
	CUSTOM_MEMO_KEYWORDS_MAX_COUNT,
	deleteCustomMemoKeyword,
	loadCustomMemoKeywords,
	MEMO_KEYWORD_LABEL_MAX_LENGTH,
	MEMO_KEYWORDS,
	updateCustomMemoKeyword,
} from '../utils/memoKeywords';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Toast } from './Toast';

type EditorState = { mode: 'add'; label: string } | { mode: 'edit'; id: string; label: string } | null;
type Feedback = { message: string; isError?: boolean } | null;

export function MemoKeywordSettings() {
	const [customKeywords, setCustomKeywords] = useState<MemoKeywordDefinition[]>([]);
	const [editor, setEditor] = useState<EditorState>(null);
	const [deleteTarget, setDeleteTarget] = useState<MemoKeywordDefinition | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<Feedback>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const refresh = () => setCustomKeywords(loadCustomMemoKeywords());
		refresh();
		window.addEventListener(CUSTOM_MEMO_KEYWORDS_CHANGED_EVENT, refresh);
		return () => {
			window.removeEventListener(CUSTOM_MEMO_KEYWORDS_CHANGED_EVENT, refresh);
			if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
		};
	}, []);

	useEffect(() => { if (editor) inputRef.current?.focus(); }, [editor?.mode, editor && 'id' in editor ? editor.id : null]);

	function closeEditor() {
		setEditor(null);
		setError(null);
	}

	function showFeedback(message: string, isError = false) {
		if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
		setFeedback({ message, isError });
		feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
	}

	function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!editor) return;
		const result = editor.mode === 'add'
			? addCustomMemoKeyword(editor.label)
			: updateCustomMemoKeyword(editor.id, editor.label);
		if (!result.ok) { setError(result.error); return; }
		setCustomKeywords(result.keywords);
		closeEditor();
		showFeedback(editor.mode === 'add' ? '注目語を追加しました' : '注目語を更新しました');
	}

	function handleConfirmDelete() {
		if (!deleteTarget) return;
		const result = deleteCustomMemoKeyword(deleteTarget.id);
		if (!result.ok) {
			setDeleteTarget(null);
			showFeedback(result.error, true);
			return;
		}
		setCustomKeywords(result.keywords);
		if (editor?.mode === 'edit' && editor.id === deleteTarget.id) closeEditor();
		setDeleteTarget(null);
		showFeedback('注目語を削除しました');
	}

	return <>
		<section aria-labelledby="memo-keywords-title" className="mt-8">
			<div className="mb-3 flex items-center justify-between gap-4 px-1">
				<div>
					<h2 id="memo-keywords-title" className="text-lg font-semibold text-slate-800">注目語</h2>
					<p className="mt-1 text-sm leading-relaxed text-slate-500">メモ分析で見つけたい言葉を追加できます。</p>
				</div>
				<span className="shrink-0 text-sm tabular-nums text-slate-400">{customKeywords.length}/{CUSTOM_MEMO_KEYWORDS_MAX_COUNT}件</span>
			</div>

			<div className="pc-card p-4 sm:p-5">
				<h3 className="text-sm font-semibold text-slate-700">標準</h3>
				<div className="mt-3 flex flex-wrap gap-2" aria-label="標準の注目語">
					{MEMO_KEYWORDS.map((keyword) => <span key={keyword.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">{keyword.label}</span>)}
				</div>
			</div>

			<div className="mt-4">
				<h3 className="mb-3 px-1 text-sm font-semibold text-slate-700">追加した注目語</h3>
				{customKeywords.length > 0 ? <div className="pc-card overflow-hidden">
					{customKeywords.map((keyword, index) => <div key={keyword.id} className={`flex min-h-16 items-center gap-2 px-4 sm:px-5 ${index < customKeywords.length - 1 ? 'border-b border-slate-100' : ''}`}>
						<span className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-700">{keyword.label}</span>
						<button type="button" onClick={() => { setEditor({ mode: 'edit', id: keyword.id, label: keyword.label }); setError(null); }} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">編集</button>
						<button type="button" onClick={() => setDeleteTarget(keyword)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-danger-strong transition hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-strong">削除</button>
					</div>)}
				</div> : <div className="pc-card px-5 py-7 text-center"><p className="text-sm font-semibold text-slate-700">追加した注目語はありません</p><p className="mt-1.5 text-sm leading-relaxed text-slate-500">よく記録する言葉を追加すると、メモ分析で選べます。</p></div>}
			</div>

			{editor ? <form onSubmit={handleSubmit} className="pc-card mt-4 p-4 sm:p-5">
				<label htmlFor="memo-keyword-label" className="block text-sm font-semibold text-slate-700">{editor.mode === 'add' ? '新しい注目語' : '注目語を編集'}</label>
				<input ref={inputRef} id="memo-keyword-label" value={editor.label} maxLength={MEMO_KEYWORD_LABEL_MAX_LENGTH} onChange={(event) => { setEditor({ ...editor, label: event.target.value }); setError(null); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'memo-keyword-error' : 'memo-keyword-help'} className="mt-2 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 outline-none transition focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
				<div className="mt-1.5 flex items-start justify-between gap-3 text-xs"><p id="memo-keyword-help" className="text-slate-400">{MEMO_KEYWORD_LABEL_MAX_LENGTH}文字以内</p><span className="tabular-nums text-slate-400">{editor.label.length}/{MEMO_KEYWORD_LABEL_MAX_LENGTH}</span></div>
				{error && <p id="memo-keyword-error" role="alert" className="mt-2 text-sm font-medium text-danger-strong">{error}</p>}
				<div className="mt-4 grid grid-cols-2 gap-2.5"><button type="button" onClick={closeEditor} className="pc-button-secondary px-4 text-sm">キャンセル</button><button type="submit" className="pc-button-primary px-4 text-sm">{editor.mode === 'add' ? '追加' : '更新'}</button></div>
			</form> : <button type="button" disabled={customKeywords.length >= CUSTOM_MEMO_KEYWORDS_MAX_COUNT} onClick={() => { setEditor({ mode: 'add', label: '' }); setError(null); }} className="pc-button-primary mt-5 w-full gap-2 px-5 text-base disabled:cursor-not-allowed disabled:opacity-50"><Plus size={18} aria-hidden="true" />追加</button>}
		</section>

		<Toast message={feedback?.message ?? null} isError={feedback?.isError} />
		{deleteTarget && <DeleteConfirmDialog title="この注目語を削除しますか？" description={`「${deleteTarget.label}」はメモ分析の対象から除外されます。`} onCancel={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />}
	</>;
}
