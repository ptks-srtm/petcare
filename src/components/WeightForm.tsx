import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { NewWeightLog, WeightLog } from '../types/weight';
import { isValidWeightKg } from '../utils/weightStorage';

export type WeightFormProps = {
	initialValues?: WeightLog;
	isEditing: boolean;
	onSubmit: (log: NewWeightLog) => boolean;
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

function validateWeightInput(value: string) {
	if (!value) return '体重を入力してください';
	if (!/^(?:\d+|\d+\.\d{1,2}|0?\.\d{1,2})$/.test(value)) return '小数点以下2桁以内で入力してください';
	const parsed = Number(value);
	if (!isValidWeightKg(parsed)) return '0.01kg以上200kg以下で入力してください';
	return null;
}

export function WeightForm({ initialValues, isEditing, onSubmit, onCancelEdit }: WeightFormProps) {
	const [datetime, setDatetime] = useState(getCurrentLocalDatetime);
	const [weight, setWeight] = useState('');
	const [memo, setMemo] = useState('');
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitLock = useRef(false);
	const weightError = validateWeightInput(weight);

	function resetForm() {
		setDatetime(getCurrentLocalDatetime());
		setWeight('');
		setMemo('');
		setHasAttemptedSubmit(false);
	}

	useEffect(() => {
		if (!initialValues) {
			resetForm();
			return;
		}
		setDatetime(toDatetimeLocal(initialValues.datetime));
		setWeight(String(initialValues.weightKg));
		setMemo(initialValues.memo ?? '');
		setHasAttemptedSubmit(false);
	}, [initialValues]);

	function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
		event.preventDefault();
		setHasAttemptedSubmit(true);
		if (!datetime || weightError || submitLock.current) return;
		submitLock.current = true;
		setIsSubmitting(true);
		const parsedWeight = Number(weight);
		const normalizedWeight = Math.round(parsedWeight * 100) / 100;
		const trimmedMemo = memo.trim();
		const didSave = onSubmit({
			datetime,
			weightKg: normalizedWeight,
			...(trimmedMemo ? { memo: trimmedMemo } : {}),
		});
		if (didSave) resetForm();
		setIsSubmitting(false);
		submitLock.current = false;
	}

	const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20';
	return (
		<form onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-4.5">
			<div className="min-w-0 max-w-full">
				<label htmlFor="weight-datetime" className="mb-1.5 block text-sm font-semibold text-slate-700">記録日時</label>
				<input id="weight-datetime" type="datetime-local" required value={datetime} onChange={(event) => setDatetime(event.target.value)} className="datetime-input h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pr-2.5 pl-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
			</div>

			<div>
				<label htmlFor="weight-value" className="mb-1.5 block text-sm font-semibold text-slate-700">体重</label>
				<div className="relative"><input id="weight-value" type="number" inputMode="decimal" min="0.01" max="200" step="0.01" required value={weight} onChange={(event) => setWeight(event.target.value)} aria-invalid={hasAttemptedSubmit && Boolean(weightError)} aria-describedby={hasAttemptedSubmit && weightError ? 'weight-value-error' : 'weight-value-help'} placeholder="6.2" className={`${inputClass} pr-12`} /><span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-slate-400">kg</span></div>
				{hasAttemptedSubmit && weightError ? <p id="weight-value-error" className="mt-1.5 text-xs font-medium text-danger-strong">{weightError}</p> : <p id="weight-value-help" className="mt-1.5 text-xs text-slate-400">0.01〜200kg、小数点以下2桁まで</p>}
			</div>

			<div><label htmlFor="weight-memo" className="mb-1.5 block text-sm font-semibold text-slate-700">メモ</label><textarea id="weight-memo" rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="体重測定時の様子を入力できます" className={`${inputClass} resize-none`} /></div>

			<div className="space-y-2.5">
				<button type="submit" disabled={!datetime || isSubmitting} className="pc-button-primary w-full px-5 text-base">{isSubmitting ? '保存中…' : isEditing ? '更新する' : '記録する'}</button>
				{isEditing && <button type="button" onClick={() => { resetForm(); onCancelEdit(); }} className="min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">編集をキャンセル</button>}
			</div>
		</form>
	);
}
