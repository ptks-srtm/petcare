type DatedLog = { datetime: string };

export type LogGroup<T extends DatedLog> = {
	dateKey: string;
	label: string;
	logs: T[];
};

export function toLocalDateKey(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function sortLogsNewestFirst<T extends DatedLog>(logs: readonly T[]): T[] {
	return [...logs].sort(
		(a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
	);
}

export function formatLogTime(datetime: string) {
	return new Intl.DateTimeFormat('ja-JP', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(datetime));
}

export function formatLogDateLabel(datetime: string, referenceDate = new Date()) {
	const date = new Date(datetime);
	const dateKey = toLocalDateKey(date);
	const todayKey = toLocalDateKey(referenceDate);
	const yesterday = new Date(referenceDate);
	yesterday.setDate(referenceDate.getDate() - 1);

	if (dateKey === todayKey) return '今日';
	if (dateKey === toLocalDateKey(yesterday)) return '昨日';

	return new Intl.DateTimeFormat('ja-JP', {
		year: date.getFullYear() === referenceDate.getFullYear() ? undefined : 'numeric',
		month: 'numeric',
		day: 'numeric',
	}).format(date);
}

export function groupLogsByDate<T extends DatedLog>(logs: readonly T[]): LogGroup<T>[] {
	const groups = new Map<string, T[]>();

	for (const log of sortLogsNewestFirst(logs)) {
		const date = new Date(log.datetime);
		const dateKey = toLocalDateKey(date);
		const group = groups.get(dateKey);

		if (group) group.push(log);
		else groups.set(dateKey, [log]);
	}

	return Array.from(groups, ([dateKey, groupedLogs]) => ({
		dateKey,
		label: formatLogDateLabel(groupedLogs[0].datetime),
		logs: groupedLogs,
	}));
}
