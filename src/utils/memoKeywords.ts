export type MemoKeywordDefinition = {
	id: string;
	label: string;
	patterns: readonly string[];
};

export type MemoKeywordCount = MemoKeywordDefinition & {
	count: number;
};

export const MEMO_KEYWORDS = [
	{ id: 'morning', label: '朝', patterns: ['朝'] },
	{ id: 'night', label: '夜', patterns: ['夜'] },
	{ id: 'rain', label: '雨', patterns: ['雨', '雨天'] },
	{ id: 'snow', label: '雪', patterns: ['雪'] },
	{ id: 'hot', label: '暑い', patterns: ['暑い'] },
	{ id: 'cold', label: '寒い', patterns: ['寒い'] },
	{ id: 'thunder', label: '雷', patterns: ['雷'] },
	{ id: 'home-alone', label: '留守番', patterns: ['留守番'] },
	{ id: 'visitor', label: '来客', patterns: ['来客'] },
	{ id: 'travel', label: '旅行', patterns: ['旅行'] },
	{ id: 'park', label: '公園', patterns: ['公園'] },
	{ id: 'dog-run', label: 'ドッグラン', patterns: ['ドッグラン'] },
	{ id: 'hospital', label: '病院', patterns: ['病院'] },
	{ id: 'salon', label: 'サロン', patterns: ['サロン'] },
	{ id: 'snack', label: 'おやつ', patterns: ['おやつ'] },
	{ id: 'short-walk', label: '散歩短め', patterns: ['散歩短め', '散歩が短め', '散歩は短め'] },
	{ id: 'walk', label: '散歩', patterns: ['散歩'] },
	{ id: 'exercise', label: '運動', patterns: ['運動'] },
	{ id: 'meal', label: 'ごはん', patterns: ['ごはん'] },
	{ id: 'medicine', label: '薬', patterns: ['薬'] },
] as const satisfies readonly MemoKeywordDefinition[];

export const CUSTOM_MEMO_KEYWORDS_STORAGE_KEY = 'petcare:custom-keywords';
export const CUSTOM_MEMO_KEYWORDS_CHANGED_EVENT = 'petcare:custom-keywords-changed';
export const MEMO_KEYWORD_LABEL_MAX_LENGTH = 20;
export const CUSTOM_MEMO_KEYWORDS_MAX_COUNT = 30;

export type StandardMemoKeywordId = (typeof MEMO_KEYWORDS)[number]['id'];
export type MemoKeywordId = StandardMemoKeywordId | `custom:${string}`;
export type MemoKeyword = (typeof MEMO_KEYWORDS)[number];
export type MemoKeywordMutationResult =
	| { ok: true; keywords: MemoKeywordDefinition[] }
	| { ok: false; error: string };

export function getAllMemoKeywords(): MemoKeywordDefinition[] {
	return [...MEMO_KEYWORDS, ...loadCustomMemoKeywords()];
}

export function getMemoKeyword(keywordId: string, keywords: readonly MemoKeywordDefinition[] = getAllMemoKeywords()): MemoKeywordDefinition | null {
	return keywords.find((keyword) => keyword.id === keywordId) ?? null;
}

export function memoMatchesKeyword(memo: string, keywordId: MemoKeywordId, keywords: readonly MemoKeywordDefinition[] = getAllMemoKeywords()): boolean {
	const keyword = getMemoKeyword(keywordId, keywords);
	if (!keyword) return false;
	const normalizedMemo = normalizeMemoText(memo);
	return keyword.patterns.some((pattern) => normalizedMemo.includes(normalizeMemoText(pattern)));
}

export function countMemoKeywords(memos: readonly string[], limit = 5, keywords: readonly MemoKeywordDefinition[] = getAllMemoKeywords()): MemoKeywordCount[] {
	const counts = new Map<string, number>();
	for (const memo of memos) {
		const matchedIds = new Set<string>();
		for (const keyword of keywords) {
			if (memoMatchesKeyword(memo, keyword.id as MemoKeywordId, keywords)) matchedIds.add(keyword.id);
		}
		for (const id of matchedIds) counts.set(id, (counts.get(id) ?? 0) + 1);
	}

	return keywords
		.map((keyword) => ({ ...keyword, count: counts.get(keyword.id) ?? 0 }))
		.filter((keyword) => keyword.count > 0)
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}

