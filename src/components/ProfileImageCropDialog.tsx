import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ProfileImageSource } from '../utils/profileImage';
import { createCroppedProfileImage, PROFILE_IMAGE_MAX_ZOOM } from '../utils/profileImage';

type ProfileImageCropDialogProps = {
	source: ProfileImageSource;
	onCancel: () => void;
	onSave: (dataUrl: string) => void;
};

const VIEWPORT_SIZE = 280;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function ProfileImageCropDialog({ source, onCancel, onSave }: ProfileImageCropDialogProps) {
	const [zoom, setZoom] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');
	const dialogRef = useRef<HTMLDivElement>(null);
	const cancelRef = useRef<HTMLButtonElement>(null);
	const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);

	const dimensions = useMemo(() => {
		const baseScale = Math.max(VIEWPORT_SIZE / source.width, VIEWPORT_SIZE / source.height);
		return {
			width: source.width * baseScale * zoom,
			height: source.height * baseScale * zoom,
		};
	}, [source, zoom]);

	function constrain(x: number, y: number) {
		const maxX = Math.max(0, (dimensions.width - VIEWPORT_SIZE) / 2);
		const maxY = Math.max(0, (dimensions.height - VIEWPORT_SIZE) / 2);
		return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
	}

	useEffect(() => {
		setOffset((current) => constrain(current.x, current.y));
	}, [dimensions.width, dimensions.height]);

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		cancelRef.current?.focus();
		return () => { document.body.style.overflow = previousOverflow; };
	}, []);

	function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape' && !isSaving) {
			event.preventDefault();
			onCancel();
			return;
		}
		if (event.key !== 'Tab') return;
		const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]') ?? [])];
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function moveByKeyboard(event: KeyboardEvent<HTMLDivElement>) {
		const delta = event.shiftKey ? 12 : 4;
		const movement = {
			ArrowLeft: { x: -delta, y: 0 },
			ArrowRight: { x: delta, y: 0 },
			ArrowUp: { x: 0, y: -delta },
			ArrowDown: { x: 0, y: delta },
		}[event.key];
		if (!movement) return;
		event.preventDefault();
		setOffset((current) => constrain(current.x + movement.x, current.y + movement.y));
	}

	function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
	}

	function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		setOffset(constrain(drag.offsetX + event.clientX - drag.x, drag.offsetY + event.clientY - drag.y));
	}

	function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
		if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
	}

	async function handleSave() {
		if (isSaving) return;
		setIsSaving(true);
		setError('');
		try {
			onSave(await createCroppedProfileImage(source, zoom, offset.x, offset.y, VIEWPORT_SIZE));
		} catch {
			setError('画像を保存用に処理できませんでした。別の画像をお試しください');
			setIsSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4 py-6" role="presentation">
			<div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title" aria-describedby="crop-dialog-help" onKeyDown={handleDialogKeyDown} className="pc-card w-full max-w-sm p-5">
				<h2 id="crop-dialog-title" className="text-lg font-semibold text-text-primary">画像の表示範囲を調整</h2>
				<p id="crop-dialog-help" className="mt-1 text-sm leading-relaxed text-text-secondary">画像をドラッグし、表示したい範囲に合わせてください。</p>

				<div className="mt-4 flex justify-center">
					<div
						role="application"
						tabIndex={0}
						aria-label="プロフィール画像の切り抜き範囲。矢印キーでも位置を調整できます"
						onKeyDown={moveByKeyboard}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerEnd}
						onPointerCancel={handlePointerEnd}
						className="relative size-[min(280px,calc(100vw-4.5rem))] touch-none overflow-hidden rounded-2xl bg-slate-100 outline-none ring-1 ring-border-soft focus-visible:ring-2 focus-visible:ring-brand-sky"
					>
						<img
							src={source.url}
							alt=""
							draggable={false}
							className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
							style={{
								width: dimensions.width,
								height: dimensions.height,
								transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
							}}
						/>
						<div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl ring-[999px] ring-slate-950/25" />
					</div>
				</div>

				<label htmlFor="profile-image-zoom" className="mt-5 flex items-center justify-between text-sm font-semibold text-slate-700">
					<span>拡大・縮小</span>
					<span className="text-xs font-medium tabular-nums text-text-secondary">{Math.round(zoom * 100)}%</span>
				</label>
				<input
					id="profile-image-zoom"
					type="range"
					min="1"
					max={PROFILE_IMAGE_MAX_ZOOM}
					step="0.01"
					value={zoom}
					onChange={(event) => setZoom(Number(event.target.value))}
					aria-valuetext={`${Math.round(zoom * 100)}%`}
					className="mt-2 w-full accent-brand-blue"
				/>
				{error && <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{error}</p>}
				<div className="mt-5 grid grid-cols-2 gap-2.5">
					<button ref={cancelRef} type="button" disabled={isSaving} onClick={onCancel} className="pc-button-secondary px-4 text-sm">キャンセル</button>
					<button type="button" disabled={isSaving} onClick={handleSave} className="pc-button-primary min-h-11 px-4 text-sm">{isSaving ? '処理中…' : 'この範囲で使う'}</button>
				</div>
			</div>
		</div>
	);
}
