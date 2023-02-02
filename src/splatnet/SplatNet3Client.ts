import SplatNet3Api from 'nxapi/splatnet3';
import { ValueCache } from '../cache/Cache.js';
import { Auth } from './Auth.js';
import {
    removeAllScheduleCredentials,
    SalmonRunSchedule,
    Schedule,
    StageSchedule,
} from './data/credentialRemovers/ScheduleCredentialRemover.js';
import { RequestId } from 'splatnet3-types/splatnet3';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

import * as fs from 'fs';
import { DetailTabViewXRankingArRefetchQuery, xRankingPlayerData } from '../types/XRankings.js';
import { Logger } from 'winston';
import { CreateLogger } from '../log/winston.js';
import {
    removeBankaraScheduleCredentials,
    removeSalmonRunScheduleCredentials,
} from './data/credentialRemovers/ScheduleCredentialRemover.js';

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault('Asia/Tokyo');

class Splatnet3Client {
    apiClient!: SplatNet3Api;
    Logger: Logger;
    constructor() {
        this.Logger = CreateLogger('SplatNet3Client');
    }

    async initialize() {
        const api = await Auth.initialize();

        // api.onTokenExpired = async (res: Response) => {
        //     const coralAuthData = await ValueCache.get('');
        // };

        this.apiClient = api;
    }

    async getAllSchedules() {
        // check caches
        const cache = await ValueCache.get('Schedules');

        // cacheがnullか、TTLが指定よりも小さかったら更新する
        if (cache == null || cache.TTL <= 600) {
            const schedules = await this.apiClient.getSchedules();

            // 最終スケジュールの始まり == データがもうない限界のStartTimeをTTLとする
            const startTime =
                schedules.data.bankaraSchedules.nodes[schedules.data.bankaraSchedules.nodes.length - 1].startTime;

            const now = dayjs().tz();

            const removed = removeAllScheduleCredentials(schedules.data);

            // credentialを消したデータをキャッシュする
            await ValueCache.set('Schedules', removed, dayjs.tz(startTime).diff(now, 'second'));

            return removed;
        }

        // キャッシュがあってTTLも十分であればそのままキャッシュを返す
        return JSON.parse(cache.value) as StageSchedule;
    }

    async getOpenBankaraSchedules() {
        // check caches
        const cache = await ValueCache.get('Schedules');

        if (cache == null) {
            const schedules = await this.apiClient.getSchedules();

            const converted = removeBankaraScheduleCredentials(schedules.data.bankaraSchedules);

            // TTL設定
            // 最新のスケジュールの終了をTTL
            // 0以下になったらキャッシュしない
            const diff = dayjs(converted.open[0].endTime).diff(dayjs(), 'second');

            if (diff > 0) {
                await ValueCache.set('Schedules', schedules, diff);
            }

            return converted.open;
        } else {
            return JSON.parse(cache.value) as Schedule[];
        }
    }

    async getChallengeBankaraSchedules() {
        // check caches
        const cache = await ValueCache.get('Schedules');

        if (cache == null) {
            const schedules = await this.apiClient.getSchedules();

            const converted = removeBankaraScheduleCredentials(schedules.data.bankaraSchedules);

            // TTL設定
            // 最新のスケジュールの終了をTTL
            // 0以下になったらキャッシュしない
            const diff = dayjs(converted.challenge[0].endTime).diff(dayjs(), 'second');

            if (diff > 0) {
                await ValueCache.set('Schedules', schedules, diff);
            }

            return converted.challenge;
        } else {
            return JSON.parse(cache.value) as Schedule[];
        }
    }

    async getSalmonRunSchedules(): Promise<SalmonRunSchedule[]> {
        const cache = await ValueCache.get('Schedules');

        if (cache == null) {
            const schedules = await this.apiClient.getSchedules();

            const salmonRunSchedules = removeSalmonRunScheduleCredentials(schedules.data.coopGroupingSchedule);

            const diff = dayjs(salmonRunSchedules[0].startTime).diff(dayjs(), 'second');

            if (diff > 0) {
                await ValueCache.set('Schedules', schedules, diff);
            }

            return salmonRunSchedules;
        } else {
            const schedules = JSON.parse(cache.value);

            return schedules;
        }
    }

    async getXRankings() {
        // WFJhbmtpbmdTZWFzb24tcDoy

        // 型拡張の方法ないのかな・・・
        let cursor: string | null = 'null';
        let datas: xRankingPlayerData[] = [];

        for (let i = 1; i <= 5; i++) {
            while (true) {
                this.Logger.info(`[getXRankings]page ${i}, cursor: ${cursor}`);

                const data = (await this.apiClient.persistedQuery(RequestId.DetailTabViewXRankingArRefetchQuery, {
                    cursor: cursor,
                    first: 25,
                    id: 'WFJhbmtpbmdTZWFzb24tcDoy',
                    page: i,
                })) as unknown as DetailTabViewXRankingArRefetchQuery;

                const playerDatas = data.data.node.xRankingAr.edges.map((edge) => edge.node);

                datas = datas.concat(playerDatas);

                const pageInfo = data.data.node.xRankingAr.pageInfo;

                if (pageInfo.hasNextPage == false) {
                    cursor = null;
                    break;
                } else {
                    cursor = pageInfo.endCursor;
                }
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        fs.writeFileSync('arRankings.json', JSON.stringify(datas));

        // while (true) {
        //     // TODO: 2023-02-01 09:51:29(水曜日) ライブラリの実装が間違えてるのでXRankingを自前で実装する
        //     // // XrankingDetailQuery -> DetailTabViewXRankingArRefetchQuery
        //     // // 2ページ目からはRefetchのみ pageが増えてcursorがnull
        //     // XRankingDetailQueryは各武器TOPのデータだった
        //     // const data = (await this.apiClient.getXRankingDetailPagination(
        //     //     'WFJhbmtpbmdTZWFzb24tcDoy',
        //     //     XRankingLeaderboardType.X_RANKING,
        //     //     XRankingLeaderboardRule.SPLAT_ZONES,
        //     //     cursor
        //     // )) as unknown as DetailTabViewXRankingArRefetchQuery;
        // }
    }
}

const _splatnet3ApiClient = new Splatnet3Client();

await _splatnet3ApiClient.initialize();

export const splatnet3ApiClient = _splatnet3ApiClient;
