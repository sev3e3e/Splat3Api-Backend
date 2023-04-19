import tar from 'tar-stream';
import { Mode } from '../types/xRankings.js';
import dayjs from 'dayjs';

export function ReduceCacheExpiration(expiresIn: number, second: number = 5 * 60) {
    return expiresIn - second;
}

interface CompressJsonType {
    name: string;
    data: string;
}

export function tarJson(data: CompressJsonType | CompressJsonType[]) {
    // Tarアーカイブを作成するためのStreamを生成
    const pack = tar.pack();

    // dataが配列だったら
    if (Array.isArray(data)) {
        for (const d of data) {
            pack.entry({ name: d.name }, JSON.stringify(d.data));
        }
    } else {
        pack.entry({ name: data.name }, JSON.stringify(data.data));
    }

    return pack;
}

export function getXRankingJsonGCSPath(mode: Mode) {
    const now = dayjs();
    const datetimeStr = now.format('DD-MMM-YYYY');
    const datetimeStr2 = now.format(`HH`);

    return `jsons/${datetimeStr}/${mode}/${mode}.${datetimeStr}.${datetimeStr2}.json`;
}

export function getXRankingTarGzGCSPath(mode: Mode) {
    const now = dayjs();
    const datetimeStr = now.format('DD-MMM-YYYY');

    return `archives/${mode}/${datetimeStr}.tar.gz`;
}
