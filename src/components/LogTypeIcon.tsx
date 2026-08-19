import { useId } from 'react';
import { Eye, Hospital, Pill, Scale, Scissors, Syringe } from 'lucide-react';
import type { LogType } from '../utils/logTypeMeta';
import mealIconSource from '../assets/icons/meal.svg?raw';
import pawIconSource from '../assets/icons/paw.svg?raw';
import poopIconSource from '../assets/icons/poop.svg?raw';

function getPathData(source: string) {
	return Array.from(source.matchAll(/<path[^>]*\sd="([^"]+)"/g), (match) => match[1]);
}

const poopPaths = getPathData(poopIconSource);
const mealPaths = getPathData(mealIconSource);
const pawPaths = getPathData(pawIconSource);

export type LogTypeIconProps = {
	kind: LogType;
	size?: number;
	className?: string;
};

export function LogTypeIcon({ kind, size = 20, className }: LogTypeIconProps) {
	const commonProps = { width: size, height: size, className, 'aria-hidden': true };
	const pawSymbolId = `paw-${useId().replaceAll(':', '')}`;

	if (kind === 'poop') return <svg {...commonProps} viewBox="0 0 512 512">{poopPaths.map((path, index) => <path key={index} d={path} fill="currentColor" />)}</svg>;
	if (kind === 'meal') return <svg {...commonProps} viewBox="0 52 512 400">{mealPaths.map((path, index) => <path key={index} d={path} fill="currentColor" />)}</svg>;
	if (kind === 'hospital') return <Hospital {...commonProps} strokeWidth={2} />;
	if (kind === 'medication') return <Pill {...commonProps} strokeWidth={2} />;
	if (kind === 'vaccine') return <Syringe {...commonProps} strokeWidth={2} />;
	if (kind === 'weight') return <Scale {...commonProps} strokeWidth={2} />;
	if (kind === 'grooming') return <Scissors {...commonProps} strokeWidth={2} />;
	if (kind === 'symptom') return <Eye {...commonProps} strokeWidth={2} />;

	return <svg {...commonProps} viewBox="0 0 1000 1000"><defs><g id={pawSymbolId}>{pawPaths.map((path, index) => <path key={index} d={path} fill="currentColor" />)}</g></defs><use href={`#${pawSymbolId}`} transform="translate(20 470) scale(.88) rotate(-8 256 256)" /><use href={`#${pawSymbolId}`} transform="translate(510 20) scale(.84) rotate(8 256 256)" /></svg>;
}
