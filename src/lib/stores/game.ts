import { derived, get, writable } from 'svelte/store';
import type {
	ChampionGuess,
	CompetitiveRoomState,
	GameMode,
	GroupRoomState,
	PlayerId,
	PlayerInfo,
	Puzzle,
	RoomId,
	SkinGuess,
	Vec2
} from '$lib/types';
import { ddragon, ensureDDragonLoaded, getSkinNameByNum, pickRandomFocus, pickRandomSplashRef } from '$lib/stores/ddragon';
import { getDiscordContext } from '$lib/services/discord';
import { buildGroupStateFromRemote, joinRoom as joinRemoteRoom, sendGuess as sendRemoteGuess, setPuzzle as setRemotePuzzle, subscribeRoom } from '$lib/services/roomsClient';

export type ConnectionStatus = 'offline' | 'connecting' | 'online';

export type GamePanel = 'lobby' | 'group' | 'competitive' | 'skin_guess' | 'results' | 'error';

export type GameState =
	| {
			kind: 'lobby';
			connection: ConnectionStatus;
			preferredMode: GameMode;
			player?: PlayerInfo;
	  }
	| {
			kind: 'group';
			connection: ConnectionStatus;
			room: GroupRoomState;
	  }
	| {
			kind: 'competitive';
			connection: ConnectionStatus;
			room: CompetitiveRoomState;
			playerId: PlayerId;
	  }
	| {
			kind: 'results';
			mode: GameMode;
			lastPuzzle?: Puzzle;
			lastSolveAt?: number;
	  }
	| {
			kind: 'error';
			message: string;
	  };

const now = () => Date.now();

