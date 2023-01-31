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
        await ValueCache.set('SplatNet3AuthData', data);

        return splatnet;
    }

    async getCoralApi(useCache: boolean = true): Promise<{
        nso: CoralApi;
        data: CoralAuthData;
    }> {
        if (useCache) {
            const CachedCoralSession = await ValueCache.get('CoralSession');

            if (CachedCoralSession != null) {
                this.Logger.info('キャッシュされたCoralAuthDataを使用します');

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

        const reducedExpires = ReduceCacheExpiration(session.data.credential.expiresIn);

        await ValueCache.set('CoralSession', session, reducedExpires);

        return session;
    }

    // async getWebServiceToken(
    //     useCache: boolean = true
    // ): Promise<WebServiceToken> {
    //     const coralApi = (await this.getCoralApi()).nso;

    //     if (useCache) {
    //         const CachedWebServiceToken = await ValueCache.get(
    //             "WebServiceToken"
    //         );

    //         if (CachedWebServiceToken != null) {
    //             return JSON.parse(CachedWebServiceToken) as WebServiceToken;
    //         }
    //     }

    //     const token: WebServiceToken = await coralApi.getWebServiceToken(
    //         this.SPLATOON3_SERVICE_ID
    //     );

    //     const reducedExpires = ReduceCacheExpiration(token.expiresIn);

    //     await ValueCache.set("WebServiceToken", token, reducedExpires);

    //     return token;
    // }

    // async getBulletToken(useCache: boolean = true): Promise<BulletToken> {
    //     if (useCache) {
    //         const token = await ValueCache.get("BulletToken");

    //         if (token) {
    //             this.Logger.debug("getBulletToken using cache...");

    //             return JSON.parse(token) as BulletToken;
    //         }
    //     }

    //     this.Logger.debug("getBulletToken generates the session...");

    //     const webServiceToken = await this.getWebServiceToken();

    //     console.log(webServiceToken);

    //     const res = await fetch(
    //         process.env.SPLATOON3_BASE_URL + "/api/bullet_tokens",
    //         {
    //             method: "POST",
    //             headers: {
    //                 "X-Web-View-Ver": "2.0.0-bd36a652",
    //                 "X-NACOUNTRY": "JP",
    //                 "X-GameWebToken": webServiceToken.accessToken,
    //                 "Accept-Language": "ja-jp",
    //             },
    //         }
    //     );

    //     if (res.status !== 201) {
    //         throw new Error(
    //             `[splatnet3] Non-200 status code. ${
    //                 res.status
    //             } ${await res.text()}`
    //         );
    //     }

    //     const token = await res.json();

    //     await ValueCache.set("BulletToken", token);

    //     return token;
    // }
}

const auth = new Authentication();

export const Auth = auth;
