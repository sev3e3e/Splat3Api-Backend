// import { Logger } from "./log/winston.js";
import { RedisClient } from "./redis/RedisClient.js";
import { Auth } from "./splatnet/Auth.js";

import { CreateLogger } from "./log/winston.js";
import { StageScheduleUpdater } from "./splatnet/data/updaters/StageSchedule.js";

import * as fs from "fs";

// const bulletToken = await Auth.getBulletToken();

// console.log(JSON.stringify(coralApi.data, null, 2));

// Logger.debug("test");
// console.log(JSON.stringify(coralApi.data, null, 2));

const logger = CreateLogger("Index");
const updater = new StageScheduleUpdater();

const json = await updater.update();

// logger.debug(json);

fs.writeFileSync("stageSchedule.json", JSON.stringify(json));

RedisClient.disconnect();
