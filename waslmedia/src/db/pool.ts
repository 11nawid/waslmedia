import mysql from 'mysql2/promise';
import { databaseConfig } from './config';

declare global {
  var __waslmediaPool: mysql.Pool | undefined;
}

export const dbPool =
  global.__waslmediaPool ||
  mysql.createPool({
    ...databaseConfig,
    connectionLimit: 10,
    namedPlaceholders: true,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__waslmediaPool = dbPool;
}
