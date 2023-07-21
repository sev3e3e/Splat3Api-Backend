import dayjs from 'dayjs';
import { CreateLogger } from './log/winston.js';
import { RedisClient } from './redis/RedisClient.js';
import { Authentication } from './splatnet/Auth.js';
import { getSeasonInfo, getXRankings, getXRankingsRaw } from './splatnet/SplatNet3Client.js';
import { Mode } from './types/xRankings.js';
import { uploadXRanking, uploadXRankingRaw } from './uploadXRanking.js';
import { CloudStorage } from './utils/storage.js';

/**
 * 1時間ごとに更新らしい。
 * Cloud Functionsのリソース消費量とか無料枠の雰囲気がまだわかっていないため、並列実行はせず愚直にシングルインスタンスで実行する
 */
export const updateXRanking = async () => {
    // logger
    const logger = CreateLogger('updateXRanking');

    // getCurrentTime
    const now = dayjs().format();

    await RedisClient.connect();

    // 認証
    const auth = new Authentication();
    const api = await auth.initialize(true);

    // get season info
    const seasonInfo = await getSeasonInfo(api, logger);

    if (seasonInfo == null) {
        throw new Error('SeasonInfoが取得できませんでした。');
    }

    // area
    logger.info('エリアのX Rankingを取得します。');
    const area = await getXRankings(api, 'area', seasonInfo.id, logger);

    // rainmaker
    logger.info('ホコのX Rankingを取得します。');
    const rainmaker = await getXRankings(api, 'rainmaker', seasonInfo.id, logger);

    // clam
    logger.info('アサリのX Rankingを取得します。');
    const clam = await getXRankings(api, 'clam', seasonInfo.id, logger);

    // tower
    logger.info('ヤグラのX Rankingを取得します。');
    const tower = await getXRankings(api, 'tower', seasonInfo.id, logger);

    logger.info('Redisに保存します。');

    await RedisClient.multi()
        .zAdd(
            'AreaXRankings:temp',
            area.map((data) => {
                return {
                    score: data.rank,
                    value: JSON.stringify(data),
                };
            })
        )
        .zAdd(
            'RainmakerXRankings:temp',
            rainmaker.map((data) => {
                return {
                    score: data.rank,
                    value: JSON.stringify(data),
                };
            })
        )
        .zAdd(
            'ClamXRankings:temp',
            clam.map((data) => {
                return {
                    score: data.rank,
                    value: JSON.stringify(data),
                };
            })
        )
        .zAdd(
            'TowerXRankings:temp',
            tower.map((data) => {
                return {
                    score: data.rank,
                    value: JSON.stringify(data),
                };
            })
        )
        // Area, Rainmaker, Clam, Towerのtempをdataにリネーム
        .rename('AreaXRankings:temp', 'AreaXRankings:data')
        .rename('RainmakerXRankings:temp', 'RainmakerXRankings:data')
        .rename('ClamXRankings:temp', 'ClamXRankings:data')
        .rename('TowerXRankings:temp', 'TowerXRankings:data')
        // Area, Rainmaker, Clam, Towerのtempを削除
        .del('AreaXRankings:temp')
        .del('RainmakerXRankings:temp')
        .del('ClamXRankings:temp')
        .del('TowerXRankings:temp')
        // Area, Rainmaker, Clam, TowerのUpdatedAtを更新
        .set('AreaXRankings:updatedAt', now)
        .set('RainmakerXRankings:updatedAt', now)
        .set('ClamXRankings:updatedAt', now)
        .set('TowerXRankings:updatedAt', now)
        .exec();

    await RedisClient.disconnect();

    logger.info('Cloud Storageに保存します。');
    const storage = new CloudStorage();

    await Promise.all([
        uploadXRanking(storage, Mode.Area, area),
        uploadXRanking(storage, Mode.Rainmaker, rainmaker),
        uploadXRanking(storage, Mode.Clam, clam),
        uploadXRanking(storage, Mode.Tower, tower),
    ]);

    logger.info('全モードのX Rankingを取得しました。');
};

export const updateXRankingRaw = async () => {
    // logger
    const logger = CreateLogger('updateXRankingRaw');

    // getCurrentTime
    const now = dayjs().format();

    await RedisClient.connect();

    // 認証
    const auth = new Authentication();
    const api = await auth.initialize(true);

    // get season info
    const seasonInfo = await getSeasonInfo(api, logger);

    if (seasonInfo == null) {
        throw new Error('SeasonInfoが取得できませんでした。');
    }

    // area
    logger.info('エリアのX Rankingを取得します。');
    const area = await getXRankingsRaw(api, 'area', seasonInfo.id, logger);

    // rainmaker
    logger.info('ホコのX Rankingを取得します。');
    const rainmaker = await getXRankingsRaw(api, 'rainmaker', seasonInfo.id, logger);

    // clam
    logger.info('アサリのX Rankingを取得します。');
    const clam = await getXRankingsRaw(api, 'clam', seasonInfo.id, logger);

    // tower
    logger.info('ヤグラのX Rankingを取得します。');
    const tower = await getXRankingsRaw(api, 'tower', seasonInfo.id, logger);

    await RedisClient.disconnect();

    logger.info('Cloud Storageに保存します。');
    const storage = new CloudStorage();

    await Promise.all([
        uploadXRankingRaw(storage, Mode.Area, area),
        uploadXRankingRaw(storage, Mode.Rainmaker, rainmaker),
        uploadXRankingRaw(storage, Mode.Clam, clam),
        uploadXRankingRaw(storage, Mode.Tower, tower),
    ]);

    logger.info('全モードのX Rankingを取得しました。');
};
