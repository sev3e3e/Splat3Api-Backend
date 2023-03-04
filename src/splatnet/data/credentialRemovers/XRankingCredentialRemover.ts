import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { xRankingPlayerData } from '../../../types/xRankings.js';

dayjs.extend(timezone);
dayjs.extend(utc);

dayjs.tz.setDefault('Asia/Tokyo');

export interface CredentialRemovedXRankingPlayerData {
    name: string;
    nameId: string;
    rank: number;
    xPower: number;
    weapon: string;
}

/**
 * XRankingPlayerDataの認証情報を削除します。
 * @param data xRankingPlayerData
 */
export function removeXRankingPlayerDataCredentials(data: xRankingPlayerData): CredentialRemovedXRankingPlayerData {
    return {
        name: data.name,
        nameId: data.nameId,
        rank: data.rank,
        xPower: data.xPower,
        weapon: data.weapon.name,
    };
}
