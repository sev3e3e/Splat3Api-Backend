import dayjs from "dayjs";
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

    async getAllSchedules() {
        // check caches
        const cache = await ValueCache.get("Schedules");

        if (cache == null) {
            const schedules = await this.apiClient.getSchedules();

            // convert all
        }
    }

    async getOpenBankaraSchedules() {
        // check caches
        const cache = await ValueCache.get("Schedules");

        if (cache == null) {
            const schedules = await this.apiClient.getSchedules();

            const converted =
                scheduleCredentialRemover.removeBankaraScheduleCredentials(
                    schedules.data.bankaraSchedules
                );

            // TTL設定
            // 最新のスケジュールの終了をTTL
            // 0以下になったらキャッシュしない
            const diff = dayjs(converted.open[0].endTime).diff(
                dayjs(),
                "second"
            );

            if (diff > 0) {
                await ValueCache.set("Schedules", schedules, diff);
            }

            return converted.open;
        } else {
            return JSON.parse(cache) as Schedule[];
        }
    }

    async getChallengeBankaraSchedules() {
        // check caches
        const cache = await ValueCache.get("Schedules");

        if (cache == null) {
            const schedules = await this.apiClient.getSchedules();

            const converted =
                scheduleCredentialRemover.removeBankaraScheduleCredentials(
                    schedules.data.bankaraSchedules
                );

            // TTL設定
            // 最新のスケジュールの終了をTTL
            // 0以下になったらキャッシュしない
            const diff = dayjs(converted.challenge[0].endTime).diff(
                dayjs(),
                "second"
            );

            if (diff > 0) {
                await ValueCache.set("Schedules", schedules, diff);
            }

            return converted.challenge;
        } else {
            return JSON.parse(cache) as Schedule[];
        }
    }

    async getSalmonRunSchedules() {
        const cache = await ValueCache.get("Schedules");

        if (cache == null) {
            const schedules = await this.apiClient.getSchedules();
            console.log(schedules.data.coopGroupingSchedule.regularSchedules.nodes);

            const diff = dayjs(schedules.data.bankaraSchedules.nodes[0].endTime).diff(
                dayjs(),
                "second"
            );

            if (diff > 0) {
                await ValueCache.set("Schedules", schedules, diff);
            }
        }
        else {
            const schedules = JSON.parse(cache);

            const removed = scheduleCredentialRemover.removeSalmonRunScheduleCredentials(schedules.data.coopGroupingSchedule)

            console.log(removed);
        }
    }
}

const _splatnet3ApiClient = new Splatnet3Client();

await _splatnet3ApiClient.initialize();

export const splatnet3ApiClient = _splatnet3ApiClient;
