import app from './app';
import { config } from './config';
import { connectDatabase } from './config/database';

async function startServer() {
  try {
    // Connect to database
    console.log('🔄 Connecting to database...');
    await connectDatabase();

    // Start server
    const server = app.listen(config.server.port, () => {
      console.log(`✓ Server is running on http://localhost:${config.server.port}`);
      console.log(`✓ Environment: ${config.dev ? 'development' : 'production'}`);
      console.log(`✓ Health check: http://localhost:${config.server.port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