const makeRoomId = (guildId: string, channelId: string): RoomId => `${guildId}:${channelId}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MAX_ZOOM = 3;
const MIN_ZOOM = 1.6;
const ZOOM_STEP = 0.25;

const makeParticipantId = (name: string) =>
	name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '') || 'participant';

const MIN_REMOTE_CTX_ERROR = 'Cette activite doit etre lancee depuis Discord (ctx manquant).';

type RemoteSession = {
	ctx: ReturnType<typeof getDiscordContext>;
	unsub?: () => void;
	roomId?: string;
};

let remoteSession: RemoteSession | null = null;

const makeDefaultView = (): { focus: Vec2; zoom: number } => ({
	focus: pickRandomFocus(),
	zoom: MAX_ZOOM
});

const makePuzzle = (championKey: string, skinNum = 0): Puzzle => ({
	splash: { championKey, skinNum },
	view: makeDefaultView()
});

const makeRandomPuzzle = (): Puzzle => {
	const splash = pickRandomSplashRef();
	return { splash, view: makeDefaultView() };
};

const normalizeChampionId = (input: string): string => {
	const trimmed = input.trim();
	if (!trimmed) return trimmed;

	const state = get(ddragon);
	if (state.status !== 'ready') return trimmed;

	if (/^\d+$/.test(trimmed) && state.idByNumericKey?.[trimmed]) {
		return state.idByNumericKey[trimmed];
	}

	const lower = trimmed.toLowerCase();
	const byId = state.championKeys.find((id) => id.toLowerCase() === lower);
	if (byId) return byId;

	const byName = state.championKeys.find((id) => (state.championsByKey[id]?.name ?? '').toLowerCase() === lower);
	return byName ?? trimmed;
};

const makeGroupRoom = (roomId: RoomId): GroupRoomState => {
	const [guildId, channelId] = roomId.split(':', 2);
	return {
		roomId,
		guildId: guildId ?? '',
		channelId: channelId ?? '',
		mode: 'group',
		createdAt: now(),
		updatedAt: now(),
		players: {},
		puzzle: makeRandomPuzzle(),
		guesses: []
	};
};

const makeCompetitiveRoom = (roomId: RoomId): CompetitiveRoomState => {
	const [guildId, channelId] = roomId.split(':', 2);
	return {
		roomId,
		guildId: guildId ?? '',
		channelId: channelId ?? '',
		mode: 'competitive',
		createdAt: now(),
		updatedAt: now(),
		players: {},
		puzzles: [makeRandomPuzzle(), makeRandomPuzzle(), makeRandomPuzzle(), makeRandomPuzzle(), makeRandomPuzzle()],
		progress: {}
	};
};

export const game = writable<GameState>({
	kind: 'lobby',
	connection: 'offline',
	preferredMode: 'group'
});

export const gamePanel = derived(game, (state): GamePanel => {
	switch (state.kind) {
		case 'lobby':
			return 'lobby';
		case 'group':
			return 'group';
		case 'competitive':
			return state.room.winnerId ? 'results' : 'competitive';
		case 'results':
			return 'results';
		default:
			return 'error';
	}
});

export const actions = {
	goLobby(preferredMode: GameMode = 'group') {
		if (remoteSession?.unsub) remoteSession.unsub();
		remoteSession = null;
		game.set({ kind: 'lobby', connection: 'offline', preferredMode });
	},

	setPlayer(player: PlayerInfo) {
		game.update((s) => (s.kind === 'lobby' ? { ...s, player } : s));
	},

	async startLocalGroup(roomId = makeRoomId('local', 'voice')) {
		const ctx = getDiscordContext();
		if (!ctx) {
			game.set({ kind: 'error', message: MIN_REMOTE_CTX_ERROR });
			return;
		}
		if (remoteSession?.unsub) remoteSession.unsub();
		game.set({ kind: 'group', connection: 'connecting', room: makeGroupRoom(roomId) });
		await ensureDDragonLoaded();
		try {
			const puzzle = makeRandomPuzzle();
			const remote = await joinRemoteRoom(ctx, puzzle);
			const state = buildGroupStateFromRemote(remote);
			remoteSession = { ctx, roomId: remote.roomId };
			const unsub = subscribeRoom(remote.roomId, (ev) => {
				if (ev.type === 'init' || ev.type === 'room_updated') {
					const payload = ev.payload as any;
					if (payload) {
						game.set(buildGroupStateFromRemote(payload));
					}
				}
				if (ev.type === 'guess') {
					game.update((s) => {
						if (s.kind !== 'group') return s;
						const room = s.room;
						const g = ev.payload as any;
						const guess: ChampionGuess = {
							playerId: g.playerId,
							championKey: g.championKey,
							attemptIndex: g.attemptIndex,
							at: g.at
						};
						const guesses = [...room.guesses, guess];
						const solved = guess.championKey === room.puzzle.splash.championKey;
						const view = solved
							? { ...room.puzzle.view, zoom: 1, focus: { x: 0.5, y: 0.5 } }
							: { ...room.puzzle.view, zoom: clamp(room.puzzle.view.zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM) };
						const players = {
							...room.players,
							[guess.playerId]: { playerId: guess.playerId, displayName: g.displayName ?? guess.playerId }
						};
						return {
							...s,
							room: {
								...room,
								guesses,
								players,
								puzzle: { ...room.puzzle, view },
								solve: solved ? { playerId: guess.playerId, at: guess.at, attemptIndex: guess.attemptIndex } : room.solve,
								updatedAt: g.at ?? now()
							}
						};
					});
				}
				if (ev.type === 'puzzle') {
					const payload = ev.payload as any;
					if (!payload) return;
					game.update((s) => {
						if (s.kind !== 'group') return s;
						return {
							...s,
							room: {
								...s.room,
								puzzle: payload,
								guesses: [],
								solve: undefined,
								skinGuess: undefined
							}
						};
					});
				}
			});
			remoteSession.unsub = unsub;
			game.set(state);
		} catch (error) {
			game.set({ kind: 'error', message: error instanceof Error ? error.message : 'Remote join failed' });
		}
	},

	async startLocalCompetitive(playerId: PlayerId = 'local-player', roomId = makeRoomId('local', 'voice')) {
		game.set({ kind: 'error', message: 'Mode competitif indisponible pour cette version Discord.' });
	},

	async newRound() {
		await ensureDDragonLoaded();
		const ctx = remoteSession?.ctx ?? getDiscordContext();
		if (!ctx) {
			game.set({ kind: 'error', message: MIN_REMOTE_CTX_ERROR });
			return;
		}
		const puzzle = makeRandomPuzzle();
		await setRemotePuzzle(ctx, puzzle);
	},

	async newCompetitiveSeries() {
		await ensureDDragonLoaded();
		game.update((s) => {
			if (s.kind !== 'competitive') return s;
			const fresh = makeCompetitiveRoom(s.room.roomId);
			fresh.players = s.room.players;
			fresh.progress = s.room.progress;
			for (const player of Object.values(fresh.progress)) {
				player.currentIndex = 0;
				player.guesses = {};
				player.solves = {};
				player.solvedAt = undefined;
			}
			fresh.winnerId = undefined;
			return { ...s, room: fresh };
		});
	},

	revealMore() {
		game.update((s) => {
			if (s.kind === 'group') {
				const zoom = clamp(s.room.puzzle.view.zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
				return { ...s, room: { ...s.room, updatedAt: now(), puzzle: { ...s.room.puzzle, view: { ...s.room.puzzle.view, zoom } } } };
			}
			if (s.kind === 'competitive') {
				const player = s.room.progress[s.playerId];
				const index = player?.currentIndex ?? 0;
				const puzzle = s.room.puzzles[index];
				const updated = { ...s.room };
				updated.puzzles = updated.puzzles.slice();
				updated.puzzles[index] = {
					...puzzle,
					view: { ...puzzle.view, zoom: clamp(puzzle.view.zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM) }
				};
				updated.updatedAt = now();
				return { ...s, room: updated };
			}
			return s;
		});
	},

	submitChampionGuess(championKey: string, participantName = 'participant') {
		const at = now();
		const normalizedChampionId = normalizeChampionId(championKey);
		const dd = get(ddragon);
		if (dd.status === 'ready' && !dd.championsByKey[normalizedChampionId]) {
			return;
		}
		const ctx = remoteSession?.ctx ?? getDiscordContext();
		if (ctx) {
			sendRemoteGuess(ctx, normalizedChampionId).catch((error) => {
				game.set({ kind: 'error', message: error instanceof Error ? error.message : 'Guess failed' });
			});
			return;
		}
		game.set({ kind: 'error', message: MIN_REMOTE_CTX_ERROR });
	},

	submitSkinGuess(skinName: string) {
		const at = now();
		game.update((s) => {
			if (s.kind !== 'group' || !s.room.solve) return s;
			const trimmed = skinName.trim();
			const correctSkinName =
				getSkinNameByNum(s.room.puzzle.splash.championKey, s.room.puzzle.splash.skinNum, get(ddragon)) ?? 'Unknown';
			const correct =
				trimmed.localeCompare(correctSkinName, undefined, { sensitivity: 'accent', usage: 'search' }) === 0;
			const skinGuess: SkinGuess = { playerId: 'local-player', skinName: trimmed, at, correct, correctSkinName };
			return { ...s, room: { ...s.room, updatedAt: at, skinGuess } };
		});
	},

	finishToResults() {
		game.update((s) => {
			if (s.kind === 'group') {
				return {
					kind: 'results',
					mode: 'group',
					lastPuzzle: s.room.puzzle,
					lastSolveAt: s.room.solve?.at
				};
			}
			if (s.kind === 'competitive') {
				const player = s.room.progress[s.playerId];
				return { kind: 'results', mode: 'competitive', lastPuzzle: s.room.puzzles[player?.currentIndex ?? 0], lastSolveAt: player?.solvedAt };
			}
			return s;
		});
	},

	fail(message: string) {
		game.set({ kind: 'error', message });
	}
} as const;
