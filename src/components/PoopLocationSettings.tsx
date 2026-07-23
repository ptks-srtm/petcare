import { Plus } from 'lucide-react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { PoopLocationOption } from '../types/poopLocation';
import { addPoopLocationOption, deletePoopLocationOption, loadPoopLocationOptions, POOP_LOCATION_LABEL_MAX_LENGTH, updatePoopLocationOption } from '../utils/poopLocationOptions';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Toast } from './Toast';

type EditorState = { mode: 'add'; label: string } | { mode: 'edit'; id: string; label: string } | null;
type Feedback = { message: string; isError?: boolean } | null;

export function PoopLocationSettings() {
	const [options, setOptions] = useState<PoopLocationOption[]>([]);
	const [editor, setEditor] = useState<EditorState>(null);
	const [deleteTarget, setDeleteTarget] = useState<PoopLocationOption | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<Feedback>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setOptions(loadPoopLocationOptions());
		return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
	}, []);

	useEffect(() => { if (editor) inputRef.current?.focus(); }, [editor?.mode, editor && 'id' in editor ? editor.id : null]);

	function showFeedback(message: string, isError = false) {
		if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
		setFeedback({ message, isError });
		feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
	}

	function closeEditor() {
		setEditor(null);
		setError(null);
	}

	function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!editor) return;
		const result = editor.mode === 'add' ? addPoopLocationOption(options, editor.label) : updatePoopLocationOption(options, editor.id, editor.label);
		if (!result.ok) { setError(result.error); return; }
		setOptions(result.options);
		closeEditor();
		showFeedback(editor.mode === 'add' ? '選択肢を追加しました' : '選択肢を更新しました');
	}

	function handleDeleteRequest(option: PoopLocationOption) {
		if (options.length <= 1) { showFeedback('うんちをした場所は1件以上必要です。', true); return; }
		setDeleteTarget(option);
	}

	function handleConfirmDelete() {
		if (!deleteTarget) return;
		const result = deletePoopLocationOption(options, deleteTarget.id);
		if (!result.ok) { setDeleteTarget(null); showFeedback(result.error, true); return; }
		setOptions(result.options);
		if (editor?.mode === 'edit' && editor.id === deleteTarget.id) closeEditor();
		setDeleteTarget(null);
		showFeedback('選択肢を削除しました');
	}

	return (
		<>
			<section aria-labelledby="location-options-title">
				<div className="mb-3 flex items-center justify-between gap-4 px-1">
					<h2 id="location-options-title" className="text-lg font-semibold text-slate-800">登録中の選択肢</h2>
					<span className="text-sm tabular-nums text-slate-400">{options.length}件</span>
				</div>

				<div className="pc-card overflow-hidden">
					{options.map((option, index) => (
						<div key={option.id} className={`flex min-h-16 items-center gap-3 px-4 sm:px-5 ${index < options.length - 1 ? 'border-b border-slate-100' : ''}`}>
							<span className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-700">{option.label}</span>
							<button type="button" onClick={() => { setEditor({ mode: 'edit', id: option.id, label: option.label }); setError(null); }} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">編集</button>
							<button type="button" onClick={() => handleDeleteRequest(option)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-danger-strong transition hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-strong">削除</button>
						</div>
					))}
				</div>

				{editor ? (
					<form onSubmit={handleSubmit} className="pc-card mt-4 p-4 sm:p-5">
						<label htmlFor="poop-location-label" className="block text-sm font-semibold text-slate-700">{editor.mode === 'add' ? '新しい選択肢名' : '選択肢名を編集'}</label>
						<input ref={inputRef} id="poop-location-label" value={editor.label} maxLength={POOP_LOCATION_LABEL_MAX_LENGTH} onChange={(event) => { setEditor({ ...editor, label: event.target.value }); setError(null); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'poop-location-error' : 'poop-location-help'} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
						<div className="mt-1.5 flex items-start justify-between gap-3 text-xs"><p id="poop-location-help" className="text-slate-400">{POOP_LOCATION_LABEL_MAX_LENGTH}文字以内</p><span className="tabular-nums text-slate-400">{editor.label.length}/{POOP_LOCATION_LABEL_MAX_LENGTH}</span></div>
						{error && <p id="poop-location-error" role="alert" className="mt-2 text-sm font-medium text-danger-strong">{error}</p>}
						<div className="mt-4 grid grid-cols-2 gap-2.5"><button type="button" onClick={closeEditor} className="pc-button-secondary px-4 text-sm">キャンセル</button><button type="submit" className="pc-button-primary px-4 text-sm">{editor.mode === 'add' ? '追加する' : '更新する'}</button></div>
					</form>
				) : (
					<button type="button" onClick={() => { setEditor({ mode: 'add', label: '' }); setError(null); }} className="pc-button-primary mt-5 w-full gap-2 px-5 text-base"><Plus size={18} strokeWidth={2} aria-hidden="true" />選択肢を追加</button>
				)}
			</section>

			<Toast message={feedback?.message ?? null} isError={feedback?.isError} />
			{deleteTarget && <DeleteConfirmDialog title={`「${deleteTarget.label}」を選択肢から削除しますか？`} description="過去の記録は削除されません。" onCancel={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />}
		</>
	);
}
