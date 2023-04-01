import StageScheduleQuery_730cd98 from '../../../../node_modules/splatnet3-types/dist/generated/730cd98e84f1030d3e9ac86b6f1aae13.js';

import { AllSchedules, SalmonRunSchedule, Schedule } from '@sev3e3e/splat3api-client';

import dayjs from 'dayjs';

export function removeAllScheduleCredentials(stageSchedule: StageScheduleQuery_730cd98): AllSchedules {
    const bankara = removeBankaraScheduleCredentials(stageSchedule.bankaraSchedules);
    const regular = removeRegularScheduleCredentials(stageSchedule.regularSchedules);
    const salmon = removeSalmonRunScheduleCredentials(stageSchedule.coopGroupingSchedule);
    const x = removeXScheduleCredentials(stageSchedule.xSchedules);
    // const league = removeLeagueScheduleCredentials(stageSchedule.leagueSchedules);

    return {
        bankaraChallengeSchedules: bankara.challenge,
        bankaraOpenSchedules: bankara.open,
        // leagueSchedules: league,
        regularSchedules: regular,
        salmonRunSchedules: salmon,
        xSchedules: x,
    };
}

export function removeBankaraScheduleCredentials(bankaraSchedule: StageScheduleQuery_730cd98['bankaraSchedules']) {
    return _parseBankaraSchedules(bankaraSchedule);
}

export function removeRegularScheduleCredentials(regularSchedule: StageScheduleQuery_730cd98['regularSchedules']) {
    return _parseSchedules(regularSchedule, 'regular');
}

export function removeXScheduleCredentials(xSchedule: StageScheduleQuery_730cd98['xSchedules']) {
    return _parseSchedules(xSchedule, 'x');
}

export function removeLeagueScheduleCredentials(leagueSchedule: StageScheduleQuery_730cd98['leagueSchedules']) {
    return _parseSchedules(leagueSchedule, 'league');
}

export function removeSalmonRunScheduleCredentials(
    salmonRunSchedule: StageScheduleQuery_730cd98['coopGroupingSchedule']
) {
    const nodes = salmonRunSchedule.regularSchedules.nodes;
    const schedules: SalmonRunSchedule[] = nodes.map((node) => {
        const isExistsSetting = 'setting' in node && node.setting != null;

        const startTime = dayjs(node['startTime']).toDate();
        const endTime = dayjs(node['endTime']).toDate();

        if (!isExistsSetting) {
            return {
                startTime: dayjs(startTime).toDate(),
                endTime: dayjs(endTime).toDate(),
                stage: null,
                weapons: null,
            };
        }

        const stage = node.setting!.coopStage.name;
        const weapons = node.setting!.weapons.map((weapon) => weapon.name);

        return {
            startTime: dayjs(startTime).toDate(),
            endTime: dayjs(endTime).toDate(),
            stage: stage,
            weapons: weapons,
        };
    });

    return schedules;
}

function _parseSchedules(anySchedules: any, matchType: 'regular' | 'x' | 'league'): Schedule[] {
    // const _sche =
    //     matchType == 'regular'
    //         ? (anySchedules as StageScheduleQuery_730cd98['regularSchedules'])
    //         : matchType == 'x'
    //         ? (anySchedules as StageScheduleQuery_730cd98['xSchedules'])
    //         : (anySchedules as StageScheduleQuery_730cd98['leagueSchedules']);

    const schedules: Schedule[] = anySchedules.nodes.map((node: any) => {
        const settingsPropertyName =
            matchType == 'regular' ? 'regularMatchSetting' : matchType == 'x' ? 'xMatchSetting' : 'leagueMatchSetting';

        const startTime = dayjs(node['startTime']).toDate();
        const endTime = dayjs(node['endTime']).toDate();

        // fest中はMatchSettingがnull
        const isExistsMatchSetting = settingsPropertyName in node && node[settingsPropertyName] != null;

        // matchSettingが無い時はrule, stageをnullにする
        if (!isExistsMatchSetting) {
            return {
                startTime: startTime,
                endTime: endTime,
                rule: null,
                stages: null,
            };
        }

        // ある場合は普通に読み込む
        const stages: {
            id: number;
            name: string;
        }[] = node[settingsPropertyName].vsStages.map((stage: any) => ({
            id: stage.vsStageId,
            name: stage.name,
        }));

        const rule: string = node[settingsPropertyName].vsRule.name;
        const schedule: Schedule = {
            startTime: startTime,
            endTime: endTime,
            rule: rule,
            stages: stages,
        };
        return schedule;
    });

    return schedules;
}

function _parseBankaraSchedules(bankaraSchedulesJson: StageScheduleQuery_730cd98['bankaraSchedules']): {
    open: Schedule[];
    challenge: Schedule[];
} {
    const nodes = bankaraSchedulesJson.nodes;

    const openSchedules: Schedule[] = [];
    const challengeSchedules: Schedule[] = [];

    for (const node of nodes) {
        const isExistsBankaraMatchSettings = 'bankaraMatchSettings' in node && node.bankaraMatchSettings != null;

        const startTime = dayjs(node['startTime']).toDate();
        const endTime = dayjs(node['endTime']).toDate();

        // バンカラマッチの設定がない時はrule, stageをnullにする
        if (!isExistsBankaraMatchSettings) {
            // フェス中のみ？
            const nullSchedule = {
                startTime: startTime,
                endTime: endTime,
                rule: null,
                stages: null,
            };
            openSchedules.push(nullSchedule);
            challengeSchedules.push(nullSchedule);

            continue;
        }

        for (const matchSetting of node.bankaraMatchSettings) {
            // stages
            const stages = matchSetting.vsStages.map((stage) => ({
                id: stage.vsStageId,
                name: stage.name,
            }));

            // rule
            const rule = matchSetting.vsRule.name;

            if (matchSetting.mode == 'CHALLENGE') {
                challengeSchedules.push({
                    startTime: startTime,
                    endTime: endTime,
                    rule: rule,
                    stages: stages,
                });
            } else if (matchSetting.mode == 'OPEN') {
                openSchedules.push({
                    startTime: startTime,
                    endTime: endTime,
                    rule: rule,
                    stages: stages,
                });
            }
        }
    }

    return {
        challenge: challengeSchedules,
        open: openSchedules,
    };
}
