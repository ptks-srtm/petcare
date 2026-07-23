export type ProfileDefaultIconId = 'dog-line' | 'dog-fill' | 'cat-line' | 'cat-fill';

export type PetProfile = {
	id: string;
	name: string;
	species: 'dog' | 'cat';
	breed: string;
	sex: 'male' | 'female';
	birthday: string;
	photo?: string;
	defaultIconId?: ProfileDefaultIconId;
};

export type NewPetProfile = Omit<PetProfile, 'id'>;
