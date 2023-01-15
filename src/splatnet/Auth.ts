// NSOやSplatnetの認証周りはここで
// トークンのキャッシュや期限切れの際の再認証もここで。

import CoralApi, { CoralAuthData } from "nxapi/coral";
import { ValueCache } from "../utils/Cache.js";
import { ReduceCacheExpiration } from "../utils/util.js";

// CoralApiからCoral Session取得(Expires有)
// Coral Sessionを使用してWebServiceToken取得(Expires有)
//

export class Authentication {
    NINTENDO_TOKEN: string;
    constructor() {
        if (!process.env.NINTENDO_TOKEN) {
            throw new Error("NintendoTokenがセットされていません。");
        }

        this.NINTENDO_TOKEN = process.env.NINTENDO_TOKEN;
    }

    async getCoralApi(useCache: boolean = true): Promise<{
        nso: CoralApi;
        data: CoralAuthData;
    }> {
        if (useCache) {
            const CachedCoralSession = await ValueCache.get("CoralSession");

            if (CachedCoralSession != null) {
                return CachedCoralSession as unknown as {
                    nso: CoralApi;
                    data: CoralAuthData;
                };
            }
        }

        const session = await CoralApi.createWithSessionToken(
            this.NINTENDO_TOKEN
        );

        const reducedExpires = ReduceCacheExpiration(
            session.data.credential.expiresIn
        );

        await ValueCache.set("CoralSession", session, reducedExpires);

        return session;
    }
}

const auth = new Authentication();

export const Auth = auth;
