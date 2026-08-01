import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { HospitalLog, NewHospitalLog } from '../types/hospital';

export type HospitalFormProps = {
	initialValues?: HospitalLog;
	isEditing: boolean;
	onSubmit: (log: NewHospitalLog) => boolean;
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

function optionalText(value: string) {
	const trimmed = value.trim();
	return trimmed || undefined;
}

export function HospitalForm({ initialValues, isEditing, onSubmit, onCancelEdit }: HospitalFormProps) {
	const [datetime, setDatetime] = useState(getCurrentLocalDatetime);
	const [hospitalName, setHospitalName] = useState('');
	const [reason, setReason] = useState('');
	const [diagnosis, setDiagnosis] = useState('');
	const [prescription, setPrescription] = useState('');
	const [cost, setCost] = useState('');
	const [nextVisitDate, setNextVisitDate] = useState('');
	const [memo, setMemo] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitLock = useRef(false);
	const costYen = cost === '' ? undefined : Number(cost);
	const isValidCost = cost === '' || (Number.isSafeInteger(costYen) && Number(costYen) >= 0);

	function resetForm() {
		setDatetime(getCurrentLocalDatetime());
		setHospitalName('');
		setReason('');
		setDiagnosis('');
		setPrescription('');
		setCost('');
		setNextVisitDate('');
		setMemo('');
	}

	useEffect(() => {
		if (!initialValues) {
			resetForm();
			return;
		}
		setDatetime(toDatetimeLocal(initialValues.datetime));
		setHospitalName(initialValues.hospitalName ?? '');
		setReason(initialValues.reason ?? '');
		setDiagnosis(initialValues.diagnosis ?? '');
		setPrescription(initialValues.prescription ?? '');
		setCost(initialValues.costYen === undefined ? '' : String(initialValues.costYen));
		setNextVisitDate(initialValues.nextVisitDate ?? '');
		setMemo(initialValues.memo ?? '');
	}, [initialValues]);

	function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
		event.preventDefault();
		if (!datetime || !isValidCost || submitLock.current) return;
		submitLock.current = true;
		setIsSubmitting(true);
		const input: NewHospitalLog = {
			datetime,
			...(optionalText(hospitalName) ? { hospitalName: optionalText(hospitalName) } : {}),
			...(optionalText(reason) ? { reason: optionalText(reason) } : {}),
			...(optionalText(diagnosis) ? { diagnosis: optionalText(diagnosis) } : {}),
			...(optionalText(prescription) ? { prescription: optionalText(prescription) } : {}),
			...(costYen !== undefined ? { costYen } : {}),
			...(nextVisitDate ? { nextVisitDate } : {}),
			...(optionalText(memo) ? { memo: optionalText(memo) } : {}),
		};
		const didSave = onSubmit(input);
		if (didSave) resetForm();
		setIsSubmitting(false);
		submitLock.current = false;
	}

	const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20';
	return (
		<form onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-4.5">
			<div className="min-w-0 max-w-full">
				<label htmlFor="hospital-datetime" className="mb-1.5 block text-sm font-semibold text-slate-700">受診日時</label>
				<input id="hospital-datetime" type="datetime-local" required value={datetime} onChange={(event) => setDatetime(event.target.value)} className="datetime-input h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pr-2.5 pl-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />
			</div>

			<div><label htmlFor="hospital-name" className="mb-1.5 block text-sm font-semibold text-slate-700">病院名</label><input id="hospital-name" type="text" value={hospitalName} onChange={(event) => setHospitalName(event.target.value)} placeholder="病院名を入力" className={inputClass} /></div>
			<div><label htmlFor="hospital-reason" className="mb-1.5 block text-sm font-semibold text-slate-700">受診理由</label><textarea id="hospital-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="受診した理由を入力" className={`${inputClass} resize-none`} /></div>
			<div><label htmlFor="hospital-diagnosis" className="mb-1.5 block text-sm font-semibold text-slate-700">診断・説明</label><textarea id="hospital-diagnosis" rows={3} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="診断内容や説明を入力" className={`${inputClass} resize-none`} /></div>
			<div><label htmlFor="hospital-prescription" className="mb-1.5 block text-sm font-semibold text-slate-700">処方薬</label><textarea id="hospital-prescription" rows={2} value={prescription} onChange={(event) => setPrescription(event.target.value)} placeholder="処方された薬を入力" className={`${inputClass} resize-none`} /></div>

			<div>
				<label htmlFor="hospital-cost" className="mb-1.5 block text-sm font-semibold text-slate-700">費用</label>
				<div className="relative"><input id="hospital-cost" type="number" inputMode="numeric" min={0} step={1} value={cost} onChange={(event) => setCost(event.target.value)} aria-invalid={!isValidCost} aria-describedby={!isValidCost ? 'hospital-cost-error' : undefined} placeholder="12000" className={`${inputClass} pr-10`} /><span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-slate-400">円</span></div>
				{!isValidCost && <p id="hospital-cost-error" className="mt-1.5 text-xs font-medium text-danger-strong">0以上の整数で入力してください</p>}
			</div>

			<div><label htmlFor="hospital-next-visit" className="mb-1.5 block text-sm font-semibold text-slate-700">次回受診日</label><input id="hospital-next-visit" type="date" value={nextVisitDate} onChange={(event) => setNextVisitDate(event.target.value)} className={inputClass} /></div>
			<div><label htmlFor="hospital-memo" className="mb-1.5 block text-sm font-semibold text-slate-700">メモ</label><textarea id="hospital-memo" rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="気になることを自由に入力できます" className={`${inputClass} resize-none`} /></div>

			<div className="space-y-2.5">
				<button type="submit" disabled={!datetime || !isValidCost || isSubmitting} className="pc-button-primary w-full px-5 text-base">{isSubmitting ? '保存中…' : isEditing ? '更新する' : '記録する'}</button>
				{isEditing && <button type="button" onClick={() => { resetForm(); onCancelEdit(); }} className="min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">編集をキャンセル</button>}
			</div>
		</form>
	);
}
