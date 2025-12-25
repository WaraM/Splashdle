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
import { ddragon, ensureDDragonLoaded, getSkinNameByNum, pickRandomSplashRef } from '$lib/stores/ddragon';

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

const MAX_ZOOM = 1;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0;

const makeParticipantId = (name: string) =>
	name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '') || 'participant';

const makeDefaultView = (): { focus: Vec2; zoom: number } => ({
	focus: { x: 0.5, y: 0.5 },
	zoom: 1
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
		game.set({ kind: 'lobby', connection: 'offline', preferredMode });
	},

	setPlayer(player: PlayerInfo) {
		game.update((s) => (s.kind === 'lobby' ? { ...s, player } : s));
	},

	async startLocalGroup(roomId = makeRoomId('local', 'voice')) {
		game.set({ kind: 'group', connection: 'connecting', room: makeGroupRoom(roomId) });
		await ensureDDragonLoaded();
		game.update((s) => {
			if (s.kind !== 'group') return s;
			return { ...s, connection: 'offline', room: { ...s.room, puzzle: makeRandomPuzzle(), updatedAt: now() } };
		});
	},

	async startLocalCompetitive(playerId: PlayerId = 'local-player', roomId = makeRoomId('local', 'voice')) {
		const room = makeCompetitiveRoom(roomId);
		room.players[playerId] = { playerId, displayName: 'You' };
		room.progress[playerId] = {
			playerId,
			currentIndex: 0,
			guesses: {},
			solves: {}
		};
		game.set({ kind: 'competitive', connection: 'connecting', room, playerId });
		await ensureDDragonLoaded();
		game.update((s) => {
			if (s.kind !== 'competitive') return s;
			return {
				...s,
				connection: 'offline',
				room: {
					...s.room,
					updatedAt: now(),
					puzzles: [makeRandomPuzzle(), makeRandomPuzzle(), makeRandomPuzzle(), makeRandomPuzzle(), makeRandomPuzzle()],
					winnerId: undefined
				}
			};
		});
	},

	async newRound() {
		await ensureDDragonLoaded();
		const at = now();
		game.update((s) => {
			if (s.kind !== 'group') return s;
			return {
				...s,
				room: {
					...s.room,
					updatedAt: at,
					puzzle: makeRandomPuzzle(),
					guesses: [],
					solve: undefined,
					skinGuess: undefined
				}
			};
		});
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
		game.update((s) => {
			if (s.kind === 'group') {
				const displayName = participantName.trim() || 'participant';
				const playerId = makeParticipantId(displayName);
				const players = { ...s.room.players, [playerId]: { playerId, displayName } };
				const attemptIndex = s.room.guesses.length;
				const guess: ChampionGuess = {
					playerId,
					championKey: normalizedChampionId,
					attemptIndex,
					at
				};
				const guesses = [...s.room.guesses, guess];
				const solved = normalizedChampionId === s.room.puzzle.splash.championKey;
				const view = solved
					? { ...s.room.puzzle.view, zoom: 1, focus: { x: 0.5, y: 0.5 } }
					: { ...s.room.puzzle.view, zoom: clamp(s.room.puzzle.view.zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM) };
				return {
					...s,
					room: {
						...s.room,
						updatedAt: at,
						players,
						guesses,
						puzzle: { ...s.room.puzzle, view },
						solve: solved ? { playerId, at, attemptIndex } : s.room.solve
					}
				};
			}

			if (s.kind === 'competitive') {
				const room = { ...s.room, updatedAt: at };
				const progress = { ...room.progress };
				const player = progress[s.playerId] ?? {
					playerId: s.playerId,
					currentIndex: 0,
					guesses: {},
					solves: {}
				};

				const index = player.currentIndex;
				const attemptIndex = player.guesses[index]?.length ?? 0;
				const guess: ChampionGuess = { playerId: s.playerId, championKey: normalizedChampionId, attemptIndex, at };

				const guessesForPuzzle = [...(player.guesses[index] ?? []), guess];
				const guesses = { ...player.guesses, [index]: guessesForPuzzle };
				const correct = normalizedChampionId === room.puzzles[index]?.splash.championKey;
				if (!correct) {
					const puzzle = room.puzzles[index];
					room.puzzles = room.puzzles.slice();
					room.puzzles[index] = {
						...puzzle,
						view: { ...puzzle.view, zoom: clamp(puzzle.view.zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM) }
					};
				}

				const solves = { ...player.solves, [index]: correct ? { playerId: s.playerId, at, attemptIndex } : player.solves[index] };
				const nextIndex = correct ? index + 1 : index;

				const updatedPlayer = {
					...player,
					currentIndex: nextIndex,
					guesses,
					solves,
					solvedAt: nextIndex >= room.puzzles.length ? at : player.solvedAt
				};

				progress[s.playerId] = updatedPlayer;
				room.progress = progress;

				if (updatedPlayer.solvedAt && !room.winnerId) {
					room.winnerId = s.playerId;
				}

				return { ...s, room };
			}

			return s;
		});
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
