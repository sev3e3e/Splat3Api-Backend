import CoralApi, { CoralAuthData } from 'nxapi/coral';
import SplatNet3Api, { SplatNet3AuthData } from 'nxapi/splatnet3';
import winston from 'winston';
import { CreateLogger } from '../log/winston.js';
import { ValueCache } from '../cache/Cache.js';

import { addUserAgent } from 'nxapi';

export class Authentication {
    NINTENDO_TOKEN: string;
    Logger: winston.Logger;

    constructor() {
        if (!process.env.NINTENDO_TOKEN) {
            throw new Error('NintendoTokenがセットされていません。');
        }

        this.NINTENDO_TOKEN = process.env.NINTENDO_TOKEN;
        this.Logger = CreateLogger('Auth');

        addUserAgent('Splat3Api-Backend/0.0.1');
    }

    async initialize(useCache: boolean): Promise<SplatNet3Api> {
        const nso = await this.getCoralApi(useCache);
        const authData = await this.getCoralAuthData(useCache);
        return this.createApiClient(nso, authData, useCache);
    }

    private async createApiClient(nso: CoralApi, coralAuthData: CoralAuthData, useCache: boolean) {
        if (useCache) {
            const cachedAuthData = await ValueCache.get('SplatNet3AuthData');

            // cache 有り
            if (cachedAuthData != null) {
                this.Logger.info(`キャッシュされたSplatNet3AuthDataを使用します`);
                const authData = JSON.parse(cachedAuthData.value) as SplatNet3AuthData;

                return SplatNet3Api.createWithSavedToken(authData);
            }
        }

        // cache無いため普通に作る
        const { splatnet, data } = await SplatNet3Api.createWithCoral(nso, coralAuthData.user);

        // authDataをcacheする
        if (useCache) {
            await ValueCache.set('SplatNet3AuthData', data, 7000);
        }

        return splatnet;
    }

    async getCoralApi(useCache: boolean): Promise<CoralApi> {
        if (useCache) {
            const cache = await ValueCache.get('CoralApiToken');

            if (cache != null) {
                this.Logger.info('キャッシュされたCoralApiTokenを使用します');

                const token = cache.value;

                return (await CoralApi.createWithSessionToken(token)).nso;
            }
        }

        this.Logger.debug('generates coral session...');

        const session = await CoralApi.createWithSessionToken(this.NINTENDO_TOKEN);

        if (useCache) {
            await ValueCache.set('CoralApi', session.nso, session.data.credential.expiresIn);
        }

        return session.nso;
    }

    async getCoralAuthData(useCache: boolean): Promise<CoralAuthData> {
        if (useCache) {
            const cache = await ValueCache.get('CoralAuthData');

            if (cache != null) {
                this.Logger.info('キャッシュされたCoralAuthDataを使用します');

                return JSON.parse(cache.value) as CoralAuthData;
            }
        }

        const session = await CoralApi.createWithSessionToken(this.NINTENDO_TOKEN);

        if (useCache) {
            // ついでに更新
            await ValueCache.set('CoralApi', session.nso, session.data.credential.expiresIn);

            await ValueCache.set('CoralAuthData', session.data);
        }

        return session.data;
    }
}
