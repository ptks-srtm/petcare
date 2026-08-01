import { ChevronDown, MessageCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { NewPoopLog, PoopLog } from '../types/log';
import type { MealLog, NewMealLog } from '../types/meal';
import type { NewWalkLog, WalkLog } from '../types/walk';
import type { HospitalLog, NewHospitalLog } from '../types/hospital';
import type { NewWeightLog, WeightLog } from '../types/weight';
import type { MedicationLog, NewMedicationLog } from '../types/medication';
import type { NewVaccineLog, VaccineLog } from '../types/vaccine';
import type { GroomingLog, NewGroomingLog } from '../types/grooming';
import { combineHealthLogs, type HealthLogKind, type HealthLogTarget } from '../utils/healthLog';
import { getHealthInsight, getLast7DaysSummary, getTodaySummary } from '../utils/healthSummary';
import { sortLogsNewestFirst } from '../utils/logDate';
import { LOG_TYPE_META } from '../utils/logTypeMeta';
import { deleteMealLog, loadMealLogs, saveMealLogs, updateMealLog } from '../utils/mealStorage';
import { deletePoopLog, loadPoopLogs, savePoopLogs, updatePoopLog } from '../utils/storage';
import { deleteWalkLog, loadWalkLogs, saveWalkLogs, updateWalkLog } from '../utils/walkStorage';
import { deleteHospitalLog, loadHospitalLogs, saveHospitalLogs, updateHospitalLog } from '../utils/hospitalStorage';
import { deleteWeightLog, loadWeightLogs, saveWeightLogs, updateWeightLog } from '../utils/weightStorage';
import { deleteMedicationLog, loadMedicationLogs, saveMedicationLogs, updateMedicationLog } from '../utils/medicationStorage';
import { deleteVaccineLog, loadVaccineLogs, saveVaccineLogs, updateVaccineLog } from '../utils/vaccineStorage';
import { deleteGroomingLog, loadGroomingLogs, saveGroomingLogs, updateGroomingLog } from '../utils/groomingStorage';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { EmptyState } from './EmptyState';
import { HealthSummarySection } from './HealthSummarySection';
import { LogForm } from './LogForm';
import { LogList } from './LogList';
import { LogTypeIcon } from './LogTypeIcon';
import { MealForm } from './MealForm';
import { Toast } from './Toast';
import { WalkForm } from './WalkForm';
import { HospitalForm } from './HospitalForm';
import { WeightForm } from './WeightForm';
import { MedicationForm } from './MedicationForm';
import { VaccineForm } from './VaccineForm';
import { GroomingForm } from './GroomingForm';

type Feedback = { message: string; isError?: boolean } | null;
type RecorderKind = HealthLogKind;
const CARE_LOG_KINDS = new Set<HealthLogKind>(['hospital', 'medication', 'vaccine', 'weight', 'grooming']);

function createId() {
	if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isSameTarget(first: HealthLogTarget | null, second: HealthLogTarget) {
	return first?.kind === second.kind && first.id === second.id;
}

function notifyLogsChanged() {
	window.dispatchEvent(new Event('petcare:logs-changed'));
}

export type PoopLogAppProps = {
	view?: 'home' | 'history';
};

export function PoopLogApp({ view = 'home' }: PoopLogAppProps) {
	const [poopLogs, setPoopLogs] = useState<PoopLog[]>([]);
	const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
	const [walkLogs, setWalkLogs] = useState<WalkLog[]>([]);
	const [hospitalLogs, setHospitalLogs] = useState<HospitalLog[]>([]);
	const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
	const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
	const [vaccineLogs, setVaccineLogs] = useState<VaccineLog[]>([]);
	const [groomingLogs, setGroomingLogs] = useState<GroomingLog[]>([]);
	const [activeRecorder, setActiveRecorder] = useState<RecorderKind | null>(null);
	const [isCareRecordsOpen, setIsCareRecordsOpen] = useState(false);
	const [feedback, setFeedback] = useState<Feedback>(null);
	const [editingTarget, setEditingTarget] = useState<HealthLogTarget | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<HealthLogTarget | null>(null);
	const [hasLoaded, setHasLoaded] = useState(false);
	const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const formSectionRef = useRef<HTMLElement>(null);
	const editingPoopLog = editingTarget?.kind === 'poop' ? poopLogs.find((log) => log.id === editingTarget.id) : undefined;
	const editingMealLog = editingTarget?.kind === 'meal' ? mealLogs.find((log) => log.id === editingTarget.id) : undefined;
	const editingWalkLog = editingTarget?.kind === 'walk' ? walkLogs.find((log) => log.id === editingTarget.id) : undefined;
	const editingHospitalLog = editingTarget?.kind === 'hospital' ? hospitalLogs.find((log) => log.id === editingTarget.id) : undefined;
	const editingWeightLog = editingTarget?.kind === 'weight' ? weightLogs.find((log) => log.id === editingTarget.id) : undefined;
	const editingMedicationLog = editingTarget?.kind === 'medication' ? medicationLogs.find((log) => log.id === editingTarget.id) : undefined;
	const editingVaccineLog = editingTarget?.kind === 'vaccine' ? vaccineLogs.find((log) => log.id === editingTarget.id) : undefined;
	const editingGroomingLog = editingTarget?.kind === 'grooming' ? groomingLogs.find((log) => log.id === editingTarget.id) : undefined;
	const isEditing = Boolean(editingPoopLog || editingMealLog || editingWalkLog || editingHospitalLog || editingWeightLog || editingMedicationLog || editingVaccineLog || editingGroomingLog);

	useEffect(() => {
		setPoopLogs(sortLogsNewestFirst(loadPoopLogs()));
		setMealLogs(sortLogsNewestFirst(loadMealLogs()));
		setWalkLogs(sortLogsNewestFirst(loadWalkLogs()));
		setHospitalLogs(sortLogsNewestFirst(loadHospitalLogs()));
		setWeightLogs(sortLogsNewestFirst(loadWeightLogs()));
		setMedicationLogs(sortLogsNewestFirst(loadMedicationLogs()));
		setVaccineLogs(sortLogsNewestFirst(loadVaccineLogs()));
		setGroomingLogs(sortLogsNewestFirst(loadGroomingLogs()));
		setHasLoaded(true);
		const params = new URLSearchParams(window.location.search);
		if (params.get('dataReset') === '1') {
			showFeedback('すべてのデータを削除しました');
			window.history.replaceState({}, '', window.location.pathname);
		}
		return () => {
			if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
		};
	}, []);

	useEffect(() => {
		if (!editingTarget) return;
		const frame = requestAnimationFrame(() => {
			const form = formSectionRef.current;
			if (!form) return;
			const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
			form.focus({ preventScroll: true });
		});
		return () => cancelAnimationFrame(frame);
	}, [editingTarget]);

	function showFeedback(message: string, isError = false) {
		if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
		setFeedback({ message, isError });
		feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
	}

	function handleSubmitPoopLog(input: NewPoopLog) {
		if (editingTarget?.kind === 'poop') {
			const updatedLogs = updatePoopLog(poopLogs, { ...input, id: editingTarget.id });
			if (!updatedLogs) {
				showFeedback('保存できませんでした', true);
				return false;
			}
			setPoopLogs(sortLogsNewestFirst(updatedLogs));
			notifyLogsChanged();
			setEditingTarget(null);
			showFeedback('更新しました');
			return true;
		}

		const nextLog: PoopLog = { ...input, id: createId() };
		const nextLogs = sortLogsNewestFirst([nextLog, ...poopLogs]);
		if (!savePoopLogs(nextLogs)) {
			showFeedback('保存できませんでした', true);
			return false;
		}
		setPoopLogs(nextLogs);
		notifyLogsChanged();
		setActiveRecorder(null);
		showFeedback('記録しました');
		return true;
	}

	function handleSubmitMealLog(input: NewMealLog) {
		if (editingTarget?.kind === 'meal') {
			const updatedLogs = updateMealLog(mealLogs, { ...input, id: editingTarget.id });
			if (!updatedLogs) {
				showFeedback('保存できませんでした', true);
				return false;
			}
			setMealLogs(sortLogsNewestFirst(updatedLogs));
			notifyLogsChanged();
			setEditingTarget(null);
			showFeedback('更新しました');
			return true;
		}

		const nextLog: MealLog = { ...input, id: createId() };
		const nextLogs = sortLogsNewestFirst([nextLog, ...mealLogs]);
		if (!saveMealLogs(nextLogs)) {
			showFeedback('保存できませんでした', true);
			return false;
		}
		setMealLogs(nextLogs);
		notifyLogsChanged();
		setActiveRecorder(null);
		showFeedback('記録しました');
		return true;
	}

	function handleSubmitWalkLog(input: NewWalkLog) {
		if (editingTarget?.kind === 'walk') {
			const updatedLogs = updateWalkLog(walkLogs, { ...input, id: editingTarget.id });
			if (!updatedLogs) {
				showFeedback('保存できませんでした', true);
				return false;
			}
			setWalkLogs(sortLogsNewestFirst(updatedLogs));
			notifyLogsChanged();
			setEditingTarget(null);
			showFeedback('更新しました');
			return true;
		}

		const nextLog: WalkLog = { ...input, id: createId() };
		const nextLogs = sortLogsNewestFirst([nextLog, ...walkLogs]);
		if (!saveWalkLogs(nextLogs)) {
			showFeedback('保存できませんでした', true);
			return false;
		}
		setWalkLogs(nextLogs);
		notifyLogsChanged();
		setActiveRecorder(null);
		showFeedback('記録しました');
		return true;
	}

	function handleSubmitHospitalLog(input: NewHospitalLog) {
		if (editingTarget?.kind === 'hospital') {
			const updatedLogs = updateHospitalLog(hospitalLogs, { ...input, id: editingTarget.id });
			if (!updatedLogs) {
				showFeedback('保存できませんでした', true);
				return false;
			}
			setHospitalLogs(sortLogsNewestFirst(updatedLogs));
			notifyLogsChanged();
			setEditingTarget(null);
			showFeedback('更新しました');
			return true;
		}

		const nextLog: HospitalLog = { ...input, id: createId() };
		const nextLogs = sortLogsNewestFirst([nextLog, ...hospitalLogs]);
		if (!saveHospitalLogs(nextLogs)) {
			showFeedback('保存できませんでした', true);
			return false;
		}
		setHospitalLogs(nextLogs);
		notifyLogsChanged();
		setActiveRecorder(null);
		showFeedback('記録しました');
		return true;
	}

	function handleSubmitWeightLog(input: NewWeightLog) {
		if (editingTarget?.kind === 'weight') {
			const updatedLogs = updateWeightLog(weightLogs, { ...input, id: editingTarget.id });
			if (!updatedLogs) {
				showFeedback('保存できませんでした', true);
				return false;
			}
			setWeightLogs(sortLogsNewestFirst(updatedLogs));
			notifyLogsChanged();
			setEditingTarget(null);
			showFeedback('更新しました');
			return true;
		}

		const nextLog: WeightLog = { ...input, id: createId() };
		const nextLogs = sortLogsNewestFirst([nextLog, ...weightLogs]);
		if (!saveWeightLogs(nextLogs)) {
			showFeedback('保存できませんでした', true);
			return false;
		}
		setWeightLogs(nextLogs);
		notifyLogsChanged();
		setActiveRecorder(null);
		showFeedback('記録しました');
		return true;
	}

	function handleSubmitMedicationLog(input: NewMedicationLog) {
		if (editingTarget?.kind === 'medication') {
			const updated = updateMedicationLog(medicationLogs, { ...input, id: editingTarget.id });
			if (!updated) { showFeedback('保存できませんでした', true); return false; }
			setMedicationLogs(sortLogsNewestFirst(updated)); notifyLogsChanged(); setEditingTarget(null); showFeedback('更新しました'); return true;
		}
		const nextLogs = sortLogsNewestFirst([{ ...input, id: createId() }, ...medicationLogs]);
		if (!saveMedicationLogs(nextLogs)) { showFeedback('保存できませんでした', true); return false; }
		setMedicationLogs(nextLogs); notifyLogsChanged(); setActiveRecorder(null); showFeedback('記録しました'); return true;
	}

	function handleSubmitVaccineLog(input: NewVaccineLog) {
		if (editingTarget?.kind === 'vaccine') {
			const updated = updateVaccineLog(vaccineLogs, { ...input, id: editingTarget.id });
			if (!updated) { showFeedback('保存できませんでした', true); return false; }
			setVaccineLogs(sortLogsNewestFirst(updated)); notifyLogsChanged(); setEditingTarget(null); showFeedback('更新しました'); return true;
		}
		const nextLogs = sortLogsNewestFirst([{ ...input, id: createId() }, ...vaccineLogs]);
		if (!saveVaccineLogs(nextLogs)) { showFeedback('保存できませんでした', true); return false; }
		setVaccineLogs(nextLogs); notifyLogsChanged(); setActiveRecorder(null); showFeedback('記録しました'); return true;
	}

	function handleSubmitGroomingLog(input: NewGroomingLog) {
		if (editingTarget?.kind === 'grooming') {
			const updated = updateGroomingLog(groomingLogs, { ...input, id: editingTarget.id });
			if (!updated) { showFeedback('保存できませんでした', true); return false; }
			setGroomingLogs(sortLogsNewestFirst(updated)); notifyLogsChanged(); setEditingTarget(null); showFeedback('更新しました'); return true;
		}
		const nextLogs = sortLogsNewestFirst([{ ...input, id: createId() }, ...groomingLogs]);
		if (!saveGroomingLogs(nextLogs)) { showFeedback('保存できませんでした', true); return false; }
		setGroomingLogs(nextLogs); notifyLogsChanged(); setActiveRecorder(null); showFeedback('記録しました'); return true;
	}

	function handleStartEdit(target: HealthLogTarget) {
		setActiveRecorder(null);
		if (CARE_LOG_KINDS.has(target.kind)) setIsCareRecordsOpen(true);
		setEditingTarget(target);
	}

	function handleCareRecordsToggle() {
		const nextIsOpen = !isCareRecordsOpen;
		setIsCareRecordsOpen(nextIsOpen);
		if (!nextIsOpen && activeRecorder && CARE_LOG_KINDS.has(activeRecorder)) setActiveRecorder(null);
	}

	function handleRecorderToggle(kind: RecorderKind) {
		const nextRecorder = activeRecorder === kind ? null : kind;
		setActiveRecorder(nextRecorder);
		if (!nextRecorder) return;

		requestAnimationFrame(() => {
			const formSection = formSectionRef.current;
			if (!formSection) return;
			const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			formSection.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
		});
	}

	function handleConfirmDelete() {
		if (!deleteTarget) return;
		let deleted = false;
		switch (deleteTarget.kind) {
			case 'poop': { const next = deletePoopLog(poopLogs, deleteTarget.id); if (next) { setPoopLogs(sortLogsNewestFirst(next)); deleted = true; } break; }
			case 'meal': { const next = deleteMealLog(mealLogs, deleteTarget.id); if (next) { setMealLogs(sortLogsNewestFirst(next)); deleted = true; } break; }
			case 'walk': { const next = deleteWalkLog(walkLogs, deleteTarget.id); if (next) { setWalkLogs(sortLogsNewestFirst(next)); deleted = true; } break; }
			case 'hospital': { const next = deleteHospitalLog(hospitalLogs, deleteTarget.id); if (next) { setHospitalLogs(sortLogsNewestFirst(next)); deleted = true; } break; }
			case 'weight': { const next = deleteWeightLog(weightLogs, deleteTarget.id); if (next) { setWeightLogs(sortLogsNewestFirst(next)); deleted = true; } break; }
			case 'medication': { const next = deleteMedicationLog(medicationLogs, deleteTarget.id); if (next) { setMedicationLogs(sortLogsNewestFirst(next)); deleted = true; } break; }
			case 'vaccine': { const next = deleteVaccineLog(vaccineLogs, deleteTarget.id); if (next) { setVaccineLogs(sortLogsNewestFirst(next)); deleted = true; } break; }
			case 'grooming': { const next = deleteGroomingLog(groomingLogs, deleteTarget.id); if (next) { setGroomingLogs(sortLogsNewestFirst(next)); deleted = true; } break; }
		}
		if (!deleted) { showFeedback('削除できませんでした', true); return; }
		notifyLogsChanged();
		if (isSameTarget(editingTarget, deleteTarget)) setEditingTarget(null);
		setDeleteTarget(null);
		showFeedback('削除しました');
	}

	const isHistory = view === 'history';
	const combinedLogs = combineHealthLogs(poopLogs, mealLogs, walkLogs, hospitalLogs, weightLogs, medicationLogs, vaccineLogs, groomingLogs);
	const visibleLogs = isHistory ? combinedLogs : combinedLogs.slice(0, 5);
	const todaySummary = getTodaySummary(poopLogs, mealLogs, walkLogs);
	const weeklySummary = getLast7DaysSummary(poopLogs, mealLogs, walkLogs);
	const healthInsight = getHealthInsight(todaySummary, weeklySummary);
	const FormHeading = isHistory ? 'h2' : 'h1';
	const editKindLabel = editingTarget ? `${LOG_TYPE_META[editingTarget.kind].label}ログ` : '記録';

	const recorderGroups = [
		{
			id: 'daily-records',
			label: '毎日の記録',
			options: [
				{ kind: 'walk' as const, label: 'さんぽ', description: '時間や様子を記録できます' },
				{ kind: 'meal' as const, label: 'ごはん', description: '種類や食べた量を記録できます' },
				{ kind: 'poop' as const, label: 'うんち', description: '状態や場所を記録できます' },
			],
		},
		{
			id: 'care-records',
			label: 'ケアの記録',
			options: [
				{ kind: 'hospital' as const, label: '病院', description: '受診内容や費用を記録できます' },
				{ kind: 'medication' as const, label: 'お薬', description: '薬名や服用期間を記録できます' },
				{ kind: 'vaccine' as const, label: 'ワクチン', description: '接種内容や次回予定を記録できます' },
				{ kind: 'weight' as const, label: '体重', description: '体重と測定時の様子を記録できます' },
				{ kind: 'grooming' as const, label: 'お手入れ', description: 'ケア内容や次回予定を記録できます' },
			],
		},
	];

	function renderNewRecorder(kind: RecorderKind) {
		switch (kind) {
			case 'poop': return <LogForm isEditing={false} onSubmit={handleSubmitPoopLog} onCancelEdit={() => {}} />;
			case 'meal': return <MealForm isEditing={false} onSubmit={handleSubmitMealLog} onCancelEdit={() => {}} />;
			case 'walk': return <WalkForm isEditing={false} onSubmit={handleSubmitWalkLog} onCancelEdit={() => {}} />;
			case 'hospital': return <HospitalForm isEditing={false} onSubmit={handleSubmitHospitalLog} onCancelEdit={() => {}} />;
			case 'medication': return <MedicationForm isEditing={false} onSubmit={handleSubmitMedicationLog} onCancelEdit={() => {}} />;
			case 'vaccine': return <VaccineForm isEditing={false} onSubmit={handleSubmitVaccineLog} onCancelEdit={() => {}} />;
			case 'weight': return <WeightForm isEditing={false} onSubmit={handleSubmitWeightLog} onCancelEdit={() => {}} />;
			case 'grooming': return <GroomingForm isEditing={false} onSubmit={handleSubmitGroomingLog} onCancelEdit={() => {}} />;
		}
	}

	return (
		<>
			{!hasLoaded && <div aria-label="健康記録を読み込み中" className="space-y-5"><div className="pc-card pc-skeleton h-64 p-5" /><div className="pc-card pc-skeleton h-40 p-5" /></div>}

			{hasLoaded && (!isHistory || isEditing) && <section ref={formSectionRef} tabIndex={-1} aria-labelledby="new-log-title" className="pc-card min-w-0 max-w-full scroll-mt-4 p-5 outline-none focus-visible:ring-2 focus-visible:ring-brand-sky">
				<div className="mb-4">
					<FormHeading id="new-log-title" className="text-xl font-semibold tracking-tight text-slate-800">{isEditing ? `${editKindLabel}の編集` : '今日の記録'}</FormHeading>
					<p className="mt-1 text-sm leading-relaxed text-slate-500">{isEditing ? '内容を確認して更新できます' : '記録したい項目を選んでください'}</p>
				</div>

				{!isEditing && !isHistory && <div className="min-w-0 max-w-full space-y-5">
					{recorderGroups.map((group) => {
						const isCareGroup = group.id === 'care-records';
						const isGroupVisible = !isCareGroup || isCareRecordsOpen;
						return <section key={group.id} aria-labelledby={group.id}>
							{isCareGroup ? <button type="button" aria-expanded={isCareRecordsOpen} aria-controls="care-records-content" onClick={handleCareRecordsToggle} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky"><span id={group.id} className="text-sm font-semibold leading-5 text-slate-700">{group.label}</span><ChevronDown size={19} strokeWidth={1.8} aria-hidden="true" className={`shrink-0 text-slate-400 transition-transform ${isCareRecordsOpen ? 'rotate-180' : '-rotate-90'}`} /></button> : <h2 id={group.id} className="mb-2.5 text-sm font-semibold leading-5 text-slate-700">{group.label}</h2>}
							{isGroupVisible && <div id={isCareGroup ? 'care-records-content' : undefined} className={`${isCareGroup ? 'mt-2.5' : ''} space-y-2.5`}>{group.options.map(({ kind, label, description }) => {
							const isOpen = activeRecorder === kind;
							return <div key={kind} className={`min-w-0 max-w-full overflow-hidden rounded-2xl border transition ${isOpen ? 'border-brand-primary/45 bg-brand-subtle' : 'border-border-soft bg-white'}`}>
								<button type="button" aria-expanded={isOpen} aria-controls={`recorder-${kind}`} onClick={() => handleRecorderToggle(kind)} className={`flex min-h-16 w-full items-center gap-3 px-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-sky ${isOpen ? 'text-brand-blue' : 'hover:bg-slate-50'}`}>
									<span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl transition ${isOpen ? 'bg-white text-brand-primary ring-1 ring-brand-primary/25' : 'bg-brand-subtle text-brand-primary'}`}><LogTypeIcon kind={kind} size={23} /></span>
									<span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${isOpen ? 'text-brand-blue' : 'text-slate-800'}`}>{label}</span><span className={`mt-0.5 block text-xs ${isOpen ? 'text-brand-blue/70' : 'text-slate-400'}`}>{description}</span></span>
									<ChevronDown size={19} strokeWidth={1.8} aria-hidden="true" className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-brand-blue' : 'text-slate-400'}`} />
								</button>
								{isOpen && <div id={`recorder-${kind}`} className="min-w-0 max-w-full border-t border-slate-100 px-4 pt-4 pb-5">{renderNewRecorder(kind)}</div>}
							</div>;
							})}</div>}
						</section>;
					})}
				</div>}

				{editingPoopLog && <LogForm initialValues={editingPoopLog} isEditing onSubmit={handleSubmitPoopLog} onCancelEdit={() => setEditingTarget(null)} />}
				{editingMealLog && <MealForm initialValues={editingMealLog} isEditing onSubmit={handleSubmitMealLog} onCancelEdit={() => setEditingTarget(null)} />}
				{editingWalkLog && <WalkForm initialValues={editingWalkLog} isEditing onSubmit={handleSubmitWalkLog} onCancelEdit={() => setEditingTarget(null)} />}
				{editingHospitalLog && <HospitalForm initialValues={editingHospitalLog} isEditing onSubmit={handleSubmitHospitalLog} onCancelEdit={() => setEditingTarget(null)} />}
				{editingWeightLog && <WeightForm initialValues={editingWeightLog} isEditing onSubmit={handleSubmitWeightLog} onCancelEdit={() => setEditingTarget(null)} />}
				{editingMedicationLog && <MedicationForm initialValues={editingMedicationLog} isEditing onSubmit={handleSubmitMedicationLog} onCancelEdit={() => setEditingTarget(null)} />}
				{editingVaccineLog && <VaccineForm initialValues={editingVaccineLog} isEditing onSubmit={handleSubmitVaccineLog} onCancelEdit={() => setEditingTarget(null)} />}
				{editingGroomingLog && <GroomingForm initialValues={editingGroomingLog} isEditing onSubmit={handleSubmitGroomingLog} onCancelEdit={() => setEditingTarget(null)} />}
			</section>}

			<Toast message={feedback?.message ?? null} isError={feedback?.isError} placement="inline" />

			{hasLoaded && !isHistory && <HealthSummarySection section="weekly" today={todaySummary} weekly={weeklySummary} insight={healthInsight} />}

			{hasLoaded && !isHistory && <aside className="pc-card mt-5 flex items-center gap-3 p-4">
				<span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-primary"><MessageCircle size={21} strokeWidth={1.8} /></span>
				<div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-slate-800">記録についてAIに相談</h2><p className="mt-0.5 text-xs leading-relaxed text-slate-500">直近7日間の記録を整理して確認できます</p></div>
				<a href="/consult" className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold text-brand-blue focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">相談する</a>
			</aside>}

			{hasLoaded && <section aria-labelledby="log-list-title" className={isHistory && !isEditing ? '' : 'mt-8'}>
				{!isHistory && <div className="mb-4 flex items-center justify-between gap-4 px-1"><h2 id="log-list-title" className="text-xl font-semibold leading-snug tracking-tight text-slate-800">最近の記録</h2><a href="/logs" className="shrink-0 text-sm font-semibold text-brand-blue transition hover:text-brand-sky focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">すべて見る</a></div>}
				{isHistory && <h2 id="log-list-title" className="sr-only">日付ごとの健康記録</h2>}

				{combinedLogs.length > 0 ? <LogList logs={visibleLogs} onEdit={handleStartEdit} onRequestDelete={setDeleteTarget} /> : <EmptyState description={isHistory ? 'ホームから最初の記録を追加してみましょう。' : '上のメニューから最初の記録を追加してみましょう。'} action={isHistory ? <a href="/#new-log-title" className="pc-button-primary px-5 text-sm">記録する</a> : undefined} />}
			</section>}

			{deleteTarget && <DeleteConfirmDialog onCancel={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />}
		</>
	);
}
