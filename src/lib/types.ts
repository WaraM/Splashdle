export type GuildId = string;
export type ChannelId = string;
export type RoomId = `${GuildId}:${ChannelId}`;
export type PlayerId = string;

export type GameMode = 'solo' | 'group' | 'competitive';

export type ChampionKey = string;

export interface SplashRef {
	championKey: ChampionKey;
	skinNum: number;
}

export interface Vec2 {
	x: number;
	y: number;
}

export interface PuzzleView {
	focus: Vec2;
	zoom: number;
}

export interface Puzzle {
	splash: SplashRef;
	view: PuzzleView;
}

export interface ChampionGuess {
	playerId: PlayerId;
	championKey: ChampionKey;
	attemptIndex: number;
	at: number;
}

export interface PuzzleSolve {
	playerId: PlayerId;
	at: number;
	attemptIndex: number;
}

export interface SkinGuess {
	playerId: PlayerId;
	skinName: string;
	at: number;
	correct: boolean;
	correctSkinName: string;
}

export interface PlayerInfo {
	playerId: PlayerId;
	displayName: string;
}

export interface BaseRoomState {
	roomId: RoomId;
	guildId: GuildId;
	channelId: ChannelId;
	mode: GameMode;
	createdAt: number;
	updatedAt: number;
	players: Record<PlayerId, PlayerInfo>;
}

export interface GroupRoomState extends BaseRoomState {
	mode: 'group';
	puzzle: Puzzle;
	guesses: ChampionGuess[];
	solve?: PuzzleSolve;
	skinGuess?: SkinGuess;
}

export interface CompetitivePlayerProgress {
	playerId: PlayerId;
	currentIndex: number;
	solvedAt?: number;
	guesses: Record<number, ChampionGuess[]>;
	solves: Record<number, PuzzleSolve | undefined>;
}

export interface CompetitiveRoomState extends BaseRoomState {
	mode: 'competitive';
	puzzles: Puzzle[];
	progress: Record<PlayerId, CompetitivePlayerProgress>;
	winnerId?: PlayerId;
}

export type RoomState = GroupRoomState | CompetitiveRoomState;

export interface DDragonSkin {
	id: string;
	num: number;
	name: string;
	chromas: boolean;
}

export interface DDragonChampionSummary {
	id: string;
	key: string;
	name: string;
	title: string;
	skins: DDragonSkin[];
}

export interface DDragonChampionFullResponse {
	data: Record<string, DDragonChampionSummary>;
	version: string;
	type: string;
	format: string;
}
