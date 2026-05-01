'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const chalk = require('chalk');

const LOG_DIR = path.join(process.cwd(), 'logs');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'magenta',
};

const consoleFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const colorMap = {
    error: chalk.red.bold,
    warn: chalk.yellow.bold,
    info: chalk.cyan,
    debug: chalk.magenta,
  };
  const colorFn = colorMap[level] || chalk.white;
  const ts = chalk.gray(`[${timestamp}]`);
  const lvl = colorFn(`[${level.toUpperCase()}]`);
  const metaStr = Object.keys(meta).length ? chalk.gray(` ${JSON.stringify(meta)}`) : '';
  return `${ts} ${lvl} ${message}${metaStr}`;
});

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    }),
    // Error log file
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    // Combined log file
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '50m',
      maxFiles: '7d',
      zippedArchive: true,
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

module.exports = logger;
