import { formatLogDateLabel, formatLogTime } from '../../utils/logDate';
import { getPoopLocationDisplayLabel } from '../../utils/poopLocationOptions';
import type { ConsultationHealthLog, PetConsultationRequest } from '../../types/consultation';
import { formatPetAge } from '../../utils/petAge';
import { LOG_TYPE_META } from '../../utils/logTypeMeta';
import { ChevronDown } from 'lucide-react';
import { LogTypeIcon } from '../LogTypeIcon';

const speciesLabels = { dog: '犬', cat: '猫' } as const;
const sexLabels = { male: 'オス', female: 'メス' } as const;
const conditionLabels = { normal: 'ふつう', soft: 'やわらかめ', hard: 'かため' } as const;
const intakeLabels = { all: '完食', most: 'ほぼ完食', half: '半分くらい', little: '少しだけ', none: '食べなかった' } as const;

function logDescription(entry: ConsultationHealthLog) {
	if (entry.kind === 'poop') return `${conditionLabels[entry.log.condition]}・${getPoopLocationDisplayLabel(entry.log.location)}${entry.log.coprophagia ? '・食糞あり' : ''}`;
	if (entry.kind === 'meal') return intakeLabels[entry.log.intake];
	return `${entry.log.durationMinutes}分`;
}

export function ConsultationContextSummary({ request }: { request: PetConsultationRequest }) {
	const petRows = [
		request.pet.name && ['名前', request.pet.name],
		request.pet.species && ['動物', speciesLabels[request.pet.species]],
		request.pet.breed && ['種類・品種', request.pet.breed],
		request.pet.birthDate && ['年齢', formatPetAge(request.pet.birthDate)],
		request.pet.sex && ['性別', sexLabels[request.pet.sex]],
	].filter(Boolean) as string[][];
	const { summary } = request;
	return (
		<details className="pc-card group overflow-hidden">
			<summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-sky [&::-webkit-details-marker]:hidden"><span><span className="block text-base font-semibold text-slate-800">整理に使う記録</span><span className="mt-0.5 block text-xs text-slate-500">対象期間：{request.period.label}</span></span><ChevronDown size={19} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" /></summary>
			<div className="border-t border-slate-100 px-5 pt-4 pb-5">
			<div className="rounded-2xl border border-border-soft p-4"><h3 className="text-sm font-semibold text-slate-700">ペット情報</h3>{petRows.length ? <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">{petRows.map(([label, value]) => <div key={label} className="contents"><dt className="text-slate-400">{label}</dt><dd className="min-w-0 break-words font-medium text-slate-700">{value}</dd></div>)}</dl> : <p className="mt-2 text-sm text-slate-500">プロフィールは未登録です</p>}</div>
			<div className="mt-3 space-y-2">
				<div className="rounded-xl border border-border-soft bg-brand-subtle/50 p-3"><div className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-slate-700">うんち</span><strong className="text-lg tabular-nums text-slate-800">{summary.poop.total}回</strong></div><p className="mt-1 text-xs leading-relaxed text-slate-500">ふつう {summary.poop.normalCount}回・やわらかめ {summary.poop.softCount}回・かため {summary.poop.hardCount}回・食糞あり {summary.poop.coprophagiaCount}回</p></div>
				<div className="rounded-xl border border-border-soft bg-brand-subtle/50 p-3"><div className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-slate-700">ごはん</span><strong className="text-lg tabular-nums text-slate-800">{summary.meal.total}回</strong></div><p className="mt-1 text-xs leading-relaxed text-slate-500">完食 {summary.meal.allCount}回・ほぼ完食 {summary.meal.mostCount}回・半分くらい {summary.meal.halfCount}回・少しだけ {summary.meal.littleCount}回・食べなかった {summary.meal.noneCount}回</p></div>
				<div className="rounded-xl border border-border-soft bg-brand-subtle/50 p-3"><div className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-slate-700">さんぽ</span><strong className="text-lg tabular-nums text-slate-800">{summary.walk.count}回</strong></div><p className="mt-1 text-xs leading-relaxed text-slate-500">合計 {summary.walk.totalMinutes}分・1日平均 {summary.walk.averageMinutesPerDay}分</p></div>
			</div>
			{request.recentLogs.length === 0 && <div className="mt-3 rounded-2xl border border-dashed border-border-soft bg-white p-4"><p className="text-sm font-semibold text-slate-700">直近7日間の記録はありません。</p><p className="mt-1 text-xs leading-relaxed text-slate-500">相談内容は整理できますが、うんち・ごはん・さんぽを記録すると、より具体的な確認ポイントをまとめられます。</p></div>}
			{request.recentLogs.length > 0 && <details className="mt-3 rounded-2xl border border-border-soft bg-white"><summary className="min-h-12 cursor-pointer content-center px-4 text-sm font-semibold text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-sky">記録の詳細を見る（{request.recentLogs.length}件）</summary><div className="border-t border-slate-100">{request.recentLogs.map((entry) => <div key={`${entry.kind}-${entry.id}`} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"><time className="w-16 shrink-0 text-xs leading-relaxed text-slate-400">{formatLogDateLabel(entry.datetime)}<br />{formatLogTime(entry.datetime)}</time><span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-subtle text-brand-primary"><LogTypeIcon kind={entry.kind} size={17} /></span><div className="min-w-0"><p className="text-xs font-semibold text-slate-700">{LOG_TYPE_META[entry.kind].label}</p><p className="mt-0.5 break-words text-xs text-slate-500">{logDescription(entry)}</p></div></div>)}</div></details>}
			</div>
		</details>
	);
}
