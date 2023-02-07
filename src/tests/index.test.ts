import { describe, test, expect, vi } from 'vitest';

import * as main from '../index';

// https://cloud.google.com/functions/docs/testing/test-event?hl=ja#unit_tests
// !:pubsub emulator使わなくても良いっぽい
describe('Index関数', () => {
    test('"update schedule"とメッセージが来たらupdateSchedule()を呼ぶ', async () => {
        vi.spyOn(main, 'updateSchedule').mockResolvedValueOnce();

        const message = {
            data: Buffer.from('update schedule').toString('base64'),
        };

        await main.index(message, {});

        expect(main.updateSchedule).toHaveBeenCalled();
    });

    test('"update x-ranking"とメッセージが来たらupdateXRanking()を呼ぶ', async () => {
        vi.spyOn(main, 'updateXRanking').mockResolvedValueOnce();

        const message = {
            data: Buffer.from('update x-ranking').toString('base64'),
        };

        await main.index(message, {});

        expect(main.updateXRanking).toHaveBeenCalled();
    });
});
