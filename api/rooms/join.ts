import type { VercelRequest, VercelResponse } from '@vercel/node';
import { joinRoom } from './store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}

	const { guildId, channelId, userId, userName, puzzle } = req.body ?? {};
	if (!guildId || !channelId || !userId || !userName) {
		res.status(400).json({ error: 'Missing guildId, channelId, userId, userName' });
		return;
	}

	const room = await joinRoom({
		guildId: String(guildId),
		channelId: String(channelId),
		playerId: String(userId),
		displayName: String(userName),
		puzzle: puzzle ?? undefined
	});

	res.status(200).json(room);
}
