// import { Logger } from "./log/winston.js";
import { RedisClient } from "./redis/RedisClient.js";
import { Auth } from "./splatnet/Auth.js";

import { CreateLogger } from "./log/winston.js";

const bulletToken = await Auth.getBulletToken();

// console.log(JSON.stringify(coralApi.data, null, 2));

// Logger.debug("test");
// console.log(JSON.stringify(coralApi.data, null, 2));
const logger = CreateLogger("Index");
logger.debug(bulletToken);
RedisClient.disconnect();
