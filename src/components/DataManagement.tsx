import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import type { PetCareBackup } from '../types/backup';
import { createPetCareBackup, parsePetCareBackup, resetPetCareData, restorePetCareBackup } from '../utils/dataBackup';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Toast } from './Toast';

type PendingAction = { kind: 'import'; backup: PetCareBackup } | { kind: 'reset' } | null;
type Feedback = { message: string; isError?: boolean } | null;

function getLocalDateStamp() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function DataManagement() {
	const [pendingAction, setPendingAction] = useState<PendingAction>(null);
	const [feedback, setFeedback] = useState<Feedback>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const restoreButtonRef = useRef<HTMLButtonElement>(null);

	function showFeedback(message: string, isError = false) {
		setFeedback({ message, isError });
		window.setTimeout(() => setFeedback(null), 3000);
	}

	function handleExport() {
		try {
			const json = JSON.stringify(createPetCareBackup(), null, 2);
			const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `PetCare-${getLocalDateStamp()}.json`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
			showFeedback('データを書き出しました');
		} catch {
			showFeedback('書き出しできませんでした', true);
		}
	}

	async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file || file.size > 10 * 1024 * 1024) {
			if (file) showFeedback('読み込みできませんでした', true);
			return;
		}
		try {
			const backup = parsePetCareBackup(await file.text());
			if (!backup) {
				showFeedback('読み込みできませんでした', true);
				return;
			}
			restoreButtonRef.current?.focus();
			setPendingAction({ kind: 'import', backup });
		} catch {
			showFeedback('読み込みできませんでした', true);
		}
	}

	function handleConfirm() {
		if (pendingAction?.kind === 'import') {
			const restored = restorePetCareBackup(pendingAction.backup);
			setPendingAction(null);
			showFeedback(restored ? 'データを読み込みました' : '読み込みできませんでした', !restored);
			return;
		}
		if (pendingAction?.kind === 'reset') {
			if (!resetPetCareData()) {
				setPendingAction(null);
				showFeedback('削除できませんでした', true);
				return;
			}
			window.location.assign('/?dataReset=1');
		}
	}

	return <>
		<section aria-labelledby="data-management-title" className="mt-8">
			<h2 id="data-management-title" className="mb-3 px-1 text-lg font-semibold text-slate-800">データ管理</h2>
			<div className="mb-3 rounded-2xl border border-border-soft bg-brand-subtle p-4">
				<h3 className="text-sm font-semibold text-slate-700">データを守るために</h3>
				<p className="mt-1.5 text-sm leading-relaxed text-slate-600">PetCareの記録はこのブラウザ内に保存され、クラウドへ自動保存されません。機種変更、別のブラウザへの移行、ホーム画面への追加前にはバックアップを書き出してください。</p>
				<p className="mt-2 text-xs leading-relaxed text-slate-500">プライベートブラウズでは、終了後に記録が残らない場合があります。通常のブラウジングモードでの利用をおすすめします。</p>
			</div>
			<div className="pc-card overflow-hidden">
				<div className="flex items-center gap-3 border-b border-slate-100 p-4"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><Download size={19} strokeWidth={1.8} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">バックアップ</p><p className="mt-0.5 text-xs leading-relaxed text-slate-500">プロフィール・記録・設定をJSONファイルとして保存します</p></div><button type="button" onClick={handleExport} className="pc-button-secondary shrink-0 px-3 text-sm">書き出す</button></div>
				<div className="flex items-center gap-3 border-b border-slate-100 p-4"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><Upload size={19} strokeWidth={1.8} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">復元</p><p className="mt-0.5 text-xs leading-relaxed text-slate-500">現在のプロフィール・全ログ・設定をバックアップ内容に置き換えます</p></div><button ref={restoreButtonRef} type="button" onClick={() => fileInputRef.current?.click()} className="pc-button-secondary shrink-0 px-3 text-sm">読み込む</button><input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileSelect} className="sr-only" aria-label="PetCareのバックアップデータを読み込む" /></div>
				<div className="flex items-center gap-3 p-4"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger-strong"><RotateCcw size={19} strokeWidth={1.8} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">すべてのデータ</p><p className="mt-0.5 text-xs leading-relaxed text-slate-500">この端末内のプロフィールと記録を削除します</p></div><button type="button" onClick={() => setPendingAction({ kind: 'reset' })} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-danger-strong transition hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-strong">すべて削除</button></div>
			</div>
			<p className="mt-3 px-1 text-xs leading-relaxed text-slate-500">読み込みを行うと、現在このブラウザに保存されているプロフィール・全ログ・設定は上書きされます。</p>
		</section>

		<Toast message={feedback?.message ?? null} isError={feedback?.isError} />
		{pendingAction?.kind === 'import' && <DeleteConfirmDialog title="現在のデータは置き換えられます" description="プロフィール・全ログ・設定をバックアップ内容に置き換えます。続行しますか？" confirmLabel="読み込む" tone="primary" onCancel={() => setPendingAction(null)} onConfirm={handleConfirm} />}
		{pendingAction?.kind === 'reset' && <DeleteConfirmDialog title="すべてのデータを削除しますか？" description="プロフィールとすべての記録が削除され、元に戻せません。" confirmLabel="すべて削除" onCancel={() => setPendingAction(null)} onConfirm={handleConfirm} />}
	</>;
}
