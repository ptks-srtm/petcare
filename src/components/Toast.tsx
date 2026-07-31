import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export type ToastProps = {
	message: string | null;
	isError?: boolean;
	variant?: 'success' | 'error' | 'info';
	placement?: 'fixed' | 'inline';
};

export function Toast({ message, isError = false, variant, placement = 'fixed' }: ToastProps) {
	const resolvedVariant = variant ?? (isError ? 'error' : 'success');
	const Icon = resolvedVariant === 'error' ? AlertCircle : resolvedVariant === 'info' ? Info : CheckCircle2;
	const toneClass = resolvedVariant === 'error'
		? 'border-rose-200 bg-danger-soft text-danger-strong'
		: resolvedVariant === 'info'
			? 'border-sky-200 bg-brand-subtle text-brand-primary'
			: 'border-emerald-200 bg-success-soft text-success-strong';
	if (placement === 'fixed') return (
		<div role={resolvedVariant === 'error' ? 'alert' : 'status'} aria-live={resolvedVariant === 'error' ? 'assertive' : 'polite'} aria-atomic="true" className={`pointer-events-none fixed inset-x-4 bottom-5 z-10 mx-auto flex min-h-12 max-w-sm items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_6px_18px_rgba(50,78,99,0.08)] transition-all ${message ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'} ${toneClass}`}>
			<Icon size={18} className="shrink-0" aria-hidden="true" />
			<span>{message ?? ''}</span>
		</div>
	);

	return (
		<div className={`pointer-events-none sticky top-3 z-30 mx-auto grid max-w-sm transition-all ${message ? 'mt-3 grid-rows-[1fr] translate-y-0 opacity-100' : 'mt-0 grid-rows-[0fr] translate-y-3 opacity-0'}`}>
			<div className="overflow-hidden">
				<div role={resolvedVariant === 'error' ? 'alert' : 'status'} aria-live={resolvedVariant === 'error' ? 'assertive' : 'polite'} aria-atomic="true" className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_6px_18px_rgba(50,78,99,0.08)] ${toneClass}`}>
					<Icon size={18} className="shrink-0" aria-hidden="true" />
					<span>{message ?? ''}</span>
				</div>
			</div>
		</div>
	);
}
