import { ValueCache } from "../../../utils/Cache.js";
import { Auth } from "../../Auth.js";
import { DataUpdater } from "../Updater.js";

export interface StageSchedule {
    regularSchedules: Schedule[];
    bankaraChallengeSchedules: Schedule[];
    bankaraOpenSchedules: Schedule[];
    xSchedules: Schedule[];
    leagueSchedules: Schedule[];
    // coopGroupingSchedule: CoopGroupingSchedule;
}

interface Schedule {
    startTime: Date;
    endTime: Date;
    stages: Stage[];
    rule: string;
}

interface Stage {
    id: number;
    name: string;
}

export class StageScheduleUpdater extends DataUpdater {
    query: string;

    constructor() {
        super();
        this.query = "730cd98e84f1030d3e9ac86b6f1aae13";
    }

    async update(): Promise<StageSchedule> {
        const data = Auth.

        const regularSchedules = this._parseSchedules(
            data["data"]["regularSchedules"],
            "regular"
        );
        const bankaraSchedules = this._parseBankaraSchedules(
            data["data"]["bankaraSchedules"]
        );
        const xSchedules = this._parseSchedules(
            data["data"]["xSchedules"],
            "x"
        );
        const leagueSchedules = this._parseSchedules(
            data["data"]["leagueSchedules"],
            "league"
        );

        return {
            regularSchedules: regularSchedules,
            bankaraChallengeSchedules: bankaraSchedules["challenge"],
            bankaraOpenSchedules: bankaraSchedules["open"],
            xSchedules: xSchedules,
            leagueSchedules: leagueSchedules,
        };
    }

    private _parseSchedules(
        anySchedules: any,
        matchType: "regular" | "bankara" | "x" | "league"
    ): Schedule[] {
        const nodes = anySchedules["nodes"];

        const schedules = nodes.map((node: any) => {
            const settingsPropertyName =
                matchType === "bankara"
                    ? `${matchType}MatchSettings`
                    : `${matchType}MatchSetting`;

            const startTime = node["startTime"];
            const endTime = node["endTime"];

            const _stages = node[settingsPropertyName]["vsStages"];

            const stage1: Stage = {
                id: _stages[0]["vsStageId"],
                name: _stages[0]["name"],
            };

            const stage2: Stage = {
                id: _stages[1]["vsStageId"],
                name: _stages[1]["name"],
            };

            const rule = node[settingsPropertyName]["vsRule"]["name"];
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

    private _parseBankaraSchedules(bankaraSchedulesJson: any) {
        const nodes = bankaraSchedulesJson["nodes"];

        const openSchedules: any[] = [];
        const challengeSchedules: any[] = [];

        for (const node of nodes) {
            const startTime = node["startTime"];
            const endTime = node["endTime"];

            const currentMatchSettings = node["bankaraMatchSettings"];

            const currentChallengeStages = currentMatchSettings[0]["vsStages"];
            const currentOpenStages = currentMatchSettings[1]["vsStages"];

            const challengeStage1 = {
                id: currentChallengeStages[0]["vsStageId"],
                name: currentChallengeStages[0]["name"],
            };

            const challengeStage2 = {
                id: currentChallengeStages[1]["vsStageId"],
                name: currentChallengeStages[1]["name"],
            };

            const openStage1 = {
                id: currentOpenStages[0]["vsStageId"],
                name: currentOpenStages[0]["name"],
            };
            const openStage2 = {
                id: currentOpenStages[1]["vsStageId"],
                name: currentOpenStages[1]["name"],
            };

            const challengeRule = currentMatchSettings[0]["vsRule"]["name"];
            const openRule = currentMatchSettings[1]["vsRule"]["name"];
            challengeSchedules.push({
                startTime: startTime,
                endTime: endTime,
                rule: challengeRule,
                stages: [challengeStage1, challengeStage2],
            });
            openSchedules.push({
                startTime: startTime,
                endTime: endTime,
                rule: openRule,
                stages: [openStage1, openStage2],
            });
        }

        return {
            challenge: challengeSchedules,
            open: openSchedules,
        };
    }
}
