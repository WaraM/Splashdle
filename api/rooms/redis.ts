import Redis from 'ioredis';

let client: Redis | null = null;
let subscriber: Redis | null = null;

export function getRedis(): Redis | null {
	if (client) return client;
	const url = process.env.REDIS_URL;
	if (!url) return null;
	client = new Redis(url, { maxRetriesPerRequest: 2 });
	return client;
}

export async function getSubscriber(): Promise<Redis | null> {
	if (subscriber) return subscriber;
	const url = process.env.REDIS_URL;
	if (!url) return null;
	subscriber = new Redis(url, { maxRetriesPerRequest: 2 });
	return subscriber;
}

export const roomKey = (roomId: string) => `splashdle:room:${roomId}`;
export const roomChannel = (roomId: string) => `splashdle:room:${roomId}:events`;
