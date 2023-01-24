// import { Logger } from "./log/winston.js";
import { RedisClient } from "./redis/RedisClient.js";

import { CreateLogger } from "./log/winston.js";
import { StageScheduleUpdater } from "./splatnet/data/updaters/StageSchedule.js";
import { Authentication } from "./splatnet/Auth.js";

// import * as fs from "fs";

// 一旦deployしたい
const index = async () => {
    const logger = CreateLogger("Index");
    // const updater = new StageScheduleUpdater();

    // const json = await updater.update();

    const auth = new Authentication();

    const api = await auth.initialize();

    const json = await api.getSchedules();

    await RedisClient.disconnect();

    logger.debug(json.data.bankaraSchedules);
};

await index();

export { index };
// const bulletToken = await Auth.getBulletToken();

// console.log(JSON.stringify(coralApi.data, null, 2));

// Logger.debug("test");
// console.log(JSON.stringify(coralApi.data, null, 2));

// fs.writeFileSync("stageSchedule.json", JSON.stringify(json));
