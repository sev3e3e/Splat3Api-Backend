import CoralApi, { CoralAuthData } from 'nxapi/coral';
import SplatNet3Api, { SplatNet3AuthData } from 'nxapi/splatnet3';
import winston from 'winston';
import { CreateLogger } from '../log/winston.js';
import { ValueCache } from '../cache/Cache.js';
import { ReduceCacheExpiration } from '../utils/util.js';

export class Authentication {
    NINTENDO_TOKEN: string;
    // SPLATOON3_SERVICE_ID: number;
    Logger: winston.Logger;

    constructor() {
        if (!process.env.NINTENDO_TOKEN) {
            throw new Error('NintendoTokenがセットされていません。');
        }

        if (!process.env.SPLATOON3_SERVICE_ID) {
            throw new Error('Splatoon3のWebService IDがセットされていません。');
        }

        this.NINTENDO_TOKEN = process.env.NINTENDO_TOKEN;
        // this.SPLATOON3_SERVICE_ID = parseInt(process.env.SPLATOON3_SERVICE_ID);
        this.Logger = CreateLogger('Auth');
    }

    async initialize() {
        const { nso, data } = await this.getCoralApi();
        return this.createApiClient(nso, data);
    }

    private async createApiClient(nso: CoralApi, coralAuthData: CoralAuthData) {
        const cachedAuthData = await ValueCache.get('SplatNet3AuthData');

        // cache 有り
        if (cachedAuthData != null) {
            this.Logger.info(`キャッシュされたSplatNet3AuthDataを使用します`);
            const authData = JSON.parse(cachedAuthData.value) as SplatNet3AuthData;

            return SplatNet3Api.createWithSavedToken(authData);
        }

        // cache無いため普通に作る
        const { splatnet, data } = await SplatNet3Api.createWithCoral(nso, coralAuthData.user);

        // authDataをcacheする
        await ValueCache.set('SplatNet3AuthData', data, 7000);

        return splatnet;
    }

    async getCoralApi(useCache: boolean = true): Promise<{
        nso: CoralApi;
        data: CoralAuthData;
    }> {
        if (useCache) {
            const CachedCoralSession = await ValueCache.get('CoralSession');

            if (CachedCoralSession != null) {
                this.Logger.info('キャッシュされたCoralSessionを使用します');

                const session = JSON.parse(CachedCoralSession.value) as {
                    nso: CoralApi;
                    data: CoralAuthData;
                };

                return {
                    nso: CoralApi.createWithSavedToken(session.data),
                    data: session.data,
                };
            }
        }

        this.Logger.debug('getCoralApi generates the session...');

        const session = await CoralApi.createWithSessionToken(this.NINTENDO_TOKEN);

        // const reducedExpires = ReduceCacheExpiration(session.data.credential.expiresIn);

        await ValueCache.set('CoralSession', session);

        return session;
    }
}

const auth = new Authentication();

export const Auth = auth;
