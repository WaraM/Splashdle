import { get, writable } from 'svelte/store';
import type { ChampionKey, DDragonChampionFullResponse, DDragonChampionSummary, SplashRef, Vec2 } from '$lib/types';

export type DDragonStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DDragonState {
	status: DDragonStatus;
	version?: string;
	championsByKey: Record<ChampionKey, DDragonChampionSummary>;
	championKeys: ChampionKey[];
	/** Map numeric Riot key (e.g. "266") -> champion id (e.g. "Aatrox") */
	idByNumericKey?: Record<string, ChampionKey>;
	error?: string;
}

export const ddragon = writable<DDragonState>({
	status: 'idle',
	championsByKey: {},
	championKeys: [],
	idByNumericKey: {}
});

let loadPromise: Promise<void> | undefined;

const randomInt = (maxExclusive: number) => Math.floor(Math.random() * maxExclusive);

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

async function fetchLatestVersion(): Promise<string> {
	const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
	if (!res.ok) throw new Error(`Failed to fetch versions: ${res.status}`);
	const versions = (await res.json()) as unknown;
	if (!Array.isArray(versions) || typeof versions[0] !== 'string') {
		throw new Error('Invalid versions payload');
	}
	return versions[0];
}

async function fetchChampionFull(version: string): Promise<DDragonChampionFullResponse> {
	const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/championFull.json`);
	if (!res.ok) throw new Error(`Failed to fetch championFull.json: ${res.status}`);
	return (await res.json()) as DDragonChampionFullResponse;
}

export async function ensureDDragonLoaded(): Promise<void> {
	const current = get(ddragon);
	if (current.status === 'ready') return;
	if (loadPromise) return loadPromise;

	loadPromise = (async () => {
		ddragon.set({ status: 'loading', championsByKey: {}, championKeys: [] });
		try {
			const version = await fetchLatestVersion();
			const payload = await fetchChampionFull(version);
			const championsByKey: Record<ChampionKey, DDragonChampionSummary> = {};
			const championKeys: ChampionKey[] = [];
			const idByNumericKey: Record<string, ChampionKey> = {};

			for (const champ of Object.values(payload.data)) {
				championsByKey[champ.id] = champ;
				championKeys.push(champ.id);
				idByNumericKey[champ.key] = champ.id;
			}

			ddragon.set({
				status: 'ready',
				version,
				championsByKey,
				championKeys,
				idByNumericKey
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			ddragon.set({ status: 'error', championsByKey: {}, championKeys: [], idByNumericKey: {}, error: message });
		} finally {
			loadPromise = undefined;
		}
	})();

	return loadPromise;
}

export function pickRandomSplashRef(state: DDragonState = get(ddragon)): SplashRef {
	if (state.status !== 'ready' || state.championKeys.length === 0) {
		return { championKey: 'Aatrox', skinNum: 0 };
	}

	const candidates: SplashRef[] = [];
	for (const championKey of state.championKeys) {
		const skins = state.championsByKey[championKey]?.skins ?? [];
		for (const skin of skins) {
			if (skin.num === 0) continue;
			candidates.push({ championKey, skinNum: skin.num });
		}
	}

	if (candidates.length === 0) {
		const championKey = state.championKeys[randomInt(state.championKeys.length)]!;
		const champion = state.championsByKey[championKey];
		const skin = champion?.skins?.length ? champion.skins[randomInt(champion.skins.length)] : undefined;
		return { championKey, skinNum: skin?.num ?? 0 };
	}

	return candidates[randomInt(candidates.length)]!;
}

export function pickRandomFocus(): Vec2 {
	const pickAxis = () => {
		// Keep focus within [0.25, 0.75] so we don't reveal empty borders at MIN_ZOOM (1.5),
		// but bias away from the center to make early guesses harder.
		const edgeBiased = Math.random() < 0.85;
		if (edgeBiased) {
			return Math.random() < 0.5 ? randomBetween(0.25, 0.4) : randomBetween(0.6, 0.75);
		}
		// Rarely allow mid focus, but still avoid the dead-center band.
		const v = randomBetween(0.25, 0.75);
		if (v > 0.46 && v < 0.54) return v < 0.5 ? 0.46 : 0.54;
		return v;
	};

	return { x: pickAxis(), y: pickAxis() };
}

export function getSkinNameByNum(
	championId: ChampionKey,
	skinNum: number,
	state: DDragonState = get(ddragon)
): string | undefined {
	const champion = state.status === 'ready' ? state.championsByKey[championId] : undefined;
	const skin = champion?.skins?.find((s) => s.num === skinNum);
	return skin?.name;
}
