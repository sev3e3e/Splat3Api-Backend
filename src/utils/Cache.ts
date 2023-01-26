import { RedisClient } from "../redis/RedisClient.js";

/**
 * Redis Client Wrapper for Cache.
 */
class Cache {
    storedObjects: { [index: string]: string };

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
        const jsonValue = JSON.stringify(value);

        this.storedObjects["name"] = jsonValue;

        return RedisClient.set(name, jsonValue, {
            EX: expires,
        });
    }

    /**
     * キャッシュされているデータを取得します。
     * @param name 取得したいデータ名
     */
    async get(name: string): Promise<string | null> {
        if (name in this.storedObjects) {
            return this.storedObjects[name];
        } else {
            return RedisClient.get(name);
        }
    }
}

const cache = new Cache();

export const ValueCache = cache;
