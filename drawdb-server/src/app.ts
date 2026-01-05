import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { emailRouter } from './routes/email-route';
import { gistRouter } from './routes/gist-route';
import { authRouter } from './routes/auth-route';
import { diagramRouter } from './routes/diagram-route';
import { config } from './config';

const app = express();

// Security middleware
app.use(helmet());

// Request logging
app.use(morgan(config.dev ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(
  cors({
    origin: config.dev
      ? '*'
      : (origin, callback) => {
          if (!origin || config.server.allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DrawDB API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      diagrams: '/api/v1/diagrams',
      email: '/email',
      gists: '/gists',
    },
  });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/diagrams', diagramRouter);

// Legacy routes (keep for backward compatibility)
app.use('/email', emailRouter);
app.use('/gists', gistRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.dev ? err.message : 'An unexpected error occurred',
  });
});

export default app;
