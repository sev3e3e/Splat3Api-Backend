import { Storage } from '@google-cloud/storage';

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
        (await this.file(bucketName, filename)).save(data, {
            contentType: 'application/json',
        });
    }
}
