import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { Node2 } from '../../../types/xRankings.js';
import { XRankingPlayerData } from '@sev3e3e/splat3api-client';
dayjs.extend(timezone);
dayjs.extend(utc);

dayjs.tz.setDefault('Asia/Tokyo');

/**
 * 認証情報を削除します。
 * @param rawData XRankingPlayerDataRaw
 */
export function removeXRankingPlayerDataCredentials(rawData: Node2): XRankingPlayerData {
    return {
        name: rawData.name,
        nameId: rawData.nameId,
        rank: rawData.rank,
        xPower: rawData.xPower,
        weapon: rawData.weapon.name,
    };
}
