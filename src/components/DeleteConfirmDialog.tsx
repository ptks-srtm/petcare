import { useEffect, useRef, type KeyboardEvent } from 'react';

export type DeleteConfirmDialogProps = {
	onCancel: () => void;
	onConfirm: () => void;
	title?: string;
	description?: string;
	confirmLabel?: string;
	tone?: 'danger' | 'primary';
};

export function DeleteConfirmDialog({ onCancel, onConfirm, title = 'この記録を削除しますか？', description = '削除すると元に戻せません', confirmLabel = '削除する', tone = 'danger' }: DeleteConfirmDialogProps) {
	const cancelButtonRef = useRef<HTMLButtonElement>(null);
	const deleteButtonRef = useRef<HTMLButtonElement>(null);
	const onCancelRef = useRef(onCancel);

	onCancelRef.current = onCancel;

	useEffect(() => {
		const returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		cancelButtonRef.current?.focus();

		function handleEscape(event: globalThis.KeyboardEvent) {
			if (event.key === 'Escape') onCancelRef.current();
		}

		document.addEventListener('keydown', handleEscape);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleEscape);
			requestAnimationFrame(() => {
				if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
			});
		};
	}, []);

	function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key !== 'Tab') return;

		if (event.shiftKey && document.activeElement === cancelButtonRef.current) {
			event.preventDefault();
			deleteButtonRef.current?.focus();
		} else if (!event.shiftKey && document.activeElement === deleteButtonRef.current) {
			event.preventDefault();
			cancelButtonRef.current?.focus();
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
			onClick={onCancel}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-dialog-title"
				aria-describedby="delete-dialog-description"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={handleDialogKeyDown}
				className="w-full max-w-sm rounded-3xl border border-border-soft bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.16)]"
			>
				<h2 id="delete-dialog-title" className="text-lg font-semibold text-slate-800">
					{title}
				</h2>
				<p id="delete-dialog-description" className="mt-2 text-sm text-slate-500">
					{description}
				</p>

				<div className="mt-6 grid grid-cols-2 gap-2.5">
					<button
						ref={cancelButtonRef}
						type="button"
						onClick={onCancel}
						className="min-h-12 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
					>
						キャンセル
					</button>
					<button
						ref={deleteButtonRef}
						type="button"
						onClick={onConfirm}
						className={`min-h-12 rounded-xl px-4 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px ${tone === 'danger' ? 'bg-danger-strong focus-visible:outline-danger-strong' : 'bg-brand-blue focus-visible:outline-brand-sky'}`}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
