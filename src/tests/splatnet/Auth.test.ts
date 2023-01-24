import redis from "redis-mock";

jest.mock("nxapi/coral", () => {
    class CoralApi {
        static createWithSavedToken(token: string, useragent?: string) {
            return "CoralSession";
        }
    }
    return { CoralApi };
});
jest.mock("../../utils/util.js");
jest.mock("../../log/winston.js");
jest.mock("winston");
jest.mock("redis", () => redis);

import { Authentication } from "../../splatnet/Auth";
import { jest } from "@jest/globals";

jest.useFakeTimers();

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
    originalEnv = JSON.parse(JSON.stringify(process.env));
});

afterEach(() => {
    process.env = JSON.parse(JSON.stringify(originalEnv));
});

afterAll(async () => {
    // await RedisClient.disconnect();
});

describe("Authenticationのテスト", () => {
    test("NintendoTokenがセットされていない時にエラーを出す", () => {
        delete process.env["NINTENDO_TOKEN"];

        expect(() => {
            new Authentication();
        }).toThrow();
    });

    test("Splatoon3のWebService IDがセットされていない時にエラーを出す", () => {
        delete process.env["SPLATOON3_SERVICE_ID"];

        expect(() => {
            new Authentication();
        }).toThrow();
    });

    test("getCoralApi キャッシュが存在しない場合に新たに生成する", async () => {
        jest.mock(
            "../../utils/Cache.js",
            jest.fn(() => {
                return {
                    get: jest.fn(() => {
                        return {
                            nso: "hoge",
                            data: "hoge",
                        };
                    }),
                    set: jest.fn(),
                };
            })
        );

        const auth = new Authentication();
        const session = await auth.getCoralApi();

        expect(session).toBe("CoralSession");
    });
});
