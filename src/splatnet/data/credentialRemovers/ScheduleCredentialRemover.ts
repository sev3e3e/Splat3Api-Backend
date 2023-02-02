import StageScheduleQuery_730cd98 from '../../../../node_modules/splatnet3-types/dist/generated/730cd98e84f1030d3e9ac86b6f1aae13.js';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(timezone);
dayjs.extend(utc);

dayjs.tz.setDefault('Asia/Tokyo');

export interface StageSchedule {
    regularSchedules: Schedule[];
    bankaraChallengeSchedules: Schedule[];
    bankaraOpenSchedules: Schedule[];
    xSchedules: Schedule[];
    leagueSchedules: Schedule[];
    salmonRunSchedules: SalmonRunSchedule[];
}

export interface Schedule {
    startTime: Date;
    endTime: Date;
    stages: Stage[];
    rule: string;
}

export interface SalmonRunSchedule {
    startTime: Date;
    endTime: Date;
    stage: string;
    weapons: string[];
}

interface Stage {
    id: number;
    name: string;
}

export function removeAllCredentials(stageSchedule: StageScheduleQuery_730cd98): StageSchedule {
    const bankara = removeBankaraScheduleCredentials(stageSchedule.bankaraSchedules);
    const regular = removeRegularScheduleCredentials(stageSchedule.regularSchedules);
    const salmon = removeSalmonRunScheduleCredentials(stageSchedule.coopGroupingSchedule);
    const x = removeXScheduleCredentials(stageSchedule.xSchedules);
    const league = removeLeagueScheduleCredentials(stageSchedule.leagueSchedules);

    return {
        bankaraChallengeSchedules: bankara.challenge,
        bankaraOpenSchedules: bankara.open,
        leagueSchedules: league,
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
        const startTime = node['startTime'];
        const endTime = node['endTime'];
        const stage = node.setting.coopStage.name;
        const weapons = node.setting.weapons.map((weapon) => weapon.name);

        return {
            startTime: dayjs(startTime).tz().toDate(),
            endTime: dayjs(endTime).tz().toDate(),
            stage: stage,
            weapons: weapons,
        };
    });

    return schedules;
}

function _parseSchedules(anySchedules: any, matchType: 'regular' | 'bankara' | 'x' | 'league'): Schedule[] {
    const nodes = anySchedules['nodes'];

    const schedules = nodes.map((node: any) => {
        const settingsPropertyName = matchType === 'bankara' ? `${matchType}MatchSettings` : `${matchType}MatchSetting`;

        const startTime = node['startTime'];
        const endTime = node['endTime'];

        const _stages = node[settingsPropertyName]['vsStages'];

        const stage1: Stage = {
            id: _stages[0]['vsStageId'],
            name: _stages[0]['name'],
        };

        const stage2: Stage = {
            id: _stages[1]['vsStageId'],
            name: _stages[1]['name'],
        };

        const rule = node[settingsPropertyName]['vsRule']['name'];
        const schedule: Schedule = {
            startTime: startTime,
            endTime: endTime,
            rule: rule,
            stages: [stage1, stage2],
        };
        return schedule;
    });

    return schedules;
}

function _parseBankaraSchedules(bankaraSchedulesJson: StageScheduleQuery_730cd98['bankaraSchedules']): {
    open: Schedule[];
    challenge: Schedule[];
} {
    const nodes = bankaraSchedulesJson['nodes'];

    const openSchedules: Schedule[] = [];
    const challengeSchedules: Schedule[] = [];

    for (const node of nodes) {
        const startTime = node['startTime'];
        const endTime = node['endTime'];

        const currentMatchSettings = node['bankaraMatchSettings'];

        const currentChallengeStages = currentMatchSettings[0]['vsStages'];
        const currentOpenStages = currentMatchSettings[1]['vsStages'];

        const challengeStage1 = {
            id: currentChallengeStages[0]['vsStageId'],
            name: currentChallengeStages[0]['name'],
        };

        const challengeStage2 = {
            id: currentChallengeStages[1]['vsStageId'],
            name: currentChallengeStages[1]['name'],
        };

        const openStage1 = {
            id: currentOpenStages[0]['vsStageId'],
            name: currentOpenStages[0]['name'],
        };
        const openStage2 = {
            id: currentOpenStages[1]['vsStageId'],
            name: currentOpenStages[1]['name'],
        };

        const challengeRule = currentMatchSettings[0]['vsRule']['name'];
        const openRule = currentMatchSettings[1]['vsRule']['name'];
        challengeSchedules.push({
            startTime: dayjs(startTime).tz().toDate(),
            endTime: dayjs(endTime).tz().toDate(),
            rule: challengeRule,
            stages: [challengeStage1, challengeStage2],
        });
        openSchedules.push({
            startTime: dayjs(startTime).tz().toDate(),
            endTime: dayjs(endTime).tz().toDate(),
            rule: openRule,
            stages: [openStage1, openStage2],
        });
    }

    return {
        challenge: challengeSchedules,
        open: openSchedules,
    };
}
