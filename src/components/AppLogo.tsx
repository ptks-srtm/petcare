import { Cat, Dog } from 'lucide-react';

type AppLogoProps = {
	size?: 'sm' | 'md' | 'lg';
	className?: string;
};

const sizeStyles = {
	sm: {
		container: 'size-9 rounded-xl',
		dog: 16,
		cat: 14,
	},
	md: {
		container: 'size-11 rounded-2xl',
		dog: 19,
		cat: 17,
	},
	lg: {
		container: 'size-14 rounded-2xl',
		dog: 24,
		cat: 22,
	},
} as const;

export default function AppLogo({ size = 'md', className = '' }: AppLogoProps) {
	const styles = sizeStyles[size];

	return (
		<span
			className={`flex shrink-0 items-center justify-center gap-0.5 bg-brand-subtle text-brand-primary ring-1 ring-border-soft ${styles.container} ${className}`.trim()}
			aria-hidden="true"
		>
			<Dog size={styles.dog} strokeWidth={1.8} />
			<Cat size={styles.cat} strokeWidth={1.8} />
		</span>
	);
}
