import { useEffect, useState } from 'react';
import { getHealthLogKey, type HealthLogEntry, type HealthLogTarget } from '../utils/healthLog';
import { groupLogsByDate, sortLogsNewestFirst } from '../utils/logDate';
import { HealthLogRow } from './HealthLogRow';

export type LogListProps = {
	logs: readonly HealthLogEntry[];
	onEdit: (target: HealthLogTarget) => void;
	onRequestDelete: (target: HealthLogTarget) => void;
};

export function LogList({ logs, onEdit, onRequestDelete }: LogListProps) {
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const sortedLogs = sortLogsNewestFirst(logs);
	const groupedLogs = groupLogsByDate(sortedLogs);

	useEffect(() => {
		if (!openMenuId) return;

		function handlePointerDown(event: PointerEvent) {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const menuRoot = target.closest('[data-log-menu-root]');
			if (menuRoot?.getAttribute('data-log-menu-root') !== openMenuId) {
				setOpenMenuId(null);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpenMenuId(null);
		}

		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [openMenuId]);

	function renderRow(entry: HealthLogEntry, index: number, groupLength: number) {
		const menuKey = getHealthLogKey(entry);
		return <HealthLogRow key={menuKey} entry={entry} menuKey={menuKey} isMenuOpen={openMenuId === menuKey} onToggleMenu={() => setOpenMenuId((current) => current === menuKey ? null : menuKey)} onCloseMenu={() => setOpenMenuId(null)} onEdit={onEdit} onRequestDelete={onRequestDelete} isLast={index === groupLength - 1} />;
	}

	return <div className="space-y-7">{groupedLogs.map((group) => <section key={group.dateKey} aria-labelledby={`log-date-${group.dateKey}`}><div className="mb-3 flex items-baseline justify-between px-1"><h2 id={`log-date-${group.dateKey}`} className="text-base font-semibold text-slate-800">{group.label}</h2><p className="text-xs font-medium text-slate-400">{group.logs.length}件</p></div><div className="pc-card overflow-visible">{group.logs.map((entry, index) => renderRow(entry, index, group.logs.length))}</div></section>)}</div>;
}
