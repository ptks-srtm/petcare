import { useEffect, useMemo, useRef, useState } from 'react';
import { AnalysisResultCard } from '../AnalysisResultCard';
import type { AnalysisData } from '../../types/analysis';
import type { ConsultationTopic, PetConsultationRequest, PetConsultationResponse } from '../../types/consultation';
import { buildPetConsultationRequest } from '../../utils/buildConsultationRequest';
import { loadGroomingLogs } from '../../utils/groomingStorage';
import { loadHospitalLogs } from '../../utils/hospitalStorage';
import { loadMealLogs } from '../../utils/mealStorage';
import { loadMedicationLogs } from '../../utils/medicationStorage';
import { mockPetConsultationClient, type PetConsultationClient } from '../../utils/mockConsultationClient';
import { loadPetProfile } from '../../utils/profileStorage';
import { loadPoopLogs } from '../../utils/storage';
import { loadVaccineLogs } from '../../utils/vaccineStorage';
import { loadWalkLogs } from '../../utils/walkStorage';
import { loadWeightLogs } from '../../utils/weightStorage';
import { ConsultationAnswer } from './ConsultationAnswer';
import { ConsultationContextSummary } from './ConsultationContextSummary';
import { ConsultationForm } from './ConsultationForm';

export function ConsultationApp({ client = mockPetConsultationClient }: { client?: PetConsultationClient }) {
	const [topic, setTopic] = useState<ConsultationTopic | null>(null);
	const [concern, setConcern] = useState('');
	const [context, setContext] = useState<PetConsultationRequest | null>(null);
	const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
	const [submittedRequest, setSubmittedRequest] = useState<PetConsultationRequest | null>(null);
	const [response, setResponse] = useState<PetConsultationResponse | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const answerRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const data = loadCurrentAnalysisData();
		setAnalysisData(data);
		setContext(buildCurrentRequest('overall', '', data));
	}, []);

	const displayContext = useMemo(() => context ? { ...context, topic: topic ?? context.topic, concern } : null, [concern, context, topic]);

	async function handleSubmit() {
		const trimmedConcern = concern.trim();
		if (!topic || !trimmedConcern || isSubmitting) return;
		setIsSubmitting(true);
		setError(null);
		const payload = buildCurrentRequest(topic, trimmedConcern, analysisData ?? loadCurrentAnalysisData());
		try {
			const nextResponse = await client.consult(payload);
			setSubmittedRequest(payload);
			setResponse(nextResponse);
			requestAnimationFrame(() => answerRef.current?.focus());
		} catch {
			setError('回答を取得できませんでした。時間をおいてもう一度お試しください。');
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleEdit() {
		setResponse(null);
		setSubmittedRequest(null);
		requestAnimationFrame(() => formRef.current?.focus());
	}

	function handleReset() {
		setTopic(null);
		setConcern('');
		setResponse(null);
		setSubmittedRequest(null);
		setError(null);
		requestAnimationFrame(() => formRef.current?.focus());
	}

	if (!displayContext) return <div role="status" aria-live="polite" aria-label="相談に使う記録を読み込み中" className="space-y-5"><div className="pc-card pc-skeleton h-80 p-5" /><div className="pc-card pc-skeleton h-64 p-5" /></div>;

	return <div className="space-y-5">
		{response && submittedRequest
			? <ConsultationAnswer answerRef={answerRef} request={submittedRequest} response={response} onEdit={handleEdit} onReset={handleReset} />
			: <div ref={formRef} tabIndex={-1} className="focus:outline-none"><ConsultationForm topic={topic} concern={concern} isSubmitting={isSubmitting} error={error} onTopicChange={setTopic} onConcernChange={setConcern} onSubmit={handleSubmit} /></div>}
		<ConsultationContextSummary request={response && submittedRequest ? submittedRequest : displayContext} />
		{analysisData && <AnalysisResultCard data={analysisData} />}
	</div>;
}

function buildCurrentRequest(topic: ConsultationTopic, concern: string, data: AnalysisData) {
	return buildPetConsultationRequest({
		topic,
		concern,
		profile: loadPetProfile(),
		poopLogs: data.poopLogs,
		mealLogs: data.mealLogs,
		walkLogs: data.walkLogs,
	});
}

function loadCurrentAnalysisData(): AnalysisData {
	return {
		poopLogs: loadPoopLogs(),
		mealLogs: loadMealLogs(),
		walkLogs: loadWalkLogs(),
		weightLogs: loadWeightLogs(),
		hospitalLogs: loadHospitalLogs(),
		medicationLogs: loadMedicationLogs(),
		vaccineLogs: loadVaccineLogs(),
		groomingLogs: loadGroomingLogs(),
	};
}
