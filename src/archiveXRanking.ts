import dayjs from 'dayjs';
import path from 'path';
import { Mode } from './types/xRankings.js';
import { CloudStorage } from './utils/storage.js';
import { tarJson } from './utils/util.js';

import * as zlib from 'zlib';

/**
 * Archive the XRanking JSON data in Cloud Storage using Tar and Gzip
 */
export const archiveXRanking = async () => {
    // cloud storageからjsonファイルを一括取得
    const bucketName = 'splat3api-data';

    const storage = new CloudStorage();

    // その日の23時30分ぐらいに実行するので、当日のディレクトリを指定
    const now = dayjs();
    const datetimeStr = now.format('DD-MMM-YYYY');

    const files = await storage.getFiles(bucketName, `jsons/${datetimeStr}`);

    const dataAr = files
        .filter((file) => {
            return file.name.includes('xRankingAr');
        })
        .map(async (file) => {
            const data = await file.download();
            return {
                name: path.basename(file.name),
                data: data[0].toString('utf-8'),
            };
        });

    const dataCl = files
        .filter((file) => {
            return file.name.includes('xRankingCl');
        })
        .map(async (file) => {
            const data = await file.download();
            return {
                name: path.basename(file.name),
                data: data[0].toString('utf-8'),
            };
        });

    const dataGl = files
        .filter((file) => {
            return file.name.includes('xRankingGl');
        })
        .map(async (file) => {
            const data = await file.download();
            return {
                name: path.basename(file.name),
                data: data[0].toString('utf-8'),
            };
        });

    const dataLf = files
        .filter((file) => {
            return file.name.includes('xRankingLf');
        })
        .map(async (file) => {
            const data = await file.download();
            return {
                name: path.basename(file.name),
                data: data[0].toString('utf-8'),
            };
        });

    const [resultAr, resultCl, resultGl, resultLf] = await Promise.all([
        Promise.all(dataAr),
        Promise.all(dataCl),
        Promise.all(dataGl),
        Promise.all(dataLf),
    ]);

    for (const xRankingData of [
        { mode: Mode.Area, data: resultAr },
        { mode: Mode.Clam, data: resultCl },
        { mode: Mode.Rainmaker, data: resultGl },
        { mode: Mode.Tower, data: resultLf },
    ]) {
        const pack = tarJson(xRankingData.data);

        // gz圧縮する
        const gzip = zlib.createGzip();

        // gz圧縮したものをCloud Storageにアップロード
        const filename = `archives/${xRankingData.mode}/${datetimeStr}.tar.gz`;
        const file = storage.storage.bucket(bucketName).file(filename);
        const stream = file.createWriteStream({
            metadata: {
                contentType: 'application/gzip',
            },
        });

        pack.pipe(gzip).pipe(stream);

        // finalize
        pack.finalize();
    }
};
