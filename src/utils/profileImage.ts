export const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;
export const PROFILE_IMAGE_OUTPUT_SIZE = 512;
export const PROFILE_IMAGE_MAX_ZOOM = 3;
export const PROFILE_IMAGE_QUALITY = 0.82;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type ProfileImageSource = {
	url: string;
	width: number;
	height: number;
};

function loadImage(url: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('画像を読み込めませんでした'));
		image.src = url;
	});
}

export async function prepareProfileImage(file: File): Promise<ProfileImageSource> {
	if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('JPEG、PNG、WebP形式の画像を選択してください');
	if (file.size > MAX_PROFILE_IMAGE_BYTES) throw new Error('画像は10MB以下のものを選択してください');

	const url = URL.createObjectURL(file);
	try {
		const image = await loadImage(url);
		if (!image.naturalWidth || !image.naturalHeight) throw new Error('画像のサイズを確認できませんでした');
		return { url, width: image.naturalWidth, height: image.naturalHeight };
	} catch (error) {
		URL.revokeObjectURL(url);
		throw error instanceof Error ? error : new Error('画像の読み込みに失敗しました');
	}
}

export function releaseProfileImage(source: ProfileImageSource | null) {
	if (source) URL.revokeObjectURL(source.url);
}

export async function createCroppedProfileImage(
	source: ProfileImageSource,
	zoom: number,
	offsetX: number,
	offsetY: number,
	viewportSize: number,
): Promise<string> {
	const image = await loadImage(source.url);
	const baseScale = Math.max(viewportSize / source.width, viewportSize / source.height);
	const renderedScale = baseScale * zoom;
	const cropSize = viewportSize / renderedScale;
	const sourceX = source.width / 2 + (-viewportSize / 2 - offsetX) / renderedScale;
	const sourceY = source.height / 2 + (-viewportSize / 2 - offsetY) / renderedScale;

	const canvas = document.createElement('canvas');
	canvas.width = PROFILE_IMAGE_OUTPUT_SIZE;
	canvas.height = PROFILE_IMAGE_OUTPUT_SIZE;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('画像を処理できませんでした');

	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.drawImage(
		image,
		Math.max(0, sourceX),
		Math.max(0, sourceY),
		Math.min(cropSize, source.width),
		Math.min(cropSize, source.height),
		0,
		0,
		canvas.width,
		canvas.height,
	);

	const webp = canvas.toDataURL('image/webp', PROFILE_IMAGE_QUALITY);
	if (webp.startsWith('data:image/webp')) return webp;
	const jpeg = canvas.toDataURL('image/jpeg', PROFILE_IMAGE_QUALITY);
	if (!jpeg.startsWith('data:image/jpeg')) throw new Error('画像を圧縮できませんでした');
	return jpeg;
}
