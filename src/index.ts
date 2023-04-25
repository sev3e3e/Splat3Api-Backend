// https://stackoverflow.com/a/67461142
import { Context } from '@google-cloud/functions-framework';
import { PubsubMessage } from '@google-cloud/pubsub/build/src/publisher';
import { RedisClient } from './redis/RedisClient.js';
import { CreateLogger } from './log/winston.js';
import { getAllSchedules } from './splatnet/SplatNet3Client.js';
import { ValueCache } from './cache/Cache.js';
import { Authentication } from './splatnet/Auth.js';
import dayjs from 'dayjs';

// !: Import itself for testing
import * as main from './index.js';

import { archiveXRanking } from './archiveXRanking.js';
import { updateXRanking } from './updateXRanking.js';

export const index = async (_msg: PubsubMessage, context: Context) => {
    if (!_msg.data) {
        return;
    }

    const message = Buffer.from(_msg.data as string, 'base64').toString();

    // update schedule message
    if (message == 'update schedule') {
        await updateSchedule();
    }

    // update x ranking
    else if (message == 'update x-ranking') {
        await updateXRanking();
    }

    // archive x ranking
    else if (message == 'archive x-ranking') {
        await archiveXRanking();
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
