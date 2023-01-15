import { RedisClient } from "../redis/RedisClient.js";

/**
 * Redis Client Wrapper for Cache.
 */
class Cache {
    /**
     * キャッシュするデータをセットします。
     * 値はJSON文字列化されます。
     * @param name 保存したいデータ名
     * @param value 保存したいデータ内容
     * @param expires 期限切れになる時間(秒)
     */
    async set(name: string, value: any, expires: number | null) {
        if (!expires) {
            expires = 0;
        }

        return RedisClient.set(name, JSON.stringify(value), {
            EX: expires,
        });
    }

    /**
     * キャッシュされているデータを取得します。
     * @param name 取得したいデータ名
     */
    async get(name: string): Promise<string | null> {
        return RedisClient.get(name);
    }
}

const cache = new Cache();

export const ValueCache = cache;
