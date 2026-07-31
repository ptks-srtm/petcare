import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { NewPoopLog, PoopLog } from '../types/log';
import type { PoopLocationOption } from '../types/poopLocation';
import { getPoopLocationDisplayLabel, loadPoopLocationOptions, POOP_LOCATION_OPTIONS_CHANGED_EVENT, POOP_LOCATION_OPTIONS_STORAGE_KEY } from '../utils/poopLocationOptions';

export type LogFormProps = {
	initialValues?: PoopLog;
	isEditing: boolean;
	onSubmit: (log: NewPoopLog) => boolean;
	onCancelEdit: () => void;
};

type Condition = PoopLog['condition'];

const conditions: { value: Condition; label: string }[] = [
	{ value: 'normal', label: 'ふつう' },
	{ value: 'soft', label: 'やわらかめ' },
	{ value: 'hard', label: 'かため' },
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

export function LogForm({ initialValues, isEditing, onSubmit, onCancelEdit }: LogFormProps) {
	const [datetime, setDatetime] = useState(getCurrentLocalDatetime);
	const [condition, setCondition] = useState<Condition>('normal');
	const [coprophagia, setCoprophagia] = useState(false);
	const [location, setLocation] = useState<string | null>(null);
	const [locationOptions, setLocationOptions] = useState<PoopLocationOption[]>([]);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [memo, setMemo] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitLock = useRef(false);

	function resetForm() {
		setDatetime(getCurrentLocalDatetime());
		setCondition('normal');
		setCoprophagia(false);
		setLocation(null);
		setLocationError(null);
		setMemo('');
	}

	useEffect(() => {
		if (!initialValues) {
			resetForm();
			return;
		}

		setDatetime(toDatetimeLocal(initialValues.datetime));
		setCondition(initialValues.condition);
		setCoprophagia(initialValues.coprophagia);
		setLocation(initialValues.location);
		setMemo(initialValues.memo);
	}, [initialValues]);

	useEffect(() => {
		function refreshLocationOptions() {
			const nextOptions = loadPoopLocationOptions();
			setLocationOptions(nextOptions);
			setLocation((current) => {
				if (!current || initialValues) return current;
				return nextOptions.some((option) => option.label === current) ? current : null;
			});
		}

		function handleStorage(event: StorageEvent) {
			if (event.key === POOP_LOCATION_OPTIONS_STORAGE_KEY) refreshLocationOptions();
		}

		refreshLocationOptions();
		window.addEventListener(POOP_LOCATION_OPTIONS_CHANGED_EVENT, refreshLocationOptions);
		window.addEventListener('storage', handleStorage);
		return () => {
			window.removeEventListener(POOP_LOCATION_OPTIONS_CHANGED_EVENT, refreshLocationOptions);
			window.removeEventListener('storage', handleStorage);
		};
	}, [initialValues]);

	function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
		event.preventDefault();
		if (!location) {
			setLocationError('うんちをした場所を選んでください。');
			return;
		}
		if (submitLock.current) return;

		submitLock.current = true;
		setIsSubmitting(true);

		const didSave = onSubmit({ datetime, condition, coprophagia, location, memo });
		if (didSave) {
			resetForm();
		}

		setIsSubmitting(false);
		submitLock.current = false;
	}

	const segmentClass = (selected: boolean) =>
		`min-h-11 rounded-xl px-3 text-sm font-semibold transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky active:translate-y-px ${
			selected
				? 'pc-choice-selected ring-1 ring-inset ring-brand-sky/35'
				: 'bg-white text-slate-600 hover:bg-slate-50'
		}`;
	const currentLocationLabel = location ? getPoopLocationDisplayLabel(location) : null;
	const hasCurrentLocation = currentLocationLabel ? locationOptions.some((option) => option.label === currentLocationLabel) : true;
	const displayedLocationOptions = [
		...(!hasCurrentLocation && location && currentLocationLabel ? [{ id: `past-${location}`, label: currentLocationLabel, value: location, isPast: true }] : []),
		...locationOptions.map((option) => ({ ...option, value: option.label, isPast: false })),
	];

	return (
		<form onSubmit={handleSubmit} className="space-y-4.5">
			<div>
				<label htmlFor="datetime" className="mb-1.5 block text-sm font-semibold text-slate-700">
					日時
				</label>
				<input
					id="datetime"
					name="datetime"
					type="datetime-local"
					required
					value={datetime}
					onChange={(event) => setDatetime(event.target.value)}
					className="datetime-input h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pr-2.5 pl-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20"
				/>
			</div>

			<fieldset>
				<legend className="mb-1.5 text-sm font-semibold text-slate-700">うんちの状態</legend>
				<div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1" role="group">
					{conditions.map((item) => (
						<button
							key={item.value}
							type="button"
							aria-pressed={condition === item.value}
							onClick={() => setCondition(item.value)}
							className={segmentClass(condition === item.value)}
						>
							{item.label}
						</button>
					))}
				</div>
			</fieldset>

			<fieldset>
				<legend className="mb-1.5 text-sm font-semibold text-slate-700">食糞</legend>
				<div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="group">
					{[
						{ value: false, label: 'なし' },
						{ value: true, label: 'あり' },
					].map((item) => (
						<button
							key={item.label}
							type="button"
							aria-pressed={coprophagia === item.value}
							onClick={() => setCoprophagia(item.value)}
							className={segmentClass(coprophagia === item.value)}
						>
							{item.label}
						</button>
					))}
				</div>
			</fieldset>

			<fieldset aria-invalid={Boolean(locationError)} aria-describedby={locationError ? 'location-error' : undefined}>
				<legend className="mb-1.5 text-sm font-semibold text-slate-700">うんちをした場所</legend>
				{displayedLocationOptions.length > 0 ? <div className="grid grid-cols-2 gap-2" role="group">
					{displayedLocationOptions.map((item) => {
						const isSelected = location === item.value || Boolean(isEditing && location && getPoopLocationDisplayLabel(location) === item.label);
						return (
						<button
							key={item.id}
							type="button"
							aria-pressed={isSelected}
							onClick={() => {
								setLocation(item.value);
								setLocationError(null);
							}}
							className={`min-h-12 rounded-xl border px-4 text-sm font-semibold transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky active:translate-y-px ${
							isSelected
									? 'pc-choice-selected'
									: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
							}`}
						>
							<span>{item.label}</span>{item.isPast && <span className="ml-1 text-[10px] font-medium opacity-75">過去の設定</span>}
						</button>
						);
					})}
				</div> : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center"><p className="text-sm font-semibold text-slate-700">場所がまだ登録されていません</p><p className="mt-1 text-xs leading-relaxed text-slate-500">場所を追加すると、ここから選べるようになります。</p></div>}
				{locationError && <p id="location-error" role="alert" className="mt-2 text-sm font-medium text-danger-strong">{locationError}</p>}
				<a href="/settings/poop-locations" className="mt-2 inline-flex min-h-9 items-center rounded-lg px-1.5 text-xs font-semibold text-brand-blue transition hover:bg-brand-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">
					{displayedLocationOptions.length > 0 ? '場所を追加・編集' : '場所を追加する'}
				</a>
			</fieldset>

			<div>
				<label htmlFor="memo" className="mb-1.5 block text-sm font-semibold text-slate-700">
					メモ
				</label>
				<textarea
					id="memo"
					name="memo"
					rows={3}
					value={memo}
					onChange={(event) => setMemo(event.target.value)}
					placeholder="今日の様子を自由に入力できます"
					className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20"
				/>
			</div>

			<div className="space-y-2.5">
				<button
					type="submit"
					disabled={isSubmitting}
					className="pc-button-primary w-full px-5 text-base"
				>
					{isSubmitting ? '保存中…' : isEditing ? '更新する' : '記録する'}
				</button>

				{isEditing && (
					<button
						type="button"
						onClick={() => {
							resetForm();
							onCancelEdit();
						}}
						className="min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky"
					>
						編集をキャンセル
					</button>
				)}
			</div>
		</form>
	);
}
