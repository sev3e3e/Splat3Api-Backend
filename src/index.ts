import { RedisClient } from "./redis/RedisClient.js";
import { Auth } from "./splatnet/Auth.js";

const coralApi = await Auth.getCoralApi();

console.log(JSON.stringify(coralApi, null, 2));

RedisClient.disconnect();
