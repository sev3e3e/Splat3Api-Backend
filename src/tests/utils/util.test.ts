import { ReduceCacheExpiration } from "../../utils/util";

describe("Util関数群のテスト", () => {
    test("ReduceCacheExpiration", () => {
        expect(ReduceCacheExpiration(1000)).toEqual(700);
    });
});
