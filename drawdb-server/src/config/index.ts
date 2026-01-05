import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  dev: process.env.NODE_ENV === 'dev',
  api: {
    github: process.env.GITHUB_TOKEN,
  },
  server: {
    port: process.env.PORT || 9080,
    allowedOrigins: process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(',') : [],
  },
  mail: {
    service: process.env.MAIL_SERVICE || 'gmail',
    username: process.env.MAIL_USERNAME || '',
    password: process.env.MAIL_PASSWORD || '',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'drawdb',
    user: process.env.DB_USER || 'drawdb_user',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres' as const,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },
};
