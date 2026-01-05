import { Sequelize } from 'sequelize';
import { config } from './index';

// Create Sequelize instance
export const sequelize = new Sequelize({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  dialect: config.database.dialect,
  logging: config.dev ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Test database connection
export async function connectDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
    
    if (config.dev) {
      // Sync models in development (create tables if they don't exist)
      await sequelize.sync({ alter: true });
      console.log('✓ Database models synchronized');
    }
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    throw error;
  }
}

export default sequelize;

