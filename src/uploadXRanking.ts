import { XRankingPlayerData } from '@sev3e3e/splat3api-client';
import dayjs from 'dayjs';
import { Mode } from './types/xRankings.js';
import { CloudStorage } from './utils/storage.js';
import { getXRankingJsonGCSPath } from './utils/util.js';

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
