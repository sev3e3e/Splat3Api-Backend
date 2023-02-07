// https://stackoverflow.com/a/67461142
import { Context } from '@google-cloud/functions-framework';
import { PubsubMessage } from '@google-cloud/pubsub/build/src/publisher';

import { RedisClient } from './redis/RedisClient.js';

import { CreateLogger } from './log/winston.js';
import { getAllSchedules, getXRankings } from './splatnet/SplatNet3Client.js';

import * as fs from 'fs';
import { ValueCache } from './cache/Cache.js';

import dayjs from 'dayjs';
import { Authentication } from './splatnet/Auth.js';

// !: Import itself for testing
import * as main from './index.js';

const Logger = CreateLogger('Index');

// TODO: deploy to cloud functions
// キャッシュが切れる前に確実に実行したい
// けどキャッシュが更新されていたら実行しない
// 現在front-backとレポを分けているけど、正直それをする必要は無いかもしれない
// 分けるとGCP上で使うリソースも2つ分になるし、使うライブラリも重複しててbuild cache等が溜まっていってしまう

// 定期的に実行するやつはpubsub trigger
// APIとして使うやつはhttp trigger
// かな？
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
    // 認証
    const auth = new Authentication();
    const api = await auth.initialize();

    // logger
    const logger = CreateLogger('UpdateSchedule');

    // Time-To-Refresh: 2時間 + 5分
    const TTR = 600 + 7200;

    const cache = await ValueCache.get('Schedules');

    if (cache == null) {
        Logger.warn('Scheduleのキャッシュが存在しません。新たに取得します。');
    } else if (cache.TTL <= TTR) {
        Logger.info(`ScheduleのTTLが残り${cache.TTL}秒です。キャッシュを更新します。`);
    } else {
        Logger.info(`ScheduleのTTLは残り${cache.TTL}秒、Refreshまでは残り${cache.TTL - TTR}秒です。更新はしません。`);
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
    await ValueCache.set('league_battle_schedule', schedules.leagueSchedules, diff);

    await RedisClient.disconnect();

    Logger.info(`Scheduleの更新完了です。TTL: ${diff}, TTR: ${diff - TTR}`);
};

/**
 * 1時間ごとに更新らしい。
 * Cloud Functionsのリソース消費量とか無料枠の雰囲気がまだわかっていないため、並列実行はせず愚直にシングルインスタンスで実行する
 */
export const updateXRanking = async () => {
    // 認証
    const auth = new Authentication();
    const api = await auth.initialize();

    // area
    Logger.info('エリアのX Rankingを取得します。');
    const area = await getXRankings(api, 'area');
    Logger.info('エリアのX Rankingをキャッシュします。');
    await ValueCache.set('AreaXRankings', area);
    await ValueCache.set('AreaXRankings:updatedAt', dayjs().format());

    // rainmaker
    Logger.info('ホコのX Rankingを取得します。');
    const rainmaker = await getXRankings(api, 'rainmaker');
    Logger.info('ホコのX Rankingをキャッシュします。');
    await ValueCache.set('RainmakerXRankings', rainmaker);
    await ValueCache.set('RainmakerXRankings:updatedAt', dayjs().format());

    // clam
    Logger.info('アサリのX Rankingを取得します。');
    const clam = await getXRankings(api, 'clam');
    Logger.info('アサリのX Rankingをキャッシュします。');
    await ValueCache.set('ClamXRankings', clam);
    await ValueCache.set('ClamXRankings:updatedAt', dayjs().format());

    // tower
    Logger.info('ヤグラのX Rankingを取得します。');
    const tower = await getXRankings(api, 'tower');
    Logger.info('ヤグラのX Rankingをキャッシュします。');
    await ValueCache.set('TowerXRankings', tower);
    await ValueCache.set('TowerXRankings:updatedAt', dayjs().format());

    await RedisClient.disconnect();

    Logger.info('全モードのX Rankingを取得しました。');
};

const _ = async () => {
    await updateSchedule();
};
