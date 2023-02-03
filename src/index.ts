// import { Logger } from "./log/winston.js";
import { RedisClient } from './redis/RedisClient.js';

import { CreateLogger } from './log/winston.js';
import { splatnet3ApiClient } from './splatnet/SplatNet3Client.js';

import * as fs from 'fs';
import { ValueCache } from './cache/Cache.js';

import dayjs from 'dayjs';

const Logger = CreateLogger('Index');

// TODO: deploy to cloud functions
// キャッシュが切れる前に確実に実行したい
// けどキャッシュが更新されていたら実行しない
// 現在front-backとレポを分けているけど、正直それをする必要は無いかもしれない
// 分けるとGCP上で使うリソースも2つ分になるし、使うライブラリも重複しててbuild cache等が溜まっていってしまう

// 定期的に実行するやつはpubsub trigger
// APIとして使うやつはhttp trigger
// かな？
const index = async () => {
    const logger = CreateLogger('Index');
    // const updater = new StageScheduleUpdater();

    // const json = await updater.update();

    const data = await splatnet3ApiClient.getXRankings('rainmaker');

    fs.writeFileSync('glglgl.json', JSON.stringify(data));
    await RedisClient.disconnect();
};

export const updateSchedule = async () => {
    // 2時間 + 5分
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

    const schedules = await splatnet3ApiClient.getAllSchedules();

    // 最終スケジュールの始まり == データがもうない限界のStartTimeをTTLとする
    const startTime = schedules.bankaraChallengeSchedules[schedules.bankaraChallengeSchedules.length - 1].startTime;
    const now = dayjs();
    const diff = dayjs(startTime).diff(now, 'second');

    await ValueCache.set('Schedules', schedules, diff);

    await RedisClient.disconnect();

    Logger.info(`Scheduleの更新完了です。TTL: ${diff}, TTR: ${diff - TTR}`);
};

/**
 * 1時間ごとに更新らしい。
 * Cloud Functionsのリソース消費量とか無料枠の雰囲気がまだわかっていないため、並列実行はせず愚直にシングルインスタンスで実行する
 */
export const updateXRanking = async () => {
    // area
    Logger.info('エリアのX Rankingを取得します。');
    const area = await splatnet3ApiClient.getXRankings('area');
    Logger.info('エリアのX Rankingをキャッシュします。');
    await ValueCache.set('AreaXRankings', area);
    await ValueCache.set('AreaXRankings:updatedAt', dayjs().format());

    // rainmaker
    Logger.info('ホコのX Rankingを取得します。');
    const rainmaker = await splatnet3ApiClient.getXRankings('rainmaker');
    Logger.info('ホコのX Rankingをキャッシュします。');
    await ValueCache.set('RainmakerXRankings', rainmaker);
    await ValueCache.set('RainmakerXRankings:updatedAt', dayjs().format());

    // clam
    Logger.info('アサリのX Rankingを取得します。');
    const clam = await splatnet3ApiClient.getXRankings('clam');
    Logger.info('アサリのX Rankingをキャッシュします。');
    await ValueCache.set('ClamXRankings', clam);
    await ValueCache.set('ClamXRankings:updatedAt', dayjs().format());

    // tower
    Logger.info('ヤグラのX Rankingを取得します。');
    const tower = await splatnet3ApiClient.getXRankings('tower');
    Logger.info('ヤグラのX Rankingをキャッシュします。');
    await ValueCache.set('TowerXRankings', tower);
    await ValueCache.set('TowerXRankings:updatedAt', dayjs().format());

    await RedisClient.disconnect();

    Logger.info('全モードのX Rankingを取得しました。');
};

await updateXRanking();

export { index };

// const bulletToken = await Auth.getBulletToken();

// console.log(JSON.stringify(coralApi.data, null, 2));

// Logger.debug("test");
// console.log(JSON.stringify(coralApi.data, null, 2));

// fs.writeFileSync("stageSchedule.json", JSON.stringify(json));
