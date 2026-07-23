import type { ConsultationTopic, PetConsultationRequest, PetConsultationResponse } from '../types/consultation';

export interface PetConsultationClient {
	consult(payload: PetConsultationRequest): Promise<PetConsultationResponse>;
}

const topicLabels: Record<ConsultationTopic, string> = { poop: 'うんち', meal: 'ごはん', walk: 'さんぽ', overall: '全体的な体調', other: 'その他' };

function createObservations(payload: PetConsultationRequest) {
	const name = payload.pet.name ? `${payload.pet.name}さん` : 'ペット';
	if (payload.topic === 'poop') return [`${name}の直近7日間のうんちは${payload.summary.poop.total}回で、やわらかめ${payload.summary.poop.softCount}回、かため${payload.summary.poop.hardCount}回、食糞あり${payload.summary.poop.coprophagiaCount}回が記録されています。`, '記録だけで便の変化の原因を判断することはできません。'];
	if (payload.topic === 'meal') return [`${name}の直近7日間のごはんは${payload.summary.meal.total}回で、完食${payload.summary.meal.allCount}回、食べなかった記録は${payload.summary.meal.noneCount}回です。`, '食べた量の記録だけで食欲の変化の原因を判断することはできません。'];
	if (payload.topic === 'walk') return [`${name}の直近7日間のさんぽは${payload.summary.walk.count}回、合計${payload.summary.walk.totalMinutes}分です。`, '記録だけで歩行や行動の変化の原因を判断することはできません。'];
	return [`${name}の直近7日間には、うんち${payload.summary.poop.total}回、ごはん${payload.summary.meal.total}回、さんぽ${payload.summary.walk.count}回が記録されています。`, '記録は状況を整理する手がかりですが、体調の原因や診断を確定するものではありません。'];
}

export function createMockPetConsultationClient({ shouldFail = false, delayMs = 500 }: { shouldFail?: boolean; delayMs?: number } = {}): PetConsultationClient {
	return {
		async consult(payload) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			if (shouldFail) throw new Error('Mock consultation failed');
			const topic = topicLabels[payload.topic];
			return {
				summary: `${topic}についてのご相談「${payload.concern}」を、${payload.period.label}の記録と照らし合わせました。以下は診断ではなく、状況を整理するための参考情報です。`,
				observations: createObservations(payload),
				checkPoints: payload.topic === 'walk' ? ['気温や路面の状態、さんぽ前後の様子', '呼吸の速さ、歩き方、足を気にする様子', '休憩すると戻るか、元気や食欲にも変化があるか'] : ['食欲、元気、水分摂取の変化', '嘔吐、下痢、痛がる様子の有無', '変化が始まった時期と回数'],
				veterinaryGuidance: ['変化が続く、繰り返す、普段と明らかに違う場合は、記録した日時や回数と一緒に動物病院へ相談してください。', '心配が強い場合や判断に迷う場合も、早めに動物病院へ連絡してください。'],
				urgentSigns: ['呼吸が苦しそう、意識がもうろうとしている', '大量の出血、けいれん、立てないなど急な強い変化'],
				suggestedRecords: ['食欲・元気・水分摂取の様子', '症状や変化が起きた日時と続いた時間', 'うんち・ごはん・さんぽの回数や普段との違い'],
				disclaimer: 'この回答は診断や治療を行うものではありません。記録を整理し、受診時の確認ポイントを考えるための参考情報です。',
			};
		},
	};
}

export const mockPetConsultationClient = createMockPetConsultationClient();
