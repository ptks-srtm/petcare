import type { PetProfile, ProfileDefaultIconId } from '../types/profile';

export const PROFILE_DEFAULT_ICONS: ReadonlyArray<{
	id: ProfileDefaultIconId;
	label: string;
	src: string;
}> = [
	{ id: 'dog-line', label: '犬・ライン', src: '/icons/profile/dog-line.svg' },
	{ id: 'dog-fill', label: '犬・塗り', src: '/icons/profile/dog-fill.svg' },
	{ id: 'cat-line', label: '猫・ライン', src: '/icons/profile/cat-line.svg' },
	{ id: 'cat-fill', label: '猫・塗り', src: '/icons/profile/cat-fill.svg' },
];

const iconIds = new Set<ProfileDefaultIconId>(PROFILE_DEFAULT_ICONS.map(({ id }) => id));

export function isProfileDefaultIconId(value: unknown): value is ProfileDefaultIconId {
	return typeof value === 'string' && iconIds.has(value as ProfileDefaultIconId);
}

export function getProfileDefaultIconSrc(id: ProfileDefaultIconId) {
	return PROFILE_DEFAULT_ICONS.find((icon) => icon.id === id)?.src ?? PROFILE_DEFAULT_ICONS[0].src;
}

export function getProfileFallbackIconId(species?: PetProfile['species']): ProfileDefaultIconId {
	return species === 'cat' ? 'cat-line' : 'dog-line';
}

export function getProfileVisual(profile: Pick<PetProfile, 'name' | 'species' | 'photo' | 'defaultIconId'>) {
	if (profile.photo) return { src: profile.photo, alt: `${profile.name}のプロフィール画像`, isPhoto: true };
	const id = profile.defaultIconId ?? getProfileFallbackIconId(profile.species);
	return { src: getProfileDefaultIconSrc(id), alt: `${profile.name}のプロフィールアイコン`, isPhoto: false };
}
