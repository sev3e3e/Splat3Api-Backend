import SplatNet3Api from 'nxapi/splatnet3';
import { ValueCache } from '../cache/Cache.js';
import {
    removeAllScheduleCredentials,
    SalmonRunSchedule,
    Schedule,
} from './data/credentialRemovers/ScheduleCredentialRemover.js';
import { RequestId } from 'splatnet3-types/splatnet3';

import dayjs from 'dayjs';

import { DetailTabViewXRankingRefetchQuery, Mode } from '../types/xRankings.js';
import { Logger } from 'winston';
import {
    removeBankaraScheduleCredentials,
    removeSalmonRunScheduleCredentials,
} from './data/credentialRemovers/ScheduleCredentialRemover.js';
import {
    CredentialRemovedXRankingPlayerData,
    removeXRankingPlayerDataCredentials,
} from './data/credentialRemovers/XRankingCredentialRemover.js';

export const getAllSchedules = async (apiClient: SplatNet3Api, logger: Logger | null = null) => {
    logger?.debug('SplatNet3からScheduleを取得します');
    const schedules = await apiClient.getSchedules();
    logger?.debug('Scheduleの取得が完了しました');

    logger?.debug('Scheduleから認証情報を削除します');
    const removed = removeAllScheduleCredentials(schedules.data);
    logger?.debug('Scheduleの認証情報を削除しました');

    return removed;
};

export async function getOpenBankaraSchedules(apiClient: SplatNet3Api, logger: Logger) {
    // check caches
    const cache = await ValueCache.get('Schedules');

    if (cache == null) {
        const schedules = await apiClient.getSchedules();

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

export async function getChallengeBankaraSchedules(apiClient: SplatNet3Api) {
    // check caches
    const cache = await ValueCache.get('Schedules');

    if (cache == null) {
        const schedules = await apiClient.getSchedules();

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

export async function getSalmonRunSchedules(apiClient: SplatNet3Api): Promise<SalmonRunSchedule[]> {
    const cache = await ValueCache.get('Schedules');

    if (cache == null) {
        const schedules = await apiClient.getSchedules();

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

// TODO: season id自動取得
// seasonが変わるたびに手動で更新してられない....
export async function getXRankings(
    apiClient: SplatNet3Api,
    _mode: 'area' | 'tower' | 'rainmaker' | 'clam',
    logger: Logger | null = null
): Promise<CredentialRemovedXRankingPlayerData[]> {
    // WFJhbmtpbmdTZWFzb24tcDoy

    // TODO: ライブラリの型 overwrite
    let cursor: string | null = 'null';
    let datas: CredentialRemovedXRankingPlayerData[] = [];

    for (let i = 1; i <= 5; i++) {
        while (true) {
            logger?.debug(`page ${i}, cursor: ${cursor}`);

            await new Promise((resolve) => setTimeout(resolve, 500));

            let query: string;
            let mode: Mode;

            switch (_mode) {
                case 'area':
                    query = RequestId.DetailTabViewXRankingArRefetchQuery;
                    mode = Mode.Area;
                    break;

                case 'clam':
                    query = RequestId.DetailTabViewXRankingClRefetchQuery;
                    mode = Mode.Clam;
                    break;
                case 'rainmaker':
                    query = RequestId.DetailTabViewXRankingGlRefetchQuery;
                    mode = Mode.Rainmaker;
                    break;

                case 'tower':
                    query = RequestId.DetailTabViewXRankingLfRefetchQuery;
                    mode = Mode.Tower;
                    break;
            }

            const data = (await apiClient.persistedQuery(query, {
                cursor: cursor,
                first: 25,
                id: 'WFJhbmtpbmdTZWFzb24tcDoy',
                page: i,
            })) as unknown as DetailTabViewXRankingRefetchQuery;

            const playerDatas = data.data.node[mode]!.edges.map((edge) =>
                removeXRankingPlayerDataCredentials(edge.node)
            );

            datas = datas.concat(playerDatas);

            const pageInfo = data.data.node[mode]!.pageInfo;

            if (pageInfo.hasNextPage == false) {
                cursor = null;
                break;
            } else {
                cursor = pageInfo.endCursor;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return datas;
}
