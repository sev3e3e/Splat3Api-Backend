import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';

export class CloudStorage {
    storage: Storage;

    constructor() {
        this.storage = new Storage();
    }

    async getFiles(bucketName: string, prefix: string) {
        const [files] = await this.storage.bucket(bucketName).getFiles({
            prefix: prefix,
        });

        return files;
    }

    /**
     * get file object
     * @param bucketName bucket name.
     * @param filename file name with paths
     */
    async file(bucketName: string, filename: string) {
        return this.storage.bucket(bucketName).file(filename);
    }

    async saveJson(bucketName: string, filename: string, data: string) {
        const file = await this.file(bucketName, filename);
        return file
            .save(data, {
                contentType: 'application/json',
                resumable: false,
                validation: false,
            })
            .catch((error) => {
                console.error(error);
            });
    }

    saveJsonWithStreams(bucketName: string, filename: string, data: string) {
        const file = this.storage.bucket(bucketName).file(filename);
        Readable.from(JSON.stringify(data))
            .pipe(
                file.createWriteStream({
                    metadata: {
                        contentType: 'application/json',
                        resumable: false,
                        validation: false,
                    },
                })
            )
            .on('error', (error) => {
                console.error(error);
            })
            .on('finish', () => {
                console.log(`saved ${filename}`);
            });
    }
}
