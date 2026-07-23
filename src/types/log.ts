/** 犬の排便記録。datetimeはISO 8601形式の文字列として扱う。 */
export type PoopLog = {
	id: string;
	datetime: string;
	condition: 'normal' | 'soft' | 'hard';
	coprophagia: boolean;
	/** 保存時点の排泄場所名。既存データでは旧コードが入る場合がある。 */
	location: string;
	memo: string;
};

/** 新規登録時にフォームから受け取る、ID発行前の排便記録。 */
export type NewPoopLog = Omit<PoopLog, 'id'>;
