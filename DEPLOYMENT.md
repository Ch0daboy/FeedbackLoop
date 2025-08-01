# FeedbackLoop Deployment Guide

This guide covers different deployment options for the FeedbackLoop application.

## Prerequisites

- Node.js 18 or later
- PostgreSQL database
- Required API keys:
  - Google Gemini API key
  - Anthropic Claude API key
  - GitHub OAuth app credentials

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/feedbackloop"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
GOOGLE_GEMINI_API_KEY="your-gemini-api-key"
ANTHROPIC_API_KEY="your-claude-api-key"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"
```

## Local Development

### Using npm

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

3. Seed the database (optional):
```bash
npm run seed
```

4. Start the development server:
```bash
npm run dev
```

### Using Docker Compose

1. Copy environment variables:
```bash
cp .env.example .env.local
```

2. Start all services:
```bash
docker-compose up -d
```

3. Run database migrations:
```bash
docker-compose exec app npx prisma db push
```

## Production Deployment

### Vercel (Recommended)

1. Fork this repository
2. Connect your GitHub repository to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t feedbackloop .
```

2. Run the container:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e GOOGLE_GEMINI_API_KEY="your-key" \
  -e ANTHROPIC_API_KEY="your-key" \
  -e GITHUB_CLIENT_ID="your-id" \
  -e GITHUB_CLIENT_SECRET="your-secret" \
  feedbackloop
```

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Database Setup

### PostgreSQL

1. Create a new database:
```sql
CREATE DATABASE feedbackloop;
```

2. Run Prisma migrations:
```bash
npx prisma db push
```

3. (Optional) Seed with demo data:
```bash
curl -X POST http://localhost:3000/api/seed
```

## CI/CD Pipeline

The repository includes GitHub Actions workflows for:

- **CI Pipeline** (`.github/workflows/ci.yml`):
  - Runs tests
  - Performs security audits
  - Builds Docker images
  - Runs E2E tests

- **Deployment Pipeline** (`.github/workflows/deploy.yml`):
  - Deploys to staging environment
  - Runs smoke tests
  - Deploys to production (manual approval required)

### Required GitHub Secrets

Set these secrets in your GitHub repository:

```
# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Database URLs
STAGING_DATABASE_URL
PRODUCTION_DATABASE_URL

# NextAuth
STAGING_NEXTAUTH_SECRET
STAGING_NEXTAUTH_URL
PRODUCTION_NEXTAUTH_SECRET
PRODUCTION_NEXTAUTH_URL

# AI Services
GOOGLE_GEMINI_API_KEY
ANTHROPIC_API_KEY

# GitHub OAuth
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET

# Docker (optional)
DOCKER_USERNAME
DOCKER_PASSWORD

# Notifications (optional)
SLACK_WEBHOOK_URL
```

## Monitoring and Health Checks

### Health Check Endpoint

The application provides a health check endpoint at `/api/health`:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "message": "All systems operational",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "database": "connected",
  "services": {
    "gemini": true,
    "claude": true,
    "github": true
  },
  "uptime": 3600
}
```

### Monitoring Setup

Consider setting up monitoring with:

- **Application Performance**: Vercel Analytics, New Relic, or DataDog
- **Error Tracking**: Sentry
- **Uptime Monitoring**: Pingdom, UptimeRobot
- **Database Monitoring**: PostgreSQL built-in monitoring

## Security Considerations

1. **Environment Variables**: Never commit secrets to version control
2. **Database**: Use connection pooling and read replicas for production
3. **API Keys**: Rotate keys regularly and use least-privilege access
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **CORS**: Configure CORS appropriately for your domain

## Scaling

### Horizontal Scaling

- Deploy multiple instances behind a load balancer
- Use Redis for session storage
- Implement database read replicas

### Performance Optimization

- Enable Next.js caching
- Use CDN for static assets
- Implement database indexing
- Add Redis caching for API responses

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check DATABASE_URL format
   - Verify database is running and accessible
   - Check firewall settings

2. **AI Service Errors**:
   - Verify API keys are correct
   - Check rate limits and quotas
   - Monitor service status pages

3. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check TypeScript compilation errors

### Logs

- Application logs: Check Vercel function logs or container logs
- Database logs: Check PostgreSQL logs
- CI/CD logs: Check GitHub Actions workflow logs

## Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application logs
3. Check the health endpoint
4. Create an issue in the GitHub repository
