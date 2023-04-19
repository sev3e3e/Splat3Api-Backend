// https://stackoverflow.com/a/67461142
import { Context } from '@google-cloud/functions-framework';
import { PubsubMessage } from '@google-cloud/pubsub/build/src/publisher';
import { RedisClient } from './redis/RedisClient.js';
import { CreateLogger } from './log/winston.js';
import { getAllSchedules, getSeasonInfo, getXRankings } from './splatnet/SplatNet3Client.js';
import { ValueCache } from './cache/Cache.js';
import { Authentication } from './splatnet/Auth.js';
import dayjs from 'dayjs';

import * as zlib from 'zlib';

// !: Import itself for testing
import * as main from './index.js';
import { CloudStorage } from './utils/storage.js';
import { getXRankingJsonGCSPath, tarJson } from './utils/util.js';
import { XRankingPlayerData } from '@sev3e3e/splat3api-client';
import { Mode } from './types/xRankings.js';
import path from 'path';

export const index = async (_msg: PubsubMessage, context: Context) => {
    if (!_msg.data) {
        return;
    }

    const message = Buffer.from(_msg.data as string, 'base64').toString();

    // update schedule message
    if (message == 'update schedule') {
        await main.updateSchedule();
    }

    // update x ranking
    else if (message == 'update x-ranking') {
        await main.updateXRanking();
    }

    // archive x ranking
    else if (message == 'archive x-ranking') {
        await main.archiveXRanking();
    }
};

export const updateSchedule = async () => {
    // logger
    const logger = CreateLogger('UpdateSchedule');

    // connect to redis
    await RedisClient.connect();

    // 認証
    const auth = new Authentication();
    const api = await auth.initialize(true);

    // Time-To-Refresh: 2時間 + 5分
    const TTR = 600 + 7200;

    const cache = await ValueCache.get('Schedules');

    if (cache == null) {
        logger.warn('Scheduleのキャッシュが存在しません。新たに取得します。');
    } else if (cache.TTL <= TTR) {
        logger.info(`ScheduleのTTLが残り${cache.TTL}秒です。キャッシュを更新します。`);
    } else {
        logger.info(`ScheduleのTTLは残り${cache.TTL}秒、Refreshまでは残り${cache.TTL - TTR}秒です。更新はしません。`);

        await RedisClient.disconnect();

        return;
    }

    const schedules = await getAllSchedules(api, logger);

    // 最終スケジュールの始まり == データがもうない限界のStartTimeをTTLとする
    const startTime = schedules.bankaraChallengeSchedules[schedules.bankaraChallengeSchedules.length - 1].startTime;
    const now = dayjs();
    const diff = dayjs(startTime).diff(now, 'second');

    await ValueCache.set('Schedules', schedules, diff);

    // レギュラーマッチ
    await ValueCache.set('regular_schedule', schedules.regularSchedules, diff);

    // バンカラマッチ オープン
    await ValueCache.set('bankara_open_schedule', schedules.bankaraOpenSchedules, diff);

    // バンカラマッチ チャレンジ
    await ValueCache.set('bankara_challenge_schedule', schedules.bankaraChallengeSchedules, diff);

    // Xマッチ
    await ValueCache.set('x_battle_schedule', schedules.xSchedules, diff);

    // サーモンラン
    await ValueCache.set('salmon_run_schedule', schedules.salmonRunSchedules, diff);

    // リーグマッチ
    // ?: (NSOバージョンアップでなくなるらしい) 2023-02-05 16:24:26(日曜日)
    // await ValueCache.set('league_battle_schedule', schedules.leagueSchedules, diff);

    await RedisClient.disconnect();

    logger.info(`Scheduleの更新完了です。TTL: ${diff}, TTR: ${diff - TTR}`);
};

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

/**
 * Upload XRanking JsonData to Cloud Storage.
 */
export const uploadXRanking = async (storage: CloudStorage, mode: Mode, datas: XRankingPlayerData[]) => {
    const bucketName = 'splat3api-data';

    const now = dayjs();
    const datetimeStr = now.format('DD-MMM-YYYY');
    const datetimeStr2 = now.format(`HH`);

    // 引数modeとdatetimeStrをmerge
    const filename = getXRankingJsonGCSPath(mode);

    await storage.saveJson(bucketName, filename, JSON.stringify(datas));
};

