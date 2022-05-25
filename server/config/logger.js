// === 서버로그 양식 정보 ===

const { createLogger, transports, format } = require("winston"); // transports포함시키기?
const { combine, timestamp, label, simple, colorize, printf } = format;
const winstonDaily = require("winston-daily-rotate-file");

const printFormat = printf(({ timestamp, label, level, message }) => {
  return `${timestamp} [${label}] ${level} : ${message}`;
});

const printLogFormat = {
  file: combine(
    label({ label: "nets" }),
    timestamp({ format: "YYYY-MM-DD HH:mm:dd" }),
    printFormat
  ),
  console: combine(colorize(), simple()),
};

const opts = {
  console: new transports.Console({
    level: "info",
    format: printLogFormat.console,
  }),
  info: new transports.DailyRotateFile({
    level: "info",
    datePattern: "YYYY-MM-DD",
    dirname: "./nets_log",
    filename: `%DATE%.log`, // file 이름 날짜로 저장
    maxFiles: 30, //30일치 로그파일 저장
    zippedArchive: true,
    format: printLogFormat.file,
  }),
  warn: new transports.DailyRotateFile({
    level: "warn",
    datePattern: "YYYY-MM-DD",
    dirname: "./nets_log" + "/warn", // nets_log/warn 하위에 저장
    filename: `%DATE%.warn.log`,
    maxFiles: 30,
    zippedArchive: true,
    format: printLogFormat.file,
  }),
  error: new transports.DailyRotateFile({
    level: "error",
    datePattern: "YYYY-MM-DD",
    dirname: "./nets_log" + "/error", // nets_log/error 하위에 저장
    filename: `%DATE%.error.log`,
    maxFiles: 30,
    zippedArchive: true,
    format: printLogFormat.file,
  }),
};

const logger = createLogger({
  transports: [opts.info, opts.warn, opts.error],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(opts.console);
}

logger.stream = { write: (message) => logger.info(message) };

module.exports = logger;
