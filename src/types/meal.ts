export type MealLog = {
	id: string;
	datetime: string;
	mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
	intake: 'all' | 'most' | 'half' | 'little' | 'none';
	memo?: string;
};

export type NewMealLog = Omit<MealLog, 'id'>;
