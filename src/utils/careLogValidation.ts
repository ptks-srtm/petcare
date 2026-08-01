export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export function isOptionalNonEmptyString(value: unknown) {
	return value === undefined || isNonEmptyString(value);
}

export function isValidDatetime(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hour = Number(match[4]);
	const minute = Number(match[5]);
	if (month < 1 || month > 12 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
	const date = new Date(year, month - 1, day, hour, minute);
	return (
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day &&
		date.getHours() === hour &&
		date.getMinutes() === minute
	);
}

export function isValidDateValue(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isOptionalDateValue(value: unknown) {
	return value === undefined || isValidDateValue(value);
}

export function isOptionalCostYen(value: unknown) {
	return value === undefined || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}

export function optionalText(value: string) {
	const trimmed = value.trim();
	return trimmed || undefined;
}
