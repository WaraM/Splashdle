import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRoom, subscribe } from './store';

export const config = {
	api: {
		bodyParser: false
	}
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const roomId = req.query.roomId;
	if (!roomId || Array.isArray(roomId)) {
		res.status(400).json({ error: 'roomId required' });
		return;
	}

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders();

	const send = (event: { type: string; payload: unknown }) => {
		res.write(`data: ${JSON.stringify(event)}\n\n`);
	};

	const initial = await getRoom(roomId);
	send({ type: 'init', payload: initial ?? null });

	const unsubscribe = await subscribe(roomId, send);

	req.on('close', () => {
		unsubscribe();
		res.end();
	});
}
