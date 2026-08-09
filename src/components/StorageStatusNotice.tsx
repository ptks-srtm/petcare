import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkStorageAvailability, type StorageAvailabilityStatus } from '../utils/storageAvailability';

export function StorageStatusNotice({ showSettingsLink = false, className = '' }: { showSettingsLink?: boolean; className?: string }) {
	const [status, setStatus] = useState<StorageAvailabilityStatus | null>(null);

	useEffect(() => {
		setStatus(checkStorageAvailability());
	}, []);

	if (!status || status.status === 'available') return null;

	return <aside role="status" aria-live="polite" aria-labelledby="storage-status-title" className={`rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 ${className}`}>
		<div className="flex items-start gap-3">
			<span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700 ring-1 ring-amber-200"><AlertTriangle size={20} strokeWidth={1.8} /></span>
			<div className="min-w-0">
				<h2 id="storage-status-title" className="text-sm font-semibold">記録を保存できない状態です</h2>
				<p className="mt-1 text-sm leading-relaxed text-amber-900/80">このブラウザでは記録を保存できない可能性があります。ブラウザ設定を確認するか、通常のブラウジングモードで開いてください。</p>
				{showSettingsLink && <a href="/settings" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-amber-900 underline decoration-amber-400 underline-offset-4 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">データ管理を見る</a>}
			</div>
		</div>
	</aside>;
}
