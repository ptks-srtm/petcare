import type { ReactNode } from 'react';

export function EmptyState({ title = 'まだ記録はありません', description = '最初の記録を追加してみましょう。', action, icon }: {
	title?: string;
	description?: string;
	action?: ReactNode;
	icon?: ReactNode;
}) {
	return <div className="pc-empty-state">
		{icon && <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-white text-brand-primary ring-1 ring-border-soft" aria-hidden="true">{icon}</div>}
		<p className="font-semibold text-text-primary">{title}</p>
		<p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{description}</p>
		{action && <div className="mt-4">{action}</div>}
	</div>;
}
