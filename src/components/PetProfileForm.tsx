import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import type { PetProfile, ProfileDefaultIconId } from '../types/profile';
import { loadPetProfile, savePetProfile } from '../utils/profileStorage';
import { getProfileDefaultIconSrc, getProfileFallbackIconId, PROFILE_DEFAULT_ICONS } from '../utils/profileDefaultIcons';
import { prepareProfileImage, releaseProfileImage, type ProfileImageSource } from '../utils/profileImage';
import { ProfileImageCropDialog } from './ProfileImageCropDialog';

type Choice<T extends string> = { value: T; label: string };
type FormErrors = Partial<Record<'photo' | 'name' | 'species' | 'breed' | 'sex' | 'birthday' | 'form', string>>;

const speciesChoices: Choice<PetProfile['species']>[] = [
	{ value: 'dog', label: '犬' },
	{ value: 'cat', label: '猫' },
];

const sexChoices: Choice<PetProfile['sex']>[] = [
	{ value: 'male', label: 'オス' },
	{ value: 'female', label: 'メス' },
];

function createId() {
	if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTodayValue() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function PetProfileForm() {
	const [existingProfile, setExistingProfile] = useState<PetProfile | null>(null);
	const [name, setName] = useState('');
	const [species, setSpecies] = useState<PetProfile['species'] | ''>('');
	const [breed, setBreed] = useState('');
	const [sex, setSex] = useState<PetProfile['sex'] | ''>('');
	const [birthday, setBirthday] = useState('');
	const [photo, setPhoto] = useState<string | undefined>();
	const [defaultIconId, setDefaultIconId] = useState<ProfileDefaultIconId>('dog-line');
	const [cropSource, setCropSource] = useState<ProfileImageSource | null>(null);
	const [errors, setErrors] = useState<FormErrors>({});
	const [hasLoaded, setHasLoaded] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isProcessingImage, setIsProcessingImage] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const imageSelectButtonRef = useRef<HTMLButtonElement>(null);
	const today = getTodayValue();

	useEffect(() => {
		const profile = loadPetProfile();
		setExistingProfile(profile);
		if (profile) {
			setName(profile.name);
			setSpecies(profile.species);
			setBreed(profile.breed);
			setSex(profile.sex);
			setBirthday(profile.birthday);
			setPhoto(profile.photo);
			setDefaultIconId(profile.defaultIconId ?? getProfileFallbackIconId(profile.species));
		}
		setHasLoaded(true);
	}, []);

	function validate() {
		const nextErrors: FormErrors = {};
		if (!name.trim()) nextErrors.name = '名前を入力してください';
		if (!species) nextErrors.species = '動物を選択してください';
		if (!breed.trim()) nextErrors.breed = '種類・品種を入力してください';
		if (!sex) nextErrors.sex = '性別を選択してください';
		if (!birthday) nextErrors.birthday = '誕生日を入力してください';
		else if (birthday > today) nextErrors.birthday = '未来の日付は選択できません';
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}

	async function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setIsProcessingImage(true);
		setErrors((current) => ({ ...current, photo: undefined, form: undefined }));
		try {
			setCropSource(await prepareProfileImage(file));
		} catch (error) {
			setErrors((current) => ({ ...current, photo: error instanceof Error ? error.message : '画像の処理に失敗しました' }));
		} finally {
			setIsProcessingImage(false);
			event.target.value = '';
		}
	}

	function closeCropDialog() {
		releaseProfileImage(cropSource);
		setCropSource(null);
		requestAnimationFrame(() => imageSelectButtonRef.current?.focus());
	}

	function handleCroppedImage(dataUrl: string) {
		setPhoto(dataUrl);
		setErrors((current) => ({ ...current, photo: undefined, form: undefined }));
		closeCropDialog();
	}

	function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
		event.preventDefault();
		if (isSubmitting || !validate() || !species || !sex) return;

		setIsSubmitting(true);
		const profile: PetProfile = {
			id: existingProfile?.id ?? createId(),
			name: name.trim(),
			species,
			breed: breed.trim(),
			sex,
			birthday,
			...(photo ? { photo } : {}),
			defaultIconId,
		};

		if (!savePetProfile(profile)) {
			setErrors({ form: 'プロフィールを保存できませんでした。画像の容量が大きすぎる可能性があります' });
			setIsSubmitting(false);
			return;
		}

		window.location.assign('/settings');
	}

	if (!hasLoaded) return <div aria-label="プロフィールを読み込み中" className="pc-card pc-skeleton h-80" />;

	const choiceClass = (selected: boolean) => `min-h-11 rounded-xl border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky ${selected ? 'pc-choice-selected' : 'border-transparent bg-white text-slate-600 hover:bg-slate-50'}`;
	const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-sky focus:ring-3 focus:ring-brand-mint/20';

	return (
		<>
			<div className="mb-6 px-1">
				<a href="/settings" className="mb-4 inline-flex min-h-10 items-center gap-1 rounded-xl pr-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky"><ChevronLeft size={18} aria-hidden="true" />設定へ戻る</a>
				<h1 className="text-2xl font-semibold tracking-tight text-slate-800">{existingProfile ? 'プロフィール編集' : 'プロフィール登録'}</h1>
				<p className="mt-1.5 text-sm text-slate-500">ペットの基本情報を登録します</p>
			</div>

			<form onSubmit={handleSubmit} noValidate className="pc-card p-5">
				<div className="mb-5 flex flex-col items-center rounded-2xl bg-slate-50 px-4 py-5 text-center">
					<img src={photo ?? getProfileDefaultIconSrc(defaultIconId)} alt={photo ? 'ペットのプロフィール画像プレビュー' : '選択中のデフォルトプロフィールアイコン'} className={`size-24 rounded-2xl ring-1 ring-border-soft ${photo ? 'object-cover' : 'bg-white object-contain p-2.5'}`} />
					<input ref={fileInputRef} id="profile-photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="sr-only" aria-label="プロフィール画像を選択" aria-describedby={errors.photo ? 'profile-photo-error' : 'profile-photo-help'} />
					<div className="mt-3 flex flex-wrap justify-center gap-2">
						<button ref={imageSelectButtonRef} type="button" disabled={isProcessingImage} onClick={() => fileInputRef.current?.click()} className="pc-button-secondary px-4 text-sm disabled:cursor-wait disabled:bg-slate-100 disabled:text-slate-400">{isProcessingImage ? '画像を読み込み中…' : photo ? '画像を変更' : '画像を選ぶ'}</button>
						{photo && <button type="button" onClick={() => { setPhoto(undefined); setErrors((current) => ({ ...current, photo: undefined })); }} className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">アップロード画像を削除</button>}
					</div>
					<p id="profile-photo-help" className="mt-2 text-xs leading-relaxed text-slate-400">JPEG・PNG・WebP、10MB以下。正方形に調整して保存します</p>
					{errors.photo && <p id="profile-photo-error" role="alert" className="mt-2 text-xs font-medium text-rose-600">{errors.photo}</p>}
				</div>

				<fieldset className="mb-5">
					<legend className="text-sm font-semibold text-slate-700">デフォルトアイコン</legend>
					<p className="mt-1 text-xs leading-relaxed text-text-secondary">写真を登録していないときに表示されます</p>
					<div className="mt-3 grid grid-cols-4 gap-2">
						{PROFILE_DEFAULT_ICONS.map((icon) => {
							const selected = defaultIconId === icon.id;
							return <label key={icon.id} className={`relative flex min-w-0 cursor-pointer flex-col items-center rounded-2xl border p-2 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-sky ${selected ? 'border-brand-sky bg-brand-subtle' : 'border-border-soft bg-white hover:bg-slate-50'}`}>
								<input type="radio" name="profile-default-icon" value={icon.id} checked={selected} onChange={() => setDefaultIconId(icon.id)} className="sr-only" />
								<img src={icon.src} alt="" className="size-12 object-contain" />
								<span className={`mt-1 truncate text-[11px] font-semibold ${selected ? 'text-brand-primary' : 'text-slate-500'}`}>{icon.label}</span>
								{selected && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand-blue" />}
							</label>;
						})}
					</div>
				</fieldset>

				<div className="space-y-4.5">
					<div>
						<label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold text-slate-700">名前</label>
						<input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'profile-name-error' : undefined} className={inputClass} autoComplete="off" />
						{errors.name && <p id="profile-name-error" className="mt-1.5 text-xs font-medium text-rose-600">{errors.name}</p>}
					</div>

					<fieldset>
						<legend className="mb-1.5 text-sm font-semibold text-slate-700">動物</legend>
						<div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">{speciesChoices.map((choice) => <button key={choice.value} type="button" aria-pressed={species === choice.value} onClick={() => { setSpecies(choice.value); setErrors((current) => ({ ...current, species: undefined })); }} className={choiceClass(species === choice.value)}>{choice.label}</button>)}</div>
						{errors.species && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.species}</p>}
					</fieldset>

					<div>
						<label htmlFor="profile-breed" className="mb-1.5 block text-sm font-semibold text-slate-700">{species === 'cat' ? '猫種' : species === 'dog' ? '犬種' : '種類・品種'}</label>
						<input id="profile-breed" value={breed} onChange={(event) => setBreed(event.target.value)} aria-invalid={Boolean(errors.breed)} aria-describedby={errors.breed ? 'profile-breed-error' : undefined} className={inputClass} autoComplete="off" />
						{errors.breed && <p id="profile-breed-error" className="mt-1.5 text-xs font-medium text-rose-600">{errors.breed}</p>}
					</div>

					<fieldset>
						<legend className="mb-1.5 text-sm font-semibold text-slate-700">性別</legend>
						<div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">{sexChoices.map((choice) => <button key={choice.value} type="button" aria-pressed={sex === choice.value} onClick={() => { setSex(choice.value); setErrors((current) => ({ ...current, sex: undefined })); }} className={choiceClass(sex === choice.value)}>{choice.label}</button>)}</div>
						{errors.sex && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.sex}</p>}
					</fieldset>

					<div>
						<label htmlFor="profile-birthday" className="mb-1.5 block text-sm font-semibold text-slate-700">誕生日</label>
						<input id="profile-birthday" type="date" value={birthday} max={today} onChange={(event) => setBirthday(event.target.value)} aria-invalid={Boolean(errors.birthday)} aria-describedby={errors.birthday ? 'profile-birthday-error' : undefined} className={inputClass} />
						{errors.birthday && <p id="profile-birthday-error" className="mt-1.5 text-xs font-medium text-rose-600">{errors.birthday}</p>}
					</div>
				</div>

				{errors.form && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{errors.form}</p>}

				<div className="mt-6 space-y-2.5">
					<button type="submit" disabled={isSubmitting || isProcessingImage} className="pc-button-primary w-full px-5 text-base">{isSubmitting ? '保存中…' : '保存'}</button>
					<a href="/settings" className="flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">キャンセル</a>
				</div>
			</form>
			{cropSource && <ProfileImageCropDialog source={cropSource} onCancel={closeCropDialog} onSave={handleCroppedImage} />}
		</>
	);
}
