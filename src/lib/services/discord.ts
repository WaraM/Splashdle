export interface DiscordContext {
	guildId: string;
	channelId: string;
	userId: string;
	userName: string;
}

declare global {
	interface Window {
		__DISCORD_ACTIVITY_CONTEXT__?: Partial<DiscordContext>;
	}
}

export function getDiscordContext(): DiscordContext | null {
	const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

	const fromWindow = typeof window !== 'undefined' ? window.__DISCORD_ACTIVITY_CONTEXT__ : undefined;
	const guildId = params.get('guildId') ?? fromWindow?.guildId;
	const channelId = params.get('channelId') ?? fromWindow?.channelId;
	const userId = params.get('userId') ?? fromWindow?.userId;
	const userName = params.get('userName') ?? fromWindow?.userName;

	if (guildId && channelId && userId && userName) {
		return {
			guildId,
			channelId,
			userId,
			userName
		};
	}

	return null;
}
