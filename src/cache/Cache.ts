import { RedisClient } from '../redis/RedisClient.js';

export interface CacheItem {
    value: string;
    TTL: number;
}

/**
 * Redis Client Wrapper for Cache.
 */
class Cache {
    /**
     * storedObjets.
     */
    storedObjects: { [index: string]: CacheItem };

    constructor() {
        this.storedObjects = {};
    }

    /**
     * キャッシュするデータをセットします。
     * 値はJSON文字列化されます。
     * 同名のデータは上書きされます。
     * @param name 保存したいデータ名
     * @param value 保存したいデータ内容
     * @param expires 期限切れになる時間(秒)
     */
    async set(name: string, value: any, expires: number = 0) {
        // ?: get時TTLも一緒に取得, TTLが残りわずかだったら更新処理をする
        // ?: この方式の場合、アクセスが少ないとGET Request来た際にすでに期限切れで何もないかもしれない。定期的にCacheをチェックするスクリプトをFunctionsで別途動かす必要がある。

        const jsonValue = JSON.stringify(value);

        this.storedObjects[name] = {
            TTL: expires,
            value: jsonValue,
        };

        return RedisClient.set(name, jsonValue, {
            EX: expires,
        });
    }

    /**
     * キャッシュされているデータを取得します。
     * @param name 取得したいデータ名
     */
    async get(name: string): Promise<CacheItem | null> {
        if (name in this.storedObjects) {
            const value = this.storedObjects[name];
            return value ? value : null;
        }
        const valueBody = await RedisClient.get(name);

        if (!valueBody) {
            return null;
        }

        const valueTTL = await RedisClient.ttl(name);

        return {
            value: valueBody,
            TTL: valueTTL,
        };
    }
}

const cache = new Cache();

export const ValueCache = cache;
