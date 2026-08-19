import { Check } from 'lucide-react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { SYMPTOM_TYPES, SYMPTOM_TYPE_LABELS, type NewSymptomLog, type SymptomLog, type SymptomType } from '../types/symptom';
import { isValidDatetime, optionalText } from '../utils/careLogValidation';

type Props = { initialValues?: SymptomLog; isEditing: boolean; onSubmit: (log: NewSymptomLog) => boolean; onCancelEdit: () => void };

function localDatetime(date = new Date()) {
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}

function toInputDatetime(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? localDatetime() : localDatetime(date);
}

export function SymptomForm({ initialValues, isEditing, onSubmit, onCancelEdit }: Props) {
	const [datetime, setDatetime] = useState(localDatetime);
	const [symptoms, setSymptoms] = useState<SymptomType[]>([]);
	const [otherSymptom, setOtherSymptom] = useState('');
	const [memo, setMemo] = useState('');
	const [attempted, setAttempted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const lock = useRef(false);
	const datetimeError = isValidDatetime(datetime) ? null : '有効な日時を入力してください';
	const symptomsError = symptoms.length > 0 ? null : '気になる体調を1つ以上選んでください';
	const otherError = symptoms.includes('other') && !otherSymptom.trim() ? 'その他の様子を入力してください' : null;

	function reset() {
		setDatetime(localDatetime()); setSymptoms([]); setOtherSymptom(''); setMemo(''); setAttempted(false);
	}

	useEffect(() => {
		if (!initialValues) { reset(); return; }
		setDatetime(toInputDatetime(initialValues.datetime));
		setSymptoms([...initialValues.symptoms]);
		setOtherSymptom(initialValues.otherSymptom ?? '');
		setMemo(initialValues.memo ?? '');
		setAttempted(false);
	}, [initialValues]);

	function toggleSymptom(symptom: SymptomType) {
		setSymptoms((current) => current.includes(symptom) ? current.filter((item) => item !== symptom) : SYMPTOM_TYPES.filter((item) => item === symptom || current.includes(item)));
	}

	function submit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault(); setAttempted(true);
		if (datetimeError || symptomsError || otherError || lock.current) return;
		lock.current = true; setSubmitting(true);
		const saved = onSubmit({
			datetime,
			symptoms,
			...(symptoms.includes('other') && optionalText(otherSymptom) ? { otherSymptom: optionalText(otherSymptom) } : {}),
			...(optionalText(memo) ? { memo: optionalText(memo) } : {}),
		});
		if (saved) reset();
		setSubmitting(false); lock.current = false;
	}

	const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20';
	return <form onSubmit={submit} className="min-w-0 max-w-full space-y-4.5">
		<p className="text-sm leading-relaxed text-slate-500">気づいた体調や様子と日時を、そのまま記録できます。</p>
		<div><label htmlFor="symptom-datetime" className="mb-1.5 block text-sm font-semibold text-slate-700">日時</label><input id="symptom-datetime" type="datetime-local" required value={datetime} onChange={(event) => setDatetime(event.target.value)} aria-invalid={attempted && Boolean(datetimeError)} aria-describedby={attempted && datetimeError ? 'symptom-datetime-error' : undefined} className="datetime-input h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pr-2.5 pl-3.5 text-sm text-slate-800 outline-none focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20" />{attempted && datetimeError && <p id="symptom-datetime-error" role="alert" className="mt-1.5 text-xs font-medium text-danger-strong">{datetimeError}</p>}</div>
		<fieldset aria-invalid={attempted && Boolean(symptomsError)} aria-describedby={attempted && symptomsError ? 'symptom-types-error' : undefined}><legend className="mb-2 block text-sm font-semibold text-slate-700">気になる体調</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{SYMPTOM_TYPES.map((symptom) => { const selected = symptoms.includes(symptom); return <button key={symptom} type="button" aria-pressed={selected} onClick={() => toggleSymptom(symptom)} className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-sm font-semibold leading-snug transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky ${selected ? 'border-brand-primary bg-brand-subtle text-brand-blue' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{selected && <Check size={15} strokeWidth={2.4} aria-hidden="true" className="shrink-0" />}<span className="break-words">{SYMPTOM_TYPE_LABELS[symptom]}</span></button>; })}</div>{attempted && symptomsError && <p id="symptom-types-error" role="alert" className="mt-1.5 text-xs font-medium text-danger-strong">{symptomsError}</p>}</fieldset>
		{symptoms.includes('other') && <div><label htmlFor="symptom-other" className="mb-1.5 block text-sm font-semibold text-slate-700">その他の様子</label><input id="symptom-other" value={otherSymptom} onChange={(event) => setOtherSymptom(event.target.value)} aria-invalid={attempted && Boolean(otherError)} aria-describedby={attempted && otherError ? 'symptom-other-error' : undefined} className={inputClass} />{attempted && otherError && <p id="symptom-other-error" role="alert" className="mt-1.5 text-xs font-medium text-danger-strong">{otherError}</p>}</div>}
		<div><label htmlFor="symptom-memo" className="mb-1.5 block text-sm font-semibold text-slate-700">メモ</label><textarea id="symptom-memo" rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} className={`${inputClass} resize-none`} /></div>
		<div className="space-y-2.5"><button type="submit" disabled={submitting} className="pc-button-primary w-full px-5 text-base">{submitting ? '保存中…' : isEditing ? '更新する' : '記録する'}</button>{isEditing && <button type="button" onClick={() => { reset(); onCancelEdit(); }} className="min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-sky">編集をキャンセル</button>}</div>
	</form>;
}
