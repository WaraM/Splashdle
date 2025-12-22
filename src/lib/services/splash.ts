import type { Vec2 } from '$lib/types';

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export function makeRandomFocus(): Vec2 {
	const pickAxis = () => {
		const edgeBiased = Math.random() < 0.85;
		if (edgeBiased) {
			return Math.random() < 0.5 ? randomBetween(0.25, 0.4) : randomBetween(0.6, 0.75);
		}
		const v = randomBetween(0.25, 0.75);
		if (v > 0.46 && v < 0.54) return v < 0.5 ? 0.46 : 0.54;
		return v;
	};

	return { x: pickAxis(), y: pickAxis() };
}
