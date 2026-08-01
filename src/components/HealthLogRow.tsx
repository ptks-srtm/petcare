import type { PoopLog } from '../types/log';
import type { MealLog } from '../types/meal';
import type { HealthLogEntry, HealthLogTarget } from '../utils/healthLog';
import { formatLogTime } from '../utils/logDate';
import { LOG_TYPE_META, type LogType } from '../utils/logTypeMeta';
import { getPoopLocationDisplayLabel } from '../utils/poopLocationOptions';
import { LogActionMenu } from './LogActionMenu';
import { LogTypeIcon } from './LogTypeIcon';

export type HealthLogRowProps = {
	entry: HealthLogEntry;
	menuKey: string;
	isMenuOpen: boolean;
	onToggleMenu: () => void;
	onCloseMenu: () => void;
	onEdit: (target: HealthLogTarget) => void;
	onRequestDelete: (target: HealthLogTarget) => void;
	isLast: boolean;
};

const conditionLabels: Record<PoopLog['condition'], string> = { normal: 'ふつう', soft: 'やわらかめ', hard: 'かため' };
const conditionStyles: Record<PoopLog['condition'], string> = { normal: 'border-emerald-100 bg-emerald-50 text-emerald-700', soft: 'border-amber-100 bg-amber-50 text-amber-700', hard: 'border-orange-100 bg-orange-50 text-orange-700' };
const mealTypeLabels: Record<MealLog['mealType'], string> = { breakfast: '朝ごはん', lunch: '昼ごはん', dinner: '夜ごはん', snack: 'おやつ', other: 'その他' };
const intakeLabels: Record<MealLog['intake'], string> = { all: '完食', most: 'ほぼ完食', half: '半分くらい', little: '少しだけ', none: '食べなかった' };

function LogKindLabel({ kind, className }: { kind: LogType; className: string }) {
	const { label } = LOG_TYPE_META[kind];
	return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${className}`}><span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg border border-border-soft bg-brand-subtle"><LogTypeIcon kind={kind} size={15} /></span>{label}</span>;
}

function LogDetails({ entry }: { entry: HealthLogEntry }) {
	if (entry.kind === 'poop') {
		return <><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><LogKindLabel kind="poop" className="text-brand-primary" /><span className={`pc-badge ${conditionStyles[entry.log.condition]}`}>{conditionLabels[entry.log.condition]}</span><span className="text-slate-500">{getPoopLocationDisplayLabel(entry.log.location)}</span>{entry.log.coprophagia && <span className="pc-badge border-rose-200 bg-danger-soft text-danger-strong">食糞あり</span>}</div>{entry.log.memo && <p className="mt-1.5 break-words text-sm leading-relaxed text-slate-500">{entry.log.memo}</p>}</>;
	}

	if (entry.kind === 'meal') {
		return <><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><LogKindLabel kind="meal" className="text-brand-primary" /><span className="font-semibold text-slate-800">{mealTypeLabels[entry.log.mealType]}</span><span className={`pc-badge ${entry.log.intake === 'none' ? 'border-rose-100 bg-danger-soft text-danger-strong' : 'border-sky-100 bg-brand-subtle text-brand-primary'}`}>{intakeLabels[entry.log.intake]}</span></div>{entry.log.memo && <p className="mt-1.5 break-words text-sm leading-relaxed text-slate-500">{entry.log.memo}</p>}</>;
	}

	if (entry.kind === 'walk') {
		return <><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><LogKindLabel kind="walk" className="text-brand-primary" /><span className="font-semibold text-slate-800">{entry.log.durationMinutes}分</span></div>{entry.log.memo && <p className="mt-1.5 break-words text-sm leading-relaxed text-slate-500">{entry.log.memo}</p>}</>;
	}

	const title = entry.log.hospitalName || entry.log.reason || '病院の記録';
	const formattedCost = entry.log.costYen === undefined ? null : `${new Intl.NumberFormat('ja-JP').format(entry.log.costYen)}円`;
	const formattedNextVisit = entry.log.nextVisitDate
		? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(`${entry.log.nextVisitDate}T00:00:00`))
		: null;
	return <>
		<div className="flex flex-wrap items-center gap-x-2 gap-y-1"><LogKindLabel kind="hospital" className="text-brand-primary" /><span className="font-semibold text-slate-800">{title}</span>{formattedCost && <span className="pc-badge border-sky-100 bg-brand-subtle text-brand-primary">{formattedCost}</span>}</div>
		{entry.log.hospitalName && entry.log.reason && <p className="mt-1.5 break-words text-sm leading-relaxed text-slate-600">{entry.log.reason}</p>}
		{formattedNextVisit && <p className="mt-1.5 text-xs font-medium text-slate-500">次回受診日：{formattedNextVisit}</p>}
		{entry.log.diagnosis && <p className="mt-2 break-words text-sm leading-relaxed text-slate-500"><span className="font-semibold text-slate-600">診断・説明：</span>{entry.log.diagnosis}</p>}
		{entry.log.prescription && <p className="mt-1.5 break-words text-sm leading-relaxed text-slate-500"><span className="font-semibold text-slate-600">処方薬：</span>{entry.log.prescription}</p>}
		{entry.log.memo && <p className="mt-1.5 break-words text-sm leading-relaxed text-slate-500"><span className="font-semibold text-slate-600">メモ：</span>{entry.log.memo}</p>}
	</>;
}

export function HealthLogRow({ entry, menuKey, isMenuOpen, onToggleMenu, onCloseMenu, onEdit, onRequestDelete, isLast }: HealthLogRowProps) {
	const target: HealthLogTarget = { kind: entry.kind, id: entry.id };
	return (
		<article className="grid grid-cols-[3.25rem_minmax(0,1fr)_2.75rem] items-start gap-x-3 px-4 py-4 sm:px-5">
			<div className="relative flex h-full min-h-11 justify-center">
				<time dateTime={entry.datetime} className="relative z-10 bg-white px-1 pt-1 text-sm font-semibold tabular-nums text-slate-600">{formatLogTime(entry.datetime)}</time>
				{!isLast && <span aria-hidden="true" className="absolute left-1/2 top-7 bottom-[-1rem] w-px -translate-x-1/2 bg-border-soft" />}
			</div>
			<div className="min-w-0 flex-1"><LogDetails entry={entry} /></div>
			<LogActionMenu menuKey={menuKey} isOpen={isMenuOpen} onToggle={onToggleMenu} onClose={onCloseMenu} onEdit={() => onEdit(target)} onRequestDelete={() => onRequestDelete(target)} />
		</article>
	);
}
