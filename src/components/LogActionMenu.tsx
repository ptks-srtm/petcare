import { Ellipsis } from 'lucide-react';

export type LogActionMenuProps = {
	menuKey: string;
	isOpen: boolean;
	onToggle: () => void;
	onClose: () => void;
	onEdit: () => void;
	onRequestDelete: () => void;
};

export function LogActionMenu({
	menuKey,
	isOpen,
	onToggle,
	onClose,
	onEdit,
	onRequestDelete,
}: LogActionMenuProps) {
	return (
		<div className="relative" data-log-menu-root={menuKey}>
			<button
				type="button"
				aria-label="記録の操作メニュー"
				aria-haspopup="menu"
				aria-expanded={isOpen}
				aria-controls={`log-menu-${menuKey}`}
				onClick={onToggle}
				className="grid size-11 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky"
			>
				<Ellipsis size={21} aria-hidden="true" />
			</button>

			{isOpen && (
				<div id={`log-menu-${menuKey}`} role="menu" aria-label="記録の操作" className="absolute top-12 right-0 z-20 min-w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
					<button type="button" role="menuitem" onClick={() => { onClose(); onEdit(); }} className="min-h-10 w-full rounded-xl px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">編集</button>
					<button type="button" role="menuitem" onClick={() => { onClose(); onRequestDelete(); }} className="min-h-10 w-full rounded-xl px-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:bg-rose-50 focus:outline-none">削除</button>
				</div>
			)}
		</div>
	);
}
