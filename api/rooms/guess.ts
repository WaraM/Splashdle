import type { VercelRequest, VercelResponse } from '@vercel/node';
import { submitGuess } from './store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}

	const { guildId, channelId, userId, userName, championKey } = req.body ?? {};
	if (!guildId || !channelId || !userId || !userName || !championKey) {
		res.status(400).json({ error: 'Missing guildId, channelId, userId, userName, championKey' });
		return;
	}

	try {
		const room = await submitGuess({
			guildId: String(guildId),
			channelId: String(channelId),
			playerId: String(userId),
			displayName: String(userName),
			championKey: String(championKey)
		});
		res.status(200).json(room);
	} catch (error) {
		res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
	}
}
