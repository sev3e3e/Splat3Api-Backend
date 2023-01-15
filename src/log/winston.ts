import * as winston from "winston";
import * as CloudLogging from "@google-cloud/logging-winston";

const prettyJson = winston.format.printf(
    ({ level, message, timestamp, label }) => {
        if (typeof message === "object") {
            message = JSON.stringify(message, null, 4);
        }
        return `[${level}] [${label}] ${timestamp} - ${message}`;
    }
);

const logger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.prettyPrint(),
        winston.format.splat(),
        winston.format.simple(),
        prettyJson
    ),
    transports: [
        new winston.transports.Console(),
        // new CloudLogging.LoggingWinston(),
    ],
});

export const Logger = logger;

export const CreateLogger = (label: string) => {
    return winston.createLogger({
        level: "debug",
        // format: winston.format.combine(
        //     winston.format.colorize(),
        //     winston.format.prettyPrint(),
        //     winston.format.splat(),
        //     winston.format.simple(),
        //     winston.format.label({ label }),

        //     winston.format.timestamp({
        //         format: "YYYY-MM-DD HH:mm:ss",
        //     })
        //     // winston.format.printf(({ level, message, timestamp, label }) => {
        //     //     return `[${timestamp}] [${level}] [${label}]: ${message}`;
        //     // })
        // ),
        format: winston.format.combine(
            winston.format.json(),
            winston.format.prettyPrint(),
            winston.format.splat(),
            winston.format.label({ label }),
            winston.format.timestamp({
                format: "YYYY-MM-DD HH:mm:ss",
            }),
            winston.format.colorize(),
            prettyJson
        ),
        transports: [
            new winston.transports.Console(),
            // new CloudLogging.LoggingWinston(),
        ],
    });
};
