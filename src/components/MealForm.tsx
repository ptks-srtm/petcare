import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { MealLog, NewMealLog } from '../types/meal';

export type MealFormProps = {
	initialValues?: MealLog;
	isEditing: boolean;
	onSubmit: (log: NewMealLog) => boolean;
	onCancelEdit: () => void;
};

const mealTypes: { value: MealLog['mealType']; label: string }[] = [
	{ value: 'breakfast', label: '朝ごはん' },
	{ value: 'lunch', label: '昼ごはん' },
	{ value: 'dinner', label: '夜ごはん' },
	{ value: 'snack', label: 'おやつ' },
	{ value: 'other', label: 'その他' },
];

const intakeValues: { value: MealLog['intake']; label: string }[] = [
	{ value: 'all', label: '完食' },
	{ value: 'most', label: 'ほぼ完食' },
	{ value: 'half', label: '半分くらい' },
	{ value: 'little', label: '少しだけ' },
	{ value: 'none', label: '食べなかった' },
];

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

export function MealForm({ initialValues, isEditing, onSubmit, onCancelEdit }: MealFormProps) {
	const [datetime, setDatetime] = useState(getCurrentLocalDatetime);
	const [mealType, setMealType] = useState<MealLog['mealType'] | null>(null);
	const [intake, setIntake] = useState<MealLog['intake'] | null>(null);
	const [memo, setMemo] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitLock = useRef(false);

	function resetForm() {
		setDatetime(getCurrentLocalDatetime());
		setMealType(null);
		setIntake(null);
		setMemo('');
	}

	useEffect(() => {
		if (!initialValues) {
			resetForm();
			return;
		}
		setDatetime(toDatetimeLocal(initialValues.datetime));
		setMealType(initialValues.mealType);
		setIntake(initialValues.intake);
		setMemo(initialValues.memo ?? '');
	}, [initialValues]);

	function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
		event.preventDefault();
		if (!mealType || !intake || submitLock.current) return;

		submitLock.current = true;
		setIsSubmitting(true);
		const trimmedMemo = memo.trim();
		const didSave = onSubmit({
			datetime,
			mealType,
			intake,
			...(trimmedMemo ? { memo: trimmedMemo } : {}),
		});
		if (didSave) resetForm();
		setIsSubmitting(false);
		submitLock.current = false;
	}

	const choiceClass = (selected: boolean) =>
		`min-h-11 rounded-xl border px-3 text-sm font-semibold transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky active:translate-y-px ${
			selected
				? 'pc-choice-selected'
				: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
		}`;

	return (
		<form onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-4.5">
			<div className="min-w-0 max-w-full">
				<label htmlFor="meal-datetime" className="mb-1.5 block text-sm font-semibold text-slate-700">日時</label>
				<input id="meal-datetime" type="datetime-local" required value={datetime} onChange={(event) => setDatetime(event.target.value)} className="datetime-input h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pr-2.5 pl-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
			</div>

			<fieldset>
				<legend className="mb-1.5 text-sm font-semibold text-slate-700">ごはんの種類</legend>
				<div className="grid grid-cols-2 gap-2">{mealTypes.map((item) => <button key={item.value} type="button" aria-pressed={mealType === item.value} onClick={() => setMealType(item.value)} className={`${choiceClass(mealType === item.value)} last:col-span-2`}>{item.label}</button>)}</div>
			</fieldset>

			<fieldset>
				<legend className="mb-1.5 text-sm font-semibold text-slate-700">食べた量</legend>
				<div className="grid grid-cols-2 gap-2">{intakeValues.map((item) => <button key={item.value} type="button" aria-pressed={intake === item.value} onClick={() => setIntake(item.value)} className={`${choiceClass(intake === item.value)} last:col-span-2`}>{item.label}</button>)}</div>
			</fieldset>

			<div>
				<label htmlFor="meal-memo" className="mb-1.5 block text-sm font-semibold text-slate-700">メモ</label>
				<textarea id="meal-memo" rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="ごはんの内容や様子を自由に入力できます" className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
			</div>

			<div className="space-y-2.5">
				<button type="submit" disabled={!mealType || !intake || isSubmitting} className="pc-button-primary w-full px-5 text-base">{isSubmitting ? '保存中…' : isEditing ? '更新する' : '記録する'}</button>
				{isEditing && <button type="button" onClick={() => { resetForm(); onCancelEdit(); }} className="min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">編集をキャンセル</button>}
			</div>
		</form>
	);
}
