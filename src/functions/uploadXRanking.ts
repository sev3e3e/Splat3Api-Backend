import { XRankingPlayerData } from '@sev3e3e/splat3api-client';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { Mode, DetailTabViewXRankingRefetchQuery } from '../types/xRankings.js';
import { CloudStorage } from '../utils/storage.js';
import { getXRankingJsonGCSPath } from '../utils/util.js';
// dayjs.locale('ja');
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

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

export const uploadXRankingRaw = (storage: CloudStorage, mode: Mode, data: DetailTabViewXRankingRefetchQuery) => {
    const modes: {
        [mode in Mode]: string;
    } = {
        xRankingAr: 'splatzones',
        xRankingCl: 'clamblitz',
        xRankingGl: 'rainmaker',
        xRankingLf: 'towercontrol',
    };

    const bucketName = 'splat3api-data';
    const now = dayjs().utc();

    const seasonId = Buffer.from(data.data.node.id, 'base64').toString();
    const idTagMatch = seasonId.match(/[pa]:\d{1,}/);

    if (!idTagMatch) throw new Error(`season ID parse error ${seasonId}`);

    const dir = `jsons/raw/archive/${now.format('YYYY/MM/DD')}`;
    const filename = `${now.format('YYYY-MM-DD.HH-mm-ss')}.xrank.detail.${idTagMatch[0].replace(':', '-')}.${
        modes[mode]
    }.json`;

    // await storage.saveJson(bucketName, `${dir}/${filename}`, JSON.stringify(data));
    storage.saveJsonWithStreams(bucketName, `${dir}/${filename}`, JSON.stringify(data));
};
