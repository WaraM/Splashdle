import type { DiscordContext } from '$lib/services/discord';
import type { GroupRoomState, Puzzle, SplashRef, Vec2, ChampionGuess, PuzzleSolve, PlayerInfo } from '$lib/types';

const apiBase = '/api/rooms';

export interface RemoteRoom {
	roomId: string;
	guildId: string;
	channelId: string;
	players: Record<string, PlayerInfo>;
	guesses: {
		playerId: string;
		displayName: string;
		championKey: string;
		at: number;
		attemptIndex: number;
	}[];
	puzzle?: Puzzle;
	createdAt?: number;
	updatedAt?: number;
}

export async function joinRoom(context: DiscordContext, puzzle?: Puzzle): Promise<RemoteRoom> {
	const res = await fetch(`${apiBase}/join`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			guildId: context.guildId,
			channelId: context.channelId,
			userId: context.userId,
			userName: context.userName,
			puzzle
		})
	});
	if (!res.ok) throw new Error(`Join failed: ${res.status}`);
	return (await res.json()) as RemoteRoom;
}

export async function sendGuess(context: DiscordContext, championKey: string): Promise<RemoteRoom> {
	const res = await fetch(`${apiBase}/guess`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			guildId: context.guildId,
			channelId: context.channelId,
			userId: context.userId,
			userName: context.userName,
			championKey
		})
	});
	if (!res.ok) throw new Error(`Guess failed: ${res.status}`);
	return (await res.json()) as RemoteRoom;
}

export async function setPuzzle(context: DiscordContext, puzzle: Puzzle): Promise<RemoteRoom> {
	const res = await fetch(`${apiBase}/puzzle`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			guildId: context.guildId,
			channelId: context.channelId,
			userId: context.userId,
			userName: context.userName,
			puzzle
		})
	});
	if (!res.ok) throw new Error(`Puzzle set failed: ${res.status}`);
	return (await res.json()) as RemoteRoom;
}

export function subscribeRoom(roomId: string, onEvent: (event: { type: string; payload: unknown }) => void): () => void {
	const source = new EventSource(`${apiBase}/stream?roomId=${encodeURIComponent(roomId)}`);
	source.onmessage = (ev) => {
		try {
			const parsed = JSON.parse(ev.data);
			onEvent(parsed);
		} catch {
			// ignore malformed
		}
	};
	source.onerror = () => {
		source.close();
	};
	return () => source.close();
}

export function buildGroupStateFromRemote(remote: RemoteRoom, current?: GroupRoomState): GroupRoomState {
	const fallbackSplash: SplashRef = remote.puzzle?.splash ?? { championKey: 'Aatrox', skinNum: 0 };
	const view: Vec2 = remote.puzzle?.view?.focus ?? { x: 0.5, y: 0.5 };
	const zoom = remote.puzzle?.view?.zoom ?? 3;
	let puzzle: Puzzle = remote.puzzle ?? { splash: fallbackSplash, view: { focus: view, zoom } };

	let solve: PuzzleSolve | undefined = current?.solve;
	let guesses: ChampionGuess[] = remote.guesses.map((g) => ({
		playerId: g.playerId,
		championKey: g.championKey,
		attemptIndex: g.attemptIndex,
		at: g.at
	}));

	// derive solve + view changes
	let derivedView = { ...puzzle.view };
	for (const g of guesses) {
		const correct = g.championKey === puzzle.splash.championKey;
		if (correct) {
			derivedView = { ...derivedView, zoom: 1, focus: { x: 0.5, y: 0.5 } };
			solve = { playerId: g.playerId, at: g.at, attemptIndex: g.attemptIndex };
		} else {
			derivedView = { ...derivedView, zoom: Math.max(1.6, derivedView.zoom - 0.25) };
		}
	}
	puzzle = { ...puzzle, view: derivedView };

	return {
		kind: 'group',
		connection: 'online',
		room: {
			roomId: remote.roomId,
			guildId: remote.guildId,
			channelId: remote.channelId,
			mode: 'group',
			createdAt: remote.createdAt ?? Date.now(),
			updatedAt: remote.updatedAt ?? Date.now(),
			players: remote.players,
			puzzle,
			guesses,
			solve
		}
	};
}
