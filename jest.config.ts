import type { Config } from "jest";

const config: Config = {
    // transform: {
    //     "\\.js?$": "babel-jest",
    //     "\\.ts?$": "ts-jest",
    // },
    transform: { "\\.[jt]s?$": "ts-jest" },
    globals: {
        "ts-jest": {
            useESM: true,
            isolatedModules: true,
        },
    },
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.[jt]s$": "$1",
    },
    extensionsToTreatAsEsm: [".ts"],
};

export default config;
