import SplatNet3Api, { XRankingRegion } from 'nxapi/splatnet3';
import { removeAllScheduleCredentials } from './data/credentialRemovers/ScheduleCredentialRemover.js';
import { RequestId, StageScheduleResult } from 'splatnet3-types/splatnet3';

import { DetailTabViewXRankingRefetchQuery, Mode } from '../types/xRankings.js';
import { Logger } from 'winston';
import { removeXRankingPlayerDataCredentials } from './data/credentialRemovers/XRankingCredentialRemover.js';
import { XRankingPlayerData } from '@sev3e3e/splat3api-client';
import retry from 'async-retry';

export const getAllSchedules = async (apiClient: SplatNet3Api, logger: Logger | null = null) => {
    logger?.debug('SplatNet3からScheduleを取得します');
    const schedules = await apiClient.persistedQuery<StageScheduleResult>(RequestId.StageScheduleQuery, {});
    logger?.debug('Scheduleの取得が完了しました');

    // 念のため生Scheduleもキャッシュしておく
    // 認証情報とか含まれてるので取り扱い注意
    // logger?.debug('生のSchedulesをキャッシュします');
    // await ValueCache.set('RawSchedules', schedules);
    // logger?.debug('生のSchedulesをキャッシュしました');

    logger?.debug('Scheduleから認証情報を削除します');
    const removed = removeAllScheduleCredentials(schedules.data);
    logger?.debug('Scheduleの認証情報を削除しました');

    return removed;
};

export async function getXRankings(
    apiClient: SplatNet3Api,
    _mode: 'area' | 'tower' | 'rainmaker' | 'clam',
    seasonId: string,
    logger: Logger | null = null
): Promise<XRankingPlayerData[]> {
    // TODO: ライブラリの型 overwrite
    let cursor: string | null = 'null';
    let datas: XRankingPlayerData[] = [];

    let query: RequestId;
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

    for (let i = 1; i <= 5; i++) {
        while (true) {
            logger?.debug(`page ${i}, cursor: ${cursor}`);

            await new Promise((resolve) => setTimeout(resolve, 500));

            // retryする
            const data = await retry(
                async () => {
                    const data = (await apiClient.persistedQuery(query, {
                        cursor: cursor,
                        first: 25,
                        id: seasonId,
                        page: i,
                    })) as unknown as DetailTabViewXRankingRefetchQuery;

                    return data;
                },
                {
                    retries: 3,
                    minTimeout: 5000,
                    maxTimeout: 10000,
                    onRetry(e, attempt) {
                        logger?.warn(`retry ${attempt}回目: ${e}`);
                    },
                }
            );

            const node = data.data.node;

            if (node == null) {
                throw new Error(`${mode} node is null`);
            }

            const playerDatas = node[mode]!.edges.map((edge) => removeXRankingPlayerDataCredentials(edge.node));

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

export async function getXRankingsRaw(
    apiClient: SplatNet3Api,
    _mode: 'area' | 'tower' | 'rainmaker' | 'clam',
    seasonId: string,
    logger: Logger | null = null
): Promise<DetailTabViewXRankingRefetchQuery> {
    // TODO: ライブラリの型 overwrite
    let cursor: string | null = 'null';
    // let datas: XRankingPlayerData[] = [];
    let edges: any[] = [];

    let query: RequestId;
    let mode: Mode;
    let temp: DetailTabViewXRankingRefetchQuery | null = null;

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

    for (let i = 1; i <= 5; i++) {
        while (true) {
            logger?.debug(`page ${i}, cursor: ${cursor}`);

            await new Promise((resolve) => setTimeout(resolve, 500));

            // retryする
            const data = await retry(
                async () => {
                    const data = (await apiClient.persistedQuery(query, {
                        cursor: cursor,
                        first: 25,
                        id: seasonId,
                        page: i,
                    })) as unknown as DetailTabViewXRankingRefetchQuery;

                    return data;
                },
                {
                    retries: 3,
                    minTimeout: 5000,
                    maxTimeout: 10000,
                    onRetry(e, attempt) {
                        logger?.warn(`retry ${attempt}回目: ${e}`);
                    },
                }
            );

            if (data == null) {
                throw new Error(`${mode} node is null`);
            }

            if (temp == null) {
                temp = data;
                continue;
            }

            const node = data.data.node;
            const _edges = node[mode]!.edges;
            edges = edges.concat(_edges);

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

    if (!temp) throw new Error('temp is empty');

    temp.data.node[mode]!.edges = edges;

    return temp;
}

export async function getSeasonInfo(apiClient: SplatNet3Api, logger: Logger | null = null) {
    logger?.debug('現在のSeason情報を取得します。');

    const atlantic = await apiClient.getXRanking(XRankingRegion.ATLANTIC);
    const pacific = await apiClient.getXRanking(XRankingRegion.PACIFIC);

    logger?.debug('Season情報の取得が完了しました。');

    if (pacific.data.xRanking.currentSeason == null || atlantic.data.xRanking.currentSeason == null)
        throw new Error('Season情報を取得できませんでした');

    return {
        pacific: {
            id: pacific.data.xRanking.currentSeason.id,
            name: pacific.data.xRanking.currentSeason.name,
            startTime: pacific.data.xRanking.currentSeason.startTime,
            endTime: pacific.data.xRanking.currentSeason.endTime,
        },
        atlantic: {
            id: atlantic.data.xRanking.currentSeason.id,
            name: atlantic.data.xRanking.currentSeason.name,
            startTime: atlantic.data.xRanking.currentSeason.startTime,
            endTime: atlantic.data.xRanking.currentSeason.endTime,
        },
    };
}
