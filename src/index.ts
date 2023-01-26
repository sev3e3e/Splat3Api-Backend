// import { Logger } from "./log/winston.js";
import { RedisClient } from "./redis/RedisClient.js";

import { CreateLogger } from "./log/winston.js";
import { splatnet3ApiClient } from "./splatnet/SplatNet3Client.js";

// import * as fs from "fs";

// 一旦deployしたい
const index = async () => {
    const logger = CreateLogger("Index");
    // const updater = new StageScheduleUpdater();

    // const json = await updater.update();

    logger.debug(await splatnet3ApiClient.getSchedules());

    await RedisClient.disconnect();
};

await index();

export { index };
// const bulletToken = await Auth.getBulletToken();

// console.log(JSON.stringify(coralApi.data, null, 2));

// Logger.debug("test");
// console.log(JSON.stringify(coralApi.data, null, 2));

// fs.writeFileSync("stageSchedule.json", JSON.stringify(json));
