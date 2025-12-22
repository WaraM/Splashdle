import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setPuzzle } from './store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}

	const { guildId, channelId, userId, userName, puzzle } = req.body ?? {};
	if (!guildId || !channelId || !userId || !userName || !puzzle) {
		res.status(400).json({ error: 'Missing guildId, channelId, userId, userName, puzzle' });
		return;
	}

	const room = await setPuzzle({
		guildId: String(guildId),
		channelId: String(channelId),
		playerId: String(userId),
		displayName: String(userName),
		puzzle
	});

	res.status(200).json(room);
}