export function loadCustomMemoKeywords(): MemoKeywordDefinition[] {
	const storage = getStorage();
	if (!storage) return [];
	try {
		const parsed: unknown = JSON.parse(storage.getItem(CUSTOM_MEMO_KEYWORDS_STORAGE_KEY) ?? '[]');
		return isValidCustomMemoKeywordList(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveCustomMemoKeywords(keywords: readonly MemoKeywordDefinition[]): boolean {
	const storage = getStorage();
	if (!storage || !isValidCustomMemoKeywordList(keywords)) return false;
	try {
		storage.setItem(CUSTOM_MEMO_KEYWORDS_STORAGE_KEY, JSON.stringify(keywords));
		window.dispatchEvent(new Event(CUSTOM_MEMO_KEYWORDS_CHANGED_EVENT));
		return true;
	} catch {
		return false;
	}
}

export function addCustomMemoKeyword(label: string): MemoKeywordMutationResult {
	const keywords = loadCustomMemoKeywords();
	const error = validateKeywordLabel(label, keywords);
	if (error) return { ok: false, error };
	if (keywords.length >= CUSTOM_MEMO_KEYWORDS_MAX_COUNT) return { ok: false, error: `追加できる注目語は${CUSTOM_MEMO_KEYWORDS_MAX_COUNT}件までです` };
	const trimmed = label.trim();
	const next = [...keywords, { id: createCustomKeywordId(), label: trimmed, patterns: [trimmed] }];
	return saveCustomMemoKeywords(next) ? { ok: true, keywords: next } : { ok: false, error: '注目語を保存できませんでした' };
}

export function updateCustomMemoKeyword(id: string, label: string): MemoKeywordMutationResult {
	const keywords = loadCustomMemoKeywords();
	if (!keywords.some((keyword) => keyword.id === id)) return { ok: false, error: '更新する注目語が見つかりません' };
	const error = validateKeywordLabel(label, keywords, id);
	if (error) return { ok: false, error };
	const trimmed = label.trim();
	const next = keywords.map((keyword) => keyword.id === id ? { ...keyword, label: trimmed, patterns: [trimmed] } : keyword);
	return saveCustomMemoKeywords(next) ? { ok: true, keywords: next } : { ok: false, error: '注目語を保存できませんでした' };
}

export function deleteCustomMemoKeyword(id: string): MemoKeywordMutationResult {
	const keywords = loadCustomMemoKeywords();
	if (!keywords.some((keyword) => keyword.id === id)) return { ok: false, error: '削除する注目語が見つかりません' };
	const next = keywords.filter((keyword) => keyword.id !== id);
	return saveCustomMemoKeywords(next) ? { ok: true, keywords: next } : { ok: false, error: '注目語を削除できませんでした' };
}

export function isValidCustomMemoKeywordList(value: unknown): value is MemoKeywordDefinition[] {
	return Array.isArray(value)
		&& value.length <= CUSTOM_MEMO_KEYWORDS_MAX_COUNT
		&& value.every((keyword) => isValidCustomMemoKeyword(keyword))
		&& new Set(value.map((keyword) => keyword.id)).size === value.length
		&& new Set(value.map((keyword) => normalizeMemoText(keyword.label))).size === value.length
		&& value.every((keyword) => !MEMO_KEYWORDS.some((standard) => normalizeMemoText(standard.label) === normalizeMemoText(keyword.label)));
}

function isValidCustomMemoKeyword(value: unknown): value is MemoKeywordDefinition {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const keyword = value as Record<string, unknown>;
	return typeof keyword.id === 'string'
		&& keyword.id.startsWith('custom:')
		&& typeof keyword.label === 'string'
		&& keyword.label === keyword.label.trim()
		&& keyword.label.length > 0
		&& keyword.label.length <= MEMO_KEYWORD_LABEL_MAX_LENGTH
		&& Array.isArray(keyword.patterns)
		&& keyword.patterns.length === 1
		&& keyword.patterns[0] === keyword.label;
}

function validateKeywordLabel(label: string, customKeywords: readonly MemoKeywordDefinition[], editingId?: string): string | null {
	const trimmed = label.trim();
	if (!trimmed) return '注目語を入力してください';
	if (trimmed.length > MEMO_KEYWORD_LABEL_MAX_LENGTH) return `注目語は${MEMO_KEYWORD_LABEL_MAX_LENGTH}文字以内で入力してください`;
	const normalized = normalizeMemoText(trimmed);
	const duplicate = [...MEMO_KEYWORDS, ...customKeywords.filter((keyword) => keyword.id !== editingId)]
		.some((keyword) => normalizeMemoText(keyword.label) === normalized);
	return duplicate ? '同じ注目語がすでに登録されています' : null;
}

function createCustomKeywordId(): `custom:${string}` {
	const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	return `custom:${suffix}`;
}

function getStorage(): Storage | null {
	if (typeof window === 'undefined') return null;
	try { return window.localStorage; } catch { return null; }
}

function normalizeMemoText(value: string) {
	return value.normalize('NFKC').toLowerCase().trim();
}
