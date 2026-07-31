import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { NewWalkLog, WalkLog } from '../types/walk';

export type WalkFormProps = {
	initialValues?: WalkLog;
	isEditing: boolean;
	onSubmit: (log: NewWalkLog) => boolean;
	onCancelEdit: () => void;
};

function formatLocalDatetime(date: Date) {
	const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return localTime.toISOString().slice(0, 16);
}

function getCurrentLocalDatetime() {
	return formatLocalDatetime(new Date());
}

function toDatetimeLocal(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? getCurrentLocalDatetime() : formatLocalDatetime(date);
}

export function WalkForm({ initialValues, isEditing, onSubmit, onCancelEdit }: WalkFormProps) {
	const [datetime, setDatetime] = useState(getCurrentLocalDatetime);
	const [duration, setDuration] = useState('');
	const [memo, setMemo] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitLock = useRef(false);
	const durationMinutes = Number(duration);
	const isValidDuration = Number.isInteger(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 1440;

	function resetForm() {
		setDatetime(getCurrentLocalDatetime());
		setDuration('');
		setMemo('');
	}

	useEffect(() => {
		if (!initialValues) {
			resetForm();
			return;
		}
		setDatetime(toDatetimeLocal(initialValues.datetime));
		setDuration(String(initialValues.durationMinutes));
		setMemo(initialValues.memo ?? '');
	}, [initialValues]);

	function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
		event.preventDefault();
		if (!datetime || !isValidDuration || submitLock.current) return;
		submitLock.current = true;
		setIsSubmitting(true);
		const trimmedMemo = memo.trim();
		const didSave = onSubmit({
			datetime,
			durationMinutes,
			...(trimmedMemo ? { memo: trimmedMemo } : {}),
		});
		if (didSave) resetForm();
		setIsSubmitting(false);
		submitLock.current = false;
	}

	return (
		<form onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-4.5">
			<div className="min-w-0 max-w-full">
				<label htmlFor="walk-datetime" className="mb-1.5 block text-sm font-semibold text-slate-700">開始日時</label>
				<input id="walk-datetime" type="datetime-local" required value={datetime} onChange={(event) => setDatetime(event.target.value)} className="datetime-input h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pr-2.5 pl-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
			</div>

			<div>
				<label htmlFor="walk-duration" className="mb-1.5 block text-sm font-semibold text-slate-700">さんぽ時間</label>
				<div className="relative">
					<input id="walk-duration" type="number" inputMode="numeric" required min={1} max={1440} step={1} value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="30" className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pr-12 pl-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
					<span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-slate-400">分</span>
				</div>
			</div>

			<div>
				<label htmlFor="walk-memo" className="mb-1.5 block text-sm font-semibold text-slate-700">メモ</label>
				<textarea id="walk-memo" rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="さんぽ中の様子を自由に入力できます" className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
			</div>

			<div className="space-y-2.5">
				<button type="submit" disabled={!datetime || !isValidDuration || isSubmitting} className="pc-button-primary w-full px-5 text-base">{isSubmitting ? '保存中…' : isEditing ? '更新する' : '記録する'}</button>
				{isEditing && <button type="button" onClick={() => { resetForm(); onCancelEdit(); }} className="min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">編集をキャンセル</button>}
			</div>
		</form>
	);
}
