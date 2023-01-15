// NSOやSplatnetの認証周りはここで
// トークンのキャッシュや期限切れの際の再認証もここで。

import CoralApi, { CoralAuthData, WebServiceToken } from "nxapi/coral";
import winston from "winston";
import { CreateLogger } from "../log/winston.js";
import { RedisClient } from "../redis/RedisClient.js";
import { ValueCache } from "../utils/Cache.js";
import { ReduceCacheExpiration } from "../utils/util.js";

// CoralApiからCoral Session取得(Expires有)
// Coral Sessionを使用してWebServiceToken取得(Expires有)
//

export class Authentication {
    NINTENDO_TOKEN: string;
    SPLATOON3_SERVICE_ID: number;
    Logger: winston.Logger;

    constructor() {
        if (!process.env.NINTENDO_TOKEN) {
            throw new Error("NintendoTokenがセットされていません。");
        }

        if (!process.env.SPLATOON3_SERVICE_ID) {
            throw new Error("Splatoon3のWebService IDがセットされていません。");
        }

        this.NINTENDO_TOKEN = process.env.NINTENDO_TOKEN;
        this.SPLATOON3_SERVICE_ID = parseInt(process.env.SPLATOON3_SERVICE_ID);
        this.Logger = CreateLogger("Auth");
    }

    async getCoralApi(useCache: boolean = true): Promise<{
        nso: CoralApi;
        data: CoralAuthData;
    }> {
        if (useCache) {
            const CachedCoralSession = await ValueCache.get("CoralSession");

            if (CachedCoralSession != null) {
                this.Logger.debug("getCoralApi using Cache...");

                const session = JSON.parse(CachedCoralSession) as {
                    nso: CoralApi;
                    data: CoralAuthData;
                };

                return {
                    nso: CoralApi.createWithSavedToken(session.data),
                    data: session.data,
                };
            }
        }

        this.Logger.debug("getCoralApi generates the session...");

        const session = await CoralApi.createWithSessionToken(
            this.NINTENDO_TOKEN
        );

        const reducedExpires = ReduceCacheExpiration(
            session.data.credential.expiresIn
        );

        await ValueCache.set("CoralSession", session, reducedExpires);

        return session;
    }

    async getWebServiceToken(useCache: boolean = true) {
        const coralApi = (await this.getCoralApi()).nso;

        if (useCache) {
            const CachedWebServiceToken = await ValueCache.get(
                "WebServiceToken"
            );

            if (CachedWebServiceToken != null) {
                return JSON.parse(CachedWebServiceToken) as WebServiceToken;
            }
        }

        const token: WebServiceToken = await coralApi.getWebServiceToken(
            this.SPLATOON3_SERVICE_ID
        );

        return token;
    }

    async getBulletToken(useCache: boolean = true): Promise<{
        bulletToken: string;
        lang: string;
        is_noe_country: "true" | "false";
    }> {
        if (useCache) {
            const token = await ValueCache.get("BulletToken");

            if (token) {
                this.Logger.debug("getBulletToken using cache...");

                return JSON.parse(token) as {
                    bulletToken: string;
                    lang: string;
                    is_noe_country: "true" | "false";
                };
            }
        }

        this.Logger.debug("getBulletToken generates the session...");

        const webServiceToken = await this.getWebServiceToken();

        const res = await fetch(
            process.env.SPLATOON3_BASE_URL + "/api/bullet_tokens",
            {
                method: "POST",
                headers: {
                    "X-Web-View-Ver": "2.0.0-8a061f6c",
                    "X-NACOUNTRY": "JP",
                    "X-GameWebToken": webServiceToken.accessToken,
                    "Accept-Language": "ja-jp",
                },
            }
        );

        return res.json();
    }
}

const auth = new Authentication();

export const Auth = auth;
