const CACHE_TTL = 5 * 60 * 1000; // 5分

const cache = new Map();

export function getCached(key) {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.ts > CACHE_TTL) {
		cache.delete(key);
		return null;
	}
	return entry.data;
}

export function setCached(key, data) {
	cache.set(key, { data, ts: Date.now() });
}

export function clearCache(key) {
	if (key) {
		cache.delete(key);
	} else {
		cache.clear();
	}
}
