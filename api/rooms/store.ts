// Room store with Redis persistence (falls back to in-memory if REDIS_URL is unset).
import { getRedis, getSubscriber, roomChannel, roomKey } from './redis';

export type RoomId = string;
export type PlayerId = string;

export interface PlayerInfo {
	playerId: PlayerId;
	displayName: string;
}

export interface PuzzleView {
	focus: { x: number; y: number };
	zoom: number;
}

export interface Puzzle {
	splash: { championKey: string; skinNum: number };
	view: PuzzleView;
}

export interface GuessEvent {
	playerId: PlayerId;
	displayName: string;
	championKey: string;
	at: number;
	attemptIndex: number;
}

export interface RoomState {
	roomId: RoomId;
	guildId: string;
	channelId: string;
	players: Record<PlayerId, PlayerInfo>;
	guesses: GuessEvent[];
	puzzle?: Puzzle;
	updatedAt: number;
	createdAt: number;
}

type Listener = (event: { type: string; payload: unknown }) => void;

const rooms = new Map<RoomId, RoomState>();
const listeners = new Map<RoomId, Set<Listener>>();
const channelListeners = new Map<RoomId, Set<Listener>>();
let redisSubReady: Promise<void> | null = null;

const now = () => Date.now();

const makeRoomId = (guildId: string, channelId: string) => `${guildId}:${channelId}`;

async function loadRoom(roomId: RoomId): Promise<RoomState | undefined> {
	const redis = getRedis();
	if (redis) {
		const raw = await redis.get(roomKey(roomId));
		if (!raw) return undefined;
		try {
			return JSON.parse(raw) as RoomState;
		} catch {
			return undefined;
		}
	}
	return rooms.get(roomId);
}

async function persistRoom(room: RoomState) {
	const redis = getRedis();
	if (redis) {
		await redis.set(roomKey(room.roomId), JSON.stringify(room));
	}
	rooms.set(room.roomId, room);
}

export async function getRoom(roomId: RoomId): Promise<RoomState | undefined> {
	return loadRoom(roomId);
}

async function ensureRedisSubscriber() {
	if (redisSubReady) return redisSubReady;
	redisSubReady = (async () => {
		const sub = await getSubscriber();
		if (!sub) return;
		sub.on('message', (channel, message) => {
			const parts = channel.split(':');
			const roomId = parts[2];
			if (!roomId) return;
			const subs = channelListeners.get(roomId);
			if (!subs) return;
			try {
				const evt = JSON.parse(message);
				for (const cb of subs) cb(evt);
			} catch {
				// ignore malformed
			}
		});
	})();
	return redisSubReady;
}

async function broadcast(roomId: RoomId, type: string, payload: unknown) {
	const redis = getRedis();
	if (redis) {
		await redis.publish(roomChannel(roomId), JSON.stringify({ type, payload }));
	}
	const subs = listeners.get(roomId);
	if (!subs) return;
	for (const cb of subs) {
		cb({ type, payload });
	}
}

export async function subscribe(roomId: RoomId, listener: Listener) {
	const redis = getRedis();
	if (redis) {
		await ensureRedisSubscriber();
		if (!channelListeners.has(roomId)) channelListeners.set(roomId, new Set());
		channelListeners.get(roomId)!.add(listener);
		const sub = await getSubscriber();
		await sub?.subscribe(roomChannel(roomId));
	}
	if (!listeners.has(roomId)) listeners.set(roomId, new Set());
	listeners.get(roomId)!.add(listener);
	return async () => {
		listeners.get(roomId)?.delete(listener);
		channelListeners.get(roomId)?.delete(listener);
	};
}

export async function joinRoom(params: {
	guildId: string;
	channelId: string;
	playerId: string;
	displayName: string;
	puzzle?: Puzzle;
}) {
	const roomId = makeRoomId(params.guildId, params.channelId);
	let room = await loadRoom(roomId);
	const at = now();
	if (!room) {
		room = {
			roomId,
			guildId: params.guildId,
			channelId: params.channelId,
			players: {},
			guesses: [],
			puzzle: params.puzzle,
			createdAt: at,
			updatedAt: at
		};
	}
	if (!room.puzzle && params.puzzle) {
		room.puzzle = params.puzzle;
		room.guesses = [];
	}
	room.players[params.playerId] = { playerId: params.playerId, displayName: params.displayName };
	room.updatedAt = at;
	await persistRoom(room);
	broadcast(roomId, 'room_updated', room);
	return room;
}

export async function submitGuess(params: { guildId: string; channelId: string; playerId: string; displayName: string; championKey: string }) {
	const roomId = makeRoomId(params.guildId, params.channelId);
	const room = await loadRoom(roomId);
	if (!room) throw new Error('Room not found');
	const at = now();
	const attemptIndex = room.guesses.length;
	room.players[params.playerId] = { playerId: params.playerId, displayName: params.displayName };
	const guess: GuessEvent = {
		playerId: params.playerId,
		displayName: params.displayName,
		championKey: params.championKey,
		at,
		attemptIndex
	};
	room.guesses.push(guess);
	room.updatedAt = at;
	await persistRoom(room);
	broadcast(roomId, 'guess', guess);
	return room;
}

export async function setPuzzle(params: {
	guildId: string;
	channelId: string;
	playerId: string;
	displayName: string;
	puzzle: Puzzle;
}) {
	const roomId = makeRoomId(params.guildId, params.channelId);
	let room = await loadRoom(roomId);
	const at = now();
	if (!room) {
		room = {
			roomId,
			guildId: params.guildId,
			channelId: params.channelId,
			players: {},
			guesses: [],
			puzzle: params.puzzle,
			createdAt: at,
			updatedAt: at
		};
	}
	room.players[params.playerId] = { playerId: params.playerId, displayName: params.displayName };
	room.puzzle = params.puzzle;
	room.guesses = [];
	room.updatedAt = at;
	await persistRoom(room);
	broadcast(roomId, 'puzzle', room.puzzle);
	broadcast(roomId, 'room_updated', room);
	return room;
}
