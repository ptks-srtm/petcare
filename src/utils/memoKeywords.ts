export type MemoKeywordDefinition = {
	id: string;
	label: string;
	patterns: readonly string[];
};

export type MemoKeywordCount = MemoKeywordDefinition & {
	count: number;
};

export const MEMO_KEYWORDS: readonly MemoKeywordDefinition[] = [
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
];

export function countMemoKeywords(memos: readonly string[], limit = 5): MemoKeywordCount[] {
	const counts = new Map<string, number>();
	for (const memo of memos) {
		const normalizedMemo = normalizeMemoText(memo);
		const matchedIds = new Set<string>();
		for (const keyword of MEMO_KEYWORDS) {
			if (keyword.patterns.some((pattern) => normalizedMemo.includes(normalizeMemoText(pattern)))) matchedIds.add(keyword.id);
		}
		for (const id of matchedIds) counts.set(id, (counts.get(id) ?? 0) + 1);
	}

	return MEMO_KEYWORDS
		.map((keyword) => ({ ...keyword, count: counts.get(keyword.id) ?? 0 }))
		.filter((keyword) => keyword.count > 0)
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}

function normalizeMemoText(value: string) {
	return value.normalize('NFKC').toLowerCase().trim();
}
