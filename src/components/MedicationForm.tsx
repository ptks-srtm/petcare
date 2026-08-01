import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { MedicationLog, NewMedicationLog } from '../types/medication';
import { isValidDateValue, optionalText } from '../utils/careLogValidation';

type Props = { initialValues?: MedicationLog; isEditing: boolean; onSubmit: (log: NewMedicationLog) => boolean; onCancelEdit: () => void };
function localDatetime(date = new Date()) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
function toInputDatetime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? localDatetime() : localDatetime(date); }

export function MedicationForm({ initialValues, isEditing, onSubmit, onCancelEdit }: Props) {
	const [datetime, setDatetime] = useState(localDatetime);
	const [medicineName, setMedicineName] = useState('');
	const [dosage, setDosage] = useState('');
	const [frequency, setFrequency] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [hospitalName, setHospitalName] = useState('');
	const [memo, setMemo] = useState('');
	const [attempted, setAttempted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const lock = useRef(false);
	const nameError = medicineName.trim() ? null : '薬名を入力してください';
	const dateError = startDate && !isValidDateValue(startDate) || endDate && !isValidDateValue(endDate) ? '有効な日付を入力してください' : startDate && endDate && endDate < startDate ? '服用終了日は開始日以降にしてください' : null;

	function reset() { setDatetime(localDatetime()); setMedicineName(''); setDosage(''); setFrequency(''); setStartDate(''); setEndDate(''); setHospitalName(''); setMemo(''); setAttempted(false); }
	useEffect(() => { if (!initialValues) { reset(); return; } setDatetime(toInputDatetime(initialValues.datetime)); setMedicineName(initialValues.medicineName); setDosage(initialValues.dosage ?? ''); setFrequency(initialValues.frequency ?? ''); setStartDate(initialValues.startDate ?? ''); setEndDate(initialValues.endDate ?? ''); setHospitalName(initialValues.hospitalName ?? ''); setMemo(initialValues.memo ?? ''); setAttempted(false); }, [initialValues]);

	function submit(event: SyntheticEvent<HTMLFormElement>) { event.preventDefault(); setAttempted(true); if (!datetime || nameError || dateError || lock.current) return; lock.current = true; setSubmitting(true); const input: NewMedicationLog = { datetime, medicineName: medicineName.trim(), ...(optionalText(dosage) ? { dosage: optionalText(dosage) } : {}), ...(optionalText(frequency) ? { frequency: optionalText(frequency) } : {}), ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}), ...(optionalText(hospitalName) ? { hospitalName: optionalText(hospitalName) } : {}), ...(optionalText(memo) ? { memo: optionalText(memo) } : {}) }; const saved = onSubmit(input); if (saved) reset(); setSubmitting(false); lock.current = false; }
	const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20';
	return <form onSubmit={submit} className="min-w-0 max-w-full space-y-4.5">
		<p className="text-xs leading-relaxed text-slate-500">薬名や服用期間を、薬ごとに記録します。</p>
		<div className="min-w-0"><label htmlFor="medication-datetime" className="mb-1.5 block text-sm font-semibold text-slate-700">処方日時</label><input id="medication-datetime" type="datetime-local" required value={datetime} onChange={(e) => setDatetime(e.target.value)} className="datetime-input h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pr-2.5 pl-3.5 text-sm text-slate-800 outline-none focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" /></div>
		<div><label htmlFor="medicine-name" className="mb-1.5 block text-sm font-semibold text-slate-700">薬名</label><input id="medicine-name" required value={medicineName} onChange={(e) => setMedicineName(e.target.value)} aria-invalid={attempted && Boolean(nameError)} aria-describedby={attempted && nameError ? 'medicine-name-error' : undefined} placeholder="薬名を入力" className={inputClass} />{attempted && nameError && <p id="medicine-name-error" className="mt-1.5 text-xs font-medium text-danger-strong">{nameError}</p>}</div>
		<div><label htmlFor="medication-dosage" className="mb-1.5 block text-sm font-semibold text-slate-700">用量</label><input id="medication-dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="例：1錠、2ml" className={inputClass} /></div>
		<div><label htmlFor="medication-frequency" className="mb-1.5 block text-sm font-semibold text-slate-700">服用回数・タイミング</label><input id="medication-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="例：1日2回、食後" className={inputClass} /></div>
		<div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="medication-start" className="mb-1.5 block text-sm font-semibold text-slate-700">服用開始日</label><input id="medication-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} /></div><div><label htmlFor="medication-end" className="mb-1.5 block text-sm font-semibold text-slate-700">服用終了日</label><input id="medication-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} /></div></div>
		{attempted && dateError && <p className="text-xs font-medium text-danger-strong" role="alert">{dateError}</p>}
		<div><label htmlFor="medication-hospital" className="mb-1.5 block text-sm font-semibold text-slate-700">処方した病院</label><input id="medication-hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="病院名を入力" className={inputClass} /></div>
		<div><label htmlFor="medication-memo" className="mb-1.5 block text-sm font-semibold text-slate-700">メモ</label><textarea id="medication-memo" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} className={`${inputClass} resize-none`} /></div>
		<div className="space-y-2.5"><button type="submit" disabled={submitting} className="pc-button-primary w-full px-5 text-base">{submitting ? '保存中…' : isEditing ? '更新する' : '記録する'}</button>{isEditing && <button type="button" onClick={() => { reset(); onCancelEdit(); }} className="min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-sky">編集をキャンセル</button>}</div>
	</form>;
}
