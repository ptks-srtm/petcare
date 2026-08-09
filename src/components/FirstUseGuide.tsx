import { PawPrint } from 'lucide-react';

export function FirstUseGuide({ hasProfile }: { hasProfile: boolean }) {
	return <aside aria-labelledby="first-use-guide-title" className="pc-card pc-card-featured mb-5 p-5">
		<div className="flex items-start gap-3">
			<span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-subtle text-brand-primary"><PawPrint size={22} strokeWidth={1.8} /></span>
			<div className="min-w-0">
				<h2 id="first-use-guide-title" className="text-lg font-semibold text-slate-800">PetCareをはじめよう</h2>
				<p className="mt-1.5 text-sm leading-relaxed text-slate-600">まずは今日の様子を記録してみましょう。さんぽ・ごはん・うんちの記録から気軽に始められます。</p>
				{!hasProfile && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">プロフィールはあとから登録できます。</p>}
				<a href="#new-log-title" className="pc-button-primary mt-4 px-5 text-sm">毎日の記録を見る</a>
			</div>
		</div>
	</aside>;
}
