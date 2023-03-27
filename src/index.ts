// https://stackoverflow.com/a/67461142
import { Context } from '@google-cloud/functions-framework';
import { PubsubMessage } from '@google-cloud/pubsub/build/src/publisher';
import { RedisClient } from './redis/RedisClient.js';
import { CreateLogger } from './log/winston.js';
import { getAllSchedules, getSeasonInfo, getXRankings } from './splatnet/SplatNet3Client.js';
import { ValueCache } from './cache/Cache.js';
import { Authentication } from './splatnet/Auth.js';
import dayjs from 'dayjs';

// !: Import itself for testing
import * as main from './index.js';

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
};

export const updateSchedule = async () => {
    // logger
    const logger = CreateLogger('UpdateSchedule');

    // connect to redis
    await RedisClient.connect();

    // 認証
    const auth = new Authentication();
    const api = await auth.initialize();

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

    // bankara challengeのみ欲しい、とかもあるしれないので
    // 各モードのみの値も保存しておく

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

    await RedisClient.connect();

    // 認証
    const auth = new Authentication();
    const api = await auth.initialize();

    // get season info
    const seasonInfo = await getSeasonInfo(api, logger);

    if (seasonInfo == null) {
        throw new Error('SeasonInfoが取得できませんでした。');
    }

    // area
    logger.info('エリアのX Rankingを取得します。');
    const area = await getXRankings(api, 'area', seasonInfo.id, logger);
    logger.info('エリアのX Rankingをキャッシュします。');

    // await ValueCache.set('AreaXRankings', area);
    await RedisClient.zAdd(
        'AreaXRankings:data',
        area.map((data) => {
            return {
                score: data.rank,
                value: JSON.stringify(data),
            };
        })
    );
    await ValueCache.set('AreaXRankings:updatedAt', dayjs().format());

    // rainmaker
    logger.info('ホコのX Rankingを取得します。');
    const rainmaker = await getXRankings(api, 'rainmaker', seasonInfo.id, logger);
    logger.info('ホコのX Rankingをキャッシュします。');
    // await ValueCache.set('RainmakerXRankings', rainmaker);
    await RedisClient.zAdd(
        'RainmakerXRankings:data',
        rainmaker.map((data) => {
            return {
                score: data.rank,
                value: JSON.stringify(data),
            };
        })
    );
    await ValueCache.set('RainmakerXRankings:updatedAt', dayjs().format());

    // clam
    logger.info('アサリのX Rankingを取得します。');
    const clam = await getXRankings(api, 'clam', seasonInfo.id, logger);
    logger.info('アサリのX Rankingをキャッシュします。');
    // await ValueCache.set('ClamXRankings', clam);
    await RedisClient.zAdd(
        'ClamXRankings:data',
        clam.map((data) => {
            return {
                score: data.rank,
                value: JSON.stringify(data),
            };
        })
    );
    await ValueCache.set('ClamXRankings:updatedAt', dayjs().format());

    // tower
    logger.info('ヤグラのX Rankingを取得します。');
    const tower = await getXRankings(api, 'tower', seasonInfo.id, logger);
    logger.info('ヤグラのX Rankingをキャッシュします。');
    // await ValueCache.set('TowerXRankings', tower);
    await RedisClient.zAdd(
        'TowerXRankings:data',
        tower.map((data) => {
            return {
                score: data.rank,
                value: JSON.stringify(data),
            };
        })
    );
    await ValueCache.set('TowerXRankings:updatedAt', dayjs().format());

    // 全てのrankingsをまとめたやつキャッシュ
    // logger.info('全てのrankingsをまとめてキャッシュします。');
    // await ValueCache.set('AllXRankings', {
    //     clam: clam,
    //     tower: tower,
    //     rainmaker: rainmaker,
    //     area: area,
    // });

    await RedisClient.disconnect();

    logger.info('全モードのX Rankingを取得しました。');
};
