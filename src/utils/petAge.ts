function parseLocalDate(value: string) {
	const [year, month, day] = value.split('-').map(Number);
	return { year, month, day };
}

export function calculateAgeInMonths(birthday: string, referenceDate = new Date()) {
	const birth = parseLocalDate(birthday);
	if (![birth.year, birth.month, birth.day].every(Number.isFinite)) return 0;

	let months =
		(referenceDate.getFullYear() - birth.year) * 12 +
		(referenceDate.getMonth() + 1 - birth.month);

	if (referenceDate.getDate() < birth.day) months -= 1;
	return Math.max(0, months);
}

export function formatPetAge(birthday: string, referenceDate = new Date()) {
	const totalMonths = calculateAgeInMonths(birthday, referenceDate);
	const years = Math.floor(totalMonths / 12);
	const months = totalMonths % 12;

	if (years === 0) return `${months}か月`;
	if (months === 0) return `${years}歳`;
	return `${years}歳${months}か月`;
}
