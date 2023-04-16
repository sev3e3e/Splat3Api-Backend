import { describe, test, expect, vi, beforeAll } from 'vitest';

import * as main from '../index';
import { Authentication } from '../splatnet/Auth';
import SplatNet3Api from 'nxapi/dist/api/splatnet3';
import { StageScheduleResult } from 'splatnet3-types/dist/splatnet3';

import {
    removeBankaraScheduleCredentials,
    removeRegularScheduleCredentials,
    removeSalmonRunScheduleCredentials,
    removeXScheduleCredentials,
} from '../splatnet/data/credentialRemovers/ScheduleCredentialRemover';
import { DetailTabViewXRankingRefetchQuery } from '../types/xRankings';
import { getSeasonInfo } from '../splatnet/SplatNet3Client';
import { removeXRankingPlayerDataCredentials } from '../splatnet/data/credentialRemovers/XRankingCredentialRemover';

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

describe('API Structure Test', () => {
    let auth: Authentication;
    let api: SplatNet3Api;
    let schedules: StageScheduleResult;
    let ArXRankings: DetailTabViewXRankingRefetchQuery;
    let seasonInfo: {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
    } | null;

    // 最初にsplatnet3の認証を行う
    beforeAll(async () => {
        // 認証
        auth = new Authentication();
        api = await auth.initialize(false);

        // season info取得
        seasonInfo = await getSeasonInfo(api);

        schedules = (await api.getSchedules()).data;

        // !: splatnet3-typesからRequestIdをimportするとエラーになるのでハードコード
        // !: Error: Missing "./dist/splatnet3" specifier in "splatnet3-types" package
        ArXRankings = (await api.persistedQuery('eb69df6f2a2f13ab207eedc568f0f8b6', {
            cursor: 'null',
            first: 25,
            id: seasonInfo?.id,
            page: 1,
        })) as unknown as DetailTabViewXRankingRefetchQuery;
    }, 200000);

    describe('Schedule Structure Test', () => {
        test('removeRegularScheduleCredentials', async () => {
            const regularSchedules = removeRegularScheduleCredentials(schedules.regularSchedules);

            // regularSchedules[0]がstartTime, endTime, rule, stagesプロパティを持っているかテスト
            expect(regularSchedules[0]).toHaveProperty('startTime');
            expect(regularSchedules[0]).toHaveProperty('endTime');
            expect(regularSchedules[0]).toHaveProperty('rule');
            expect(regularSchedules[0]).toHaveProperty('stages');
        }, 200000);

        // removeBankaraScheduleCredentialsのテスト
        test('removeBankaraScheduleCredentials', async () => {
            const bankaraSchedules = removeBankaraScheduleCredentials(schedules.bankaraSchedules);

            // bankaraSchedulesがopen, challengeプロパティを持っているかテスト
            expect(bankaraSchedules).toHaveProperty('open');
            expect(bankaraSchedules).toHaveProperty('challenge');

            // bankaraSchedules.open[]の長さが1以上かテスト
            expect(bankaraSchedules.open.length).toBeGreaterThanOrEqual(1);

            // bankaraSchedules.challenge[]の長さが1以上かテスト
            expect(bankaraSchedules.challenge.length).toBeGreaterThanOrEqual(1);

            // bankaraSchedules.openがstartTime, endTime, rule, stagesプロパティを持っているかテスト
            expect(bankaraSchedules.open[0]).toHaveProperty('startTime');
            expect(bankaraSchedules.open[0]).toHaveProperty('endTime');
            expect(bankaraSchedules.open[0]).toHaveProperty('rule');
            expect(bankaraSchedules.open[0]).toHaveProperty('stages');

            // bankaraSchedules.challengeがstartTime, endTime, rule, stagesプロパティを持っているかテスト
            expect(bankaraSchedules.challenge[0]).toHaveProperty('startTime');
            expect(bankaraSchedules.challenge[0]).toHaveProperty('endTime');
            expect(bankaraSchedules.challenge[0]).toHaveProperty('rule');
            expect(bankaraSchedules.challenge[0]).toHaveProperty('stages');
        });

        // removeXScheduleCredentialsのテスト
        test('removeXScheduleCredentials', async () => {
            const xSchedules = removeXScheduleCredentials(schedules.xSchedules);

            // xSchedules[0]がstartTime, endTime, rule, stagesプロパティを持っているかテスト
            expect(xSchedules[0]).toHaveProperty('startTime');
            expect(xSchedules[0]).toHaveProperty('endTime');
            expect(xSchedules[0]).toHaveProperty('rule');
            expect(xSchedules[0]).toHaveProperty('stages');
        });

        // removeSalmonRunScheduleCredentialsのテスト
        test('removeSalmonRunScheduleCredentials', async () => {
            const salmonRunSchedules = removeSalmonRunScheduleCredentials(schedules.coopGroupingSchedule);

            // salmonRunSchedules[0]がstartTime, endTime, stage, weaponsプロパティを持っているかテスト
            expect(salmonRunSchedules[0]).toHaveProperty('startTime');
            expect(salmonRunSchedules[0]).toHaveProperty('endTime');
            expect(salmonRunSchedules[0]).toHaveProperty('stage');
            expect(salmonRunSchedules[0]).toHaveProperty('weapons');
        });
    });

    describe('xRanking Structure Test', () => {
        test('Area removeXRankingPlayerDataCredentials', () => {
            // 4つもやると長いのでAreaだけ
            const playerDatas = ArXRankings.data.node.xRankingAr?.edges.map((edge) => {
                return removeXRankingPlayerDataCredentials(edge.node);
            });

            // playerDatasがundefinedではない
            expect(playerDatas).not.toBeUndefined();

            // playerDatasのlengthが25
            expect(playerDatas?.length).toEqual(25);

            // name, nameId, rank, xPower, weaponが存在する
            expect(playerDatas?.[0]).toHaveProperty('name');
            expect(playerDatas?.[0]).toHaveProperty('nameId');
            expect(playerDatas?.[0]).toHaveProperty('rank');
            expect(playerDatas?.[0]).toHaveProperty('xPower');
            expect(playerDatas?.[0]).toHaveProperty('weapon');

            // nameがstr
            expect(typeof playerDatas?.[0].name).toEqual('string');

            // nameIdがstr
            expect(typeof playerDatas?.[0].nameId).toEqual('string');

            // rankがnumber
            expect(typeof playerDatas?.[0].rank).toEqual('number');

            // xPowerがnumber
            expect(typeof playerDatas?.[0].xPower).toEqual('number');

            // weaponがstr
            expect(typeof playerDatas?.[0].weapon).toEqual('string');
        });
    });
}, 200000);
