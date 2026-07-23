import { PawPrint } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PetProfile } from '../types/profile';
import { formatPetAge } from '../utils/petAge';
import { loadPetProfile } from '../utils/profileStorage';
import { PETCARE_DATA_CHANGED_EVENT } from '../utils/dataBackup';
import { getProfileVisual } from '../utils/profileDefaultIcons';

export type PetProfilePanelProps = {
	variant: 'home' | 'settings';
};

const speciesLabels: Record<PetProfile['species'], string> = {
	dog: '犬',
	cat: '猫',
};

const sexLabels: Record<PetProfile['sex'], string> = {
	male: 'オス',
	female: 'メス',
};

function formatBirthday(birthday: string) {
	const [year, month, day] = birthday.split('-').map(Number);
	return `${year}年${month}月${day}日`;
}

export function PetProfilePanel({ variant }: PetProfilePanelProps) {
	const [profile, setProfile] = useState<PetProfile | null>(null);
	const [hasLoaded, setHasLoaded] = useState(false);

	useEffect(() => {
		const refresh = () => {
			setProfile(loadPetProfile());
			setHasLoaded(true);
		};
		refresh();
		window.addEventListener(PETCARE_DATA_CHANGED_EVENT, refresh);
		return () => window.removeEventListener(PETCARE_DATA_CHANGED_EVENT, refresh);
	}, []);

	if (!hasLoaded) {
		return <div aria-label="ペットプロフィールを読み込み中" className="pc-card pc-skeleton mb-5 h-28" />;
	}

	if (!profile) {
		const emptyState = (
			<div className="rounded-3xl border border-dashed border-border-soft bg-brand-subtle px-5 py-6 text-center">
				<div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-brand-primary ring-1 ring-border-soft" aria-hidden="true"><PawPrint size={23} strokeWidth={1.8} /></div>
				<h2 id={`${variant}-profile-title`} className="mt-3 text-base font-semibold text-slate-800">ペットプロフィールを登録しましょう</h2>
				<p className="mt-1.5 text-sm leading-relaxed text-slate-500">プロフィールを登録すると、ペットに合わせた管理ができます。</p>
				<a href="/settings/profile" className="pc-button-primary mt-4 px-5 text-sm">プロフィールを登録</a>
			</div>
		);

		if (variant === 'settings') {
			return (
				<section aria-labelledby="settings-profile-section-title">
					<h2 id="settings-profile-section-title" className="mb-3 px-1 text-lg font-semibold text-slate-800">ペットプロフィール</h2>
					{emptyState}
				</section>
			);
		}

		return (
			<section aria-labelledby="home-profile-title" className="mb-5">
				{emptyState}
			</section>
		);
	}

	const age = formatPetAge(profile.birthday);
	const visual = getProfileVisual(profile);

	if (variant === 'home') {
		return (
			<section aria-labelledby="home-pet-name" className="pc-card mb-5 flex items-center gap-3 p-4">
				<img src={visual.src} alt={visual.alt} className={`size-12 shrink-0 rounded-2xl ring-1 ring-border-soft ${visual.isPhoto ? 'object-cover' : 'bg-brand-subtle object-contain p-1.5'}`} />
				<div className="min-w-0 flex-1">
					<h2 id="home-pet-name" className="truncate text-base font-semibold text-slate-800">{profile.name}</h2>
					<p className="mt-0.5 truncate text-sm text-slate-500">{profile.breed || speciesLabels[profile.species]}・{age}・{sexLabels[profile.sex]}</p>
				</div>
				<a href="/settings/profile" aria-label="プロフィールを編集" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-sky/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sky">編集</a>
			</section>
		);
	}

	return (
		<section aria-labelledby="settings-profile-title">
			<h2 id="settings-profile-title" className="mb-3 px-1 text-lg font-semibold text-slate-800">ペットプロフィール</h2>
			<div className="pc-card p-5">
				<div className="flex items-center gap-4">
					<img src={visual.src} alt={visual.alt} className={`size-16 shrink-0 rounded-2xl ring-1 ring-border-soft ${visual.isPhoto ? 'object-cover' : 'bg-brand-subtle object-contain p-2'}`} />
					<div className="min-w-0">
						<p className="truncate text-xl font-semibold text-slate-800">{profile.name}</p>
						<p className="mt-1 text-sm text-slate-500">{speciesLabels[profile.species]}・{profile.breed}</p>
					</div>
				</div>

				<dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 text-sm">
					<div><dt className="text-xs text-slate-400">性別</dt><dd className="mt-0.5 font-medium text-slate-700">{sexLabels[profile.sex]}</dd></div>
					<div><dt className="text-xs text-slate-400">年齢</dt><dd className="mt-0.5 font-medium text-slate-700">{age}</dd></div>
					<div className="col-span-2"><dt className="text-xs text-slate-400">誕生日</dt><dd className="mt-0.5 font-medium text-slate-700">{formatBirthday(profile.birthday)}</dd></div>
				</dl>

				<a href="/settings/profile" className="pc-button-secondary mt-5 w-full px-4 text-sm">
					プロフィールを編集
				</a>
			</div>
		</section>
	);
}