/**
 * Archive the XRanking JSON data in Cloud Storage using Tar and Gzip
 */
export const archiveXRanking = async () => {
    // cloud storageからjsonファイルを一括取得
    const bucketName = 'splat3api-data';

    const storage = new CloudStorage();

    // その日の23時30分ぐらいに実行するので、当日のディレクトリを指定
    const now = dayjs();
    const datetimeStr = now.format('DD-MMM-YYYY');
    console.log(datetimeStr);
    const [files] = await storage.storage.bucket(bucketName).getFiles({ prefix: `jsons/${datetimeStr}` });

    const dataAr = files
        .filter((file) => {
            return file.name.includes('xRankingAr');
        })
        .map(async (file) => {
            const data = await file.download();
            return {
                name: path.basename(file.name),
                data: data[0].toString('utf-8'),
            };
        });

    const dataCl = files
        .filter((file) => {
            return file.name.includes('xRankingCl');
        })
        .map(async (file) => {
            const data = await file.download();
            return {
                name: path.basename(file.name),
                data: data[0].toString('utf-8'),
            };
        });

    const dataGl = files
        .filter((file) => {
            return file.name.includes('xRankingGl');
        })
        .map(async (file) => {
            const data = await file.download();
            return {
                name: path.basename(file.name),
                data: data[0].toString('utf-8'),
            };
        });

    const dataLf = files
        .filter((file) => {
            return file.name.includes('xRankingLf');
        })
        .map(async (file) => {
            const data = await file.download();
            return {
                name: path.basename(file.name),
                data: data[0].toString('utf-8'),
            };
        });

    const [resultAr, resultCl, resultGl, resultLf] = await Promise.all([
        Promise.all(dataAr),
        Promise.all(dataCl),
        Promise.all(dataGl),
        Promise.all(dataLf),
    ]);

    for (const xRankingData of [
        { mode: Mode.Area, data: resultAr },
        { mode: Mode.Clam, data: resultCl },
        { mode: Mode.Rainmaker, data: resultGl },
        { mode: Mode.Tower, data: resultLf },
    ]) {
        const pack = tarJson(xRankingData.data);

        // gz圧縮する
        const gzip = zlib.createGzip();

        // gz圧縮したものをCloud Storageにアップロード
        const filename = `archives/${xRankingData.mode}/${datetimeStr}.tar.gz`;
        const file = storage.storage.bucket(bucketName).file(filename);
        const stream = file.createWriteStream({
            metadata: {
                contentType: 'application/gzip',
            },
        });

        pack.pipe(gzip).pipe(stream);

        // finalize
        pack.finalize();
    }
};

// 認証
// const auth = new Authentication();
// const api = await auth.initialize(true);

// // get season info
// const seasonInfo = await getSeasonInfo(api);

// if (seasonInfo == null) {
//     throw new Error('SeasonInfoが取得できませんでした。');
// }

// const area = await getXRankings(api, 'area', seasonInfo.id);

await RedisClient.connect();

// const cachedArea = await RedisClient.zRange('AreaXRankings:data', 0, 500);
// const area = cachedArea.map((cache) => {
//     return JSON.parse(cache) as unknown as XRankingPlayerData;
// });

// // towerも取得
// const cachedTower = await RedisClient.zRange('TowerXRankings:data', 0, 500);
// const tower = cachedTower.map((cache) => {
//     return JSON.parse(cache) as unknown as XRankingPlayerData;
// });

// // clam
// const cachedClam = await RedisClient.zRange('ClamXRankings:data', 0, 500);
// const clam = cachedClam.map((cache) => {
//     return JSON.parse(cache) as unknown as XRankingPlayerData;
// });

// // rainmaker
// const cachedRainmaker = await RedisClient.zRange('RainmakerXRankings:data', 0, 500);
// const rainmaker = cachedRainmaker.map((cache) => {
//     return JSON.parse(cache) as unknown as XRankingPlayerData;
// });

// const storage = new CloudStorage();

// uploadXRanking(storage, Mode.Area, area);
// uploadXRanking(storage, Mode.Tower, tower);
// uploadXRanking(storage, Mode.Clam, clam);
// uploadXRanking(storage, Mode.Rainmaker, rainmaker);

await archiveXRanking();

await RedisClient.disconnect();
