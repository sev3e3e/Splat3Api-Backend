import SplatNet3Api from "nxapi/splatnet3";
import { ValueCache } from "../utils/Cache.js";
import { Auth } from "./Auth.js";
import {
    Schedule,
    scheduleCredentialRemover,
} from "./data/credentialRemovers/ScheduleCredentialRemover.js";

class Splatnet3Client {
    apiClient!: SplatNet3Api;
    constructor() {}

    async initialize() {
        const api = await Auth.initialize();
        this.apiClient = api;
    }

    // expireの付け方迷ってる
    //
    async getOpenBankaraSchedules() {
        // check caches
        const cache = await ValueCache.get("Schedules");

        if (cache == null) {
            const schedules = await this.apiClient.getSchedules();

            await ValueCache.set("Schedules", schedules);

            const converted =
                scheduleCredentialRemover.removeBankaraScheduleCredentials(
                    schedules.data.bankaraSchedules
                );

            return converted.open;
        } else {
            return JSON.parse(cache) as Schedule[];
        }
    }

    async getChallengeBankaraSchedules() {}
}

const _splatnet3ApiClient = new Splatnet3Client();

await _splatnet3ApiClient.initialize();

export const splatnet3ApiClient = _splatnet3ApiClient;
