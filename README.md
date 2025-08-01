# FeedbackLoop 🔄

An AI-powered SaaS application that automatically analyzes user feedback and generates code implementations. Built with Next.js, TypeScript, and powered by Google Gemini and Claude AI.

## ✨ Features

- **📝 Feedback Collection**: Simple forms for users to submit feedback, bug reports, and feature requests
- **🤖 AI Analysis**: Automatic categorization, sentiment analysis, and priority assessment using Google Gemini
- **💻 Code Generation**: Automated code implementation using Claude AI based on analyzed feedback
- **🔄 GitHub Integration**: Automatic branch creation, code commits, and pull request generation
- **📊 Real-time Dashboard**: Live status updates and progress tracking
- **🔐 Authentication**: Secure login with GitHub and Google OAuth
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or later
- PostgreSQL database
- API keys for Google Gemini and Anthropic Claude
- GitHub OAuth app credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/feedbackloop.git
cd feedbackloop
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/feedbackloop"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_GEMINI_API_KEY="your-gemini-api-key"
ANTHROPIC_API_KEY="your-claude-api-key"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

4. **Set up the database**
```bash
npx prisma generate
npx prisma db push
```

5. **Seed demo data (optional)**
```bash
curl -X POST http://localhost:3000/api/seed
```

6. **Start the development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with GitHub/Google OAuth
- **AI Services**: Google Gemini (analysis), Anthropic Claude (code generation)
- **Real-time**: Server-Sent Events (SSE)
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Vercel, Docker

### System Flow

1. **Feedback Submission** → User submits feedback via web form
2. **AI Analysis** → Gemini analyzes sentiment, category, and priority
3. **Code Generation** → Claude generates implementation code
4. **GitHub Integration** → Automatic branch creation and PR generation
5. **Real-time Updates** → Live status updates via SSE

## 📖 Usage

### For End Users

1. **Submit Feedback**: Visit `/feedback?projectId=demo` to submit feedback
2. **Track Progress**: Feedback is automatically analyzed and implemented
3. **View Results**: See generated code and pull requests

### For Project Owners

1. **Dashboard**: Access `/dashboard` to view all feedback and analytics
2. **Manual Triggers**: Manually trigger analysis or implementation
3. **GitHub Integration**: Connect your repositories for automatic code deployment

## 🧪 Testing

### Unit Tests
```bash
npm test                # Run once
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

### Integration Tests
```bash
npm run test:e2e        # Playwright E2E tests
npm run test:e2e:ui     # With UI mode
```

### Test Coverage
- Unit tests for utilities, services, and components
- Integration tests for API endpoints
- End-to-end tests for complete user workflows

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/feedbackloop)

### Docker Deployment

```bash
docker build -t feedbackloop .
docker run -p 3000:3000 feedbackloop
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Ensure all tests pass before submitting PR

## 📝 API Documentation

### Feedback API

- `POST /api/feedback` - Submit new feedback
- `GET /api/feedback` - List feedback (authenticated)
- `GET /api/feedback/[id]` - Get feedback details
- `POST /api/feedback/[id]/analyze` - Trigger AI analysis

### Analysis API

- `POST /api/analysis/batch` - Batch analyze pending feedback
- `GET /api/analysis/stats` - Get analysis statistics

### Implementation API

- `POST /api/implementation` - Trigger code implementation
- `GET /api/implementation?feedbackId=...` - Get implementation status

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | ✅ |
| `NEXTAUTH_URL` | Application base URL | ✅ |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | ✅ |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | ✅ |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | ✅ |
| `REDIS_URL` | Redis connection string | ❌ |

## 📊 Monitoring

### Health Check

Visit `/api/health` to check application status:

```json
{
  "status": "healthy",
  "database": "connected",
  "services": {
    "gemini": true,
    "claude": true,
    "github": true
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Verify `DATABASE_URL` and database accessibility
2. **AI Service Errors**: Check API keys and rate limits
3. **GitHub Integration**: Verify OAuth app configuration

### Debug Mode

Set `DEBUG=true` in environment variables for verbose logging.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://prisma.io/) - Database ORM
- [Google Gemini](https://ai.google.dev/) - AI analysis
- [Anthropic Claude](https://anthropic.com/) - Code generation
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vercel](https://vercel.com/) - Deployment platform

## 📞 Support

- 📧 Email: support@feedbackloop.com
- 💬 Discord: [Join our community](https://discord.gg/feedbackloop)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/feedbackloop/issues)
- 📖 Docs: [Documentation](https://docs.feedbackloop.com)

---

Made with ❤️ by the FeedbackLoop team
