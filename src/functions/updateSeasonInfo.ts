import { CreateLogger } from '../log/winston.js';
import { RedisClient } from '../redis/RedisClient.js';
import { Authentication } from '../splatnet/Auth.js';
import { CloudStorage } from '../utils/storage.js';

export const updateSeasonInfo = async () => {
    const logger = CreateLogger('updateSeasonInfo');

    await RedisClient.connect();

    const auth = new Authentication();
    const api = await auth.initialize(true);

    await RedisClient.disconnect();

    // 5149402597bd2531b4eea04692d8bfd5
    logger.info('Season情報を取得します...');
    const xranking = await api.getXRanking(null);
    const pastSeasons = xranking.data.xRanking.pastSeasons?.nodes;
    const currentSeason = xranking.data.xRanking.currentSeason;

    if (!pastSeasons || !currentSeason) {
        throw new Error('season info is empty');
    }

    logger.info('Season情報を取得しました。');

    // upload to GCS
    logger.info('Season情報をGCSへ保存します...');
    const bucketName = 'splat3api-data';
    const filename = 'seasoninfo.json';

    const storage = new CloudStorage();

    storage.saveJsonWithStreams(
        bucketName,
        filename,
        JSON.stringify([
            {
                id: currentSeason.id,
                name: currentSeason.name,
                startTime: currentSeason.startTime,
                endTime: currentSeason.endTime,
            },
            ...pastSeasons,
        ])
    );

    logger.info('Season情報をGCSへ保存しました。');

    return;
};
