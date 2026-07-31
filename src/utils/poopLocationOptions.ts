import type { PoopLocationOption } from '../types/poopLocation';

export const POOP_LOCATION_OPTIONS_STORAGE_KEY = 'petcare:poop-location-options';
export const POOP_LOCATION_OPTIONS_CHANGED_EVENT = 'petcare:poop-location-options-changed';
export const POOP_LOCATION_LABEL_MAX_LENGTH = 20;

const legacyLocationLabels: Record<string, string> = { cage: 'ケージ内', hallway: '廊下', walk: '散歩', accident: '失敗' };

export type PoopLocationMutationResult =
	| { ok: true; options: PoopLocationOption[] }
	| { ok: false; options: PoopLocationOption[]; error: string };

function getLocalStorage(): Storage | null {
	if (typeof window === 'undefined') return null;
	try { return window.localStorage; } catch { return null; }
}

function isOption(value: unknown): value is PoopLocationOption {
	if (!value || typeof value !== 'object') return false;
	const option = value as Record<string, unknown>;
	return typeof option.id === 'string' && option.id.length > 0 && typeof option.label === 'string' && option.label.trim() === option.label && option.label.length > 0 && option.label.length <= POOP_LOCATION_LABEL_MAX_LENGTH;
}

export function isValidPoopLocationOptionList(value: unknown): value is PoopLocationOption[] {
	if (!Array.isArray(value) || !value.every(isOption)) return false;
	return new Set(value.map((option) => option.id)).size === value.length && new Set(value.map((option) => option.label)).size === value.length;
}

function createId() {
	if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
	return `location-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function saveOptions(options: readonly PoopLocationOption[]): boolean {
	const storage = getLocalStorage();
	if (!storage) return false;
	try {
		storage.setItem(POOP_LOCATION_OPTIONS_STORAGE_KEY, JSON.stringify(options));
		window.dispatchEvent(new CustomEvent(POOP_LOCATION_OPTIONS_CHANGED_EVENT));
		return true;
	} catch { return false; }
}

function normalizeAndValidateLabel(label: string, options: readonly PoopLocationOption[], excludedId?: string): { ok: true; label: string } | { ok: false; error: string } {
	const normalized = label.trim();
	if (!normalized) return { ok: false, error: '選択肢名を入力してください。' };
	if (normalized.length > POOP_LOCATION_LABEL_MAX_LENGTH) return { ok: false, error: `${POOP_LOCATION_LABEL_MAX_LENGTH}文字以内で入力してください。` };
	if (options.some((option) => option.id !== excludedId && option.label === normalized)) return { ok: false, error: '同じ名前の選択肢があります。' };
	return { ok: true, label: normalized };
}

export function getPoopLocationDisplayLabel(location: string) {
	return legacyLocationLabels[location] ?? location;
}

export function loadPoopLocationOptions(): PoopLocationOption[] {
	const storage = getLocalStorage();
	if (!storage) return [];
	try {
		const stored = storage.getItem(POOP_LOCATION_OPTIONS_STORAGE_KEY);
		if (stored) {
			const parsed: unknown = JSON.parse(stored);
			if (isValidPoopLocationOptionList(parsed)) return parsed;
		}
		const initialOptions: PoopLocationOption[] = [];
		if (stored === null) storage.setItem(POOP_LOCATION_OPTIONS_STORAGE_KEY, JSON.stringify(initialOptions));
		return initialOptions;
	} catch { return []; }
}

export function addPoopLocationOption(options: readonly PoopLocationOption[], input: string): PoopLocationMutationResult {
	const validation = normalizeAndValidateLabel(input, options);
	if (!validation.ok) return { ok: false, options: [...options], error: validation.error };
	const nextOptions = [...options, { id: createId(), label: validation.label }];
	return saveOptions(nextOptions) ? { ok: true, options: nextOptions } : { ok: false, options: [...options], error: '選択肢を保存できませんでした。' };
}

export function updatePoopLocationOption(options: readonly PoopLocationOption[], id: string, input: string): PoopLocationMutationResult {
	if (!options.some((option) => option.id === id)) return { ok: false, options: [...options], error: '編集する選択肢が見つかりません。' };
	const validation = normalizeAndValidateLabel(input, options, id);
	if (!validation.ok) return { ok: false, options: [...options], error: validation.error };
	const nextOptions = options.map((option) => option.id === id ? { ...option, label: validation.label } : option);
	return saveOptions(nextOptions) ? { ok: true, options: nextOptions } : { ok: false, options: [...options], error: '選択肢を保存できませんでした。' };
}

export function deletePoopLocationOption(options: readonly PoopLocationOption[], id: string): PoopLocationMutationResult {
	if (!options.some((option) => option.id === id)) return { ok: false, options: [...options], error: '削除する選択肢が見つかりません。' };
	const nextOptions = options.filter((option) => option.id !== id);
	return saveOptions(nextOptions) ? { ok: true, options: nextOptions } : { ok: false, options: [...options], error: '選択肢を削除できませんでした。' };
}
