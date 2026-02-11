# Code Merge Tool

A comprehensive full-stack application for automating and managing code merges between GitHub and GitLab repositories with advanced pipeline automation, file synchronization, and repository management capabilities.

## 🚀 Features

### Repository Management

- **GitHub Integration**: Clone, browse, and manage GitHub repositories
- **GitLab Integration**: Full GitLab repository support with branch creation and merge requests
- **File Tree Visualization**: Interactive file explorer with selective file copying
- **Repository Sync**: Automated synchronization between GitHub and GitLab

### Pipeline Automation

- **Automated Pipelines**: Configure and run automated GitHub → GitLab sync pipelines
- **Smart File Copying**: Selective file copying with pattern matching and exclusions
- **Branch Management**: Automatic branch creation and conflict resolution
- **Merge Request Creation**: Automated merge request creation with customizable templates
- **Pipeline Statistics**: Real-time tracking and historical data for all pipeline runs

### Developer Tools

- **File Copy Tool**: Advanced file copying with pattern-based selection/exclusion
- **Diff Viewer**: Side-by-side diff comparison with syntax highlighting
- **Conflict Detection**: Automated conflict detection and resolution assistance
- **Progress Tracking**: Real-time progress updates for long-running operations

### Security & Authentication

- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **OAuth2 Support**: GitHub and GitLab OAuth2 integration
- **Role-Based Access**: User authentication and authorization
- **SSL Support**: Configurable SSL verification for enterprise environments

## 🏗️ Technology Stack

### Frontend

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Headless UI, Lucide Icons
- **State Management**: React Query, React Hook Form
- **Code Editor**: Monaco Editor
- **Animations**: Framer Motion

### Backend

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB 6.0
- **Authentication**: JWT, Passport.js
- **API Integration**: Axios
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

### DevOps

- **Containerization**: Docker & Docker Compose
- **Process Management**: Multi-stage builds
- **Logging**: Winston
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier

## 📁 Project Structure

```
CodeMergeTool/
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── services/          # Business logic
│   │   │   ├── github-service.ts
│   │   │   ├── gitlab-service.ts
│   │   │   ├── pipeline-service.ts
│   │   │   └── auth-service.ts
│   │   ├── routes/           # API routes
│   │   │   ├── auth-routes.ts
│   │   │   ├── github-routes.ts
│   │   │   ├── gitlab-routes.ts
│   │   │   ├── pipeline-routes.ts
│   │   │   └── file-routes.ts
│   │   ├── models/           # MongoDB models
│   │   ├── middleware/       # Express middleware
│   │   ├── config/           # Configuration
│   │   └── utils/            # Utilities
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── frontend/                  # Next.js React frontend
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   │   ├── dashboard/    # Main dashboard
│   │   │   ├── github/       # GitHub features
│   │   │   ├── gitlab/       # GitLab features
│   │   │   ├── settings/     # User settings
│   │   │   └── auth/         # Authentication pages
│   │   ├── components/       # React components
│   │   │   ├── FileCopyTool.tsx
│   │   │   ├── PipelineAutomationCard.tsx
│   │   │   ├── GitHubRepositoryDownloader.tsx
│   │   │   └── ui/           # UI components
│   │   ├── services/         # API clients
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities
│   │   └── types/            # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docs/                      # Documentation
│   ├── DEVELOPMENT_PROGRESS.md
│   └── FILE_COPY_FEATURES.md
├── docker-compose.yml         # Main orchestration
├── ARCHITECTURE.md            # System architecture
├── AUTHENTICATION.md          # Auth documentation
└── README.md                  # This file
```

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**

```bash
git clone <repository-url>
cd CodeMergeTool
```

2. **Set up environment variables**

```bash
# Copy example env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit the .env files with your configuration
```

3. **Build and run with Docker**

```bash
# Build and start all services
docker-compose build --no-cache
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

4. **Access the application**

- Frontend: http://localhost:1011
- Backend API: http://localhost:1021/api
- API Health: http://localhost:1021/health
- MongoDB: mongodb://localhost:27017

### Manual Development Setup

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your settings

# Run development server
npm run dev

# Or build and run production
npm run build
npm start
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your settings

# Run development server
npm run dev

# Or build and run production
npm run build
npm start
```

## ⚙️ Configuration

### Backend Environment Variables

```bash
# Server
NODE_ENV=production
PORT=1020

# Database
MONGODB_URI=mongodb://mongodb:27017/code-merge-tool

# JWT Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# OAuth (Optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITLAB_CLIENT_ID=your-gitlab-client-id
GITLAB_CLIENT_SECRET=your-gitlab-client-secret

# Git Configuration
GIT_USER_EMAIL=your-email@example.com
GIT_USER_NAME=Your Name

# CORS
CORS_ORIGIN=http://localhost:1011
```

### Frontend Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:1021/api
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### GitHub Integration

- `POST /api/github/clone` - Clone GitHub repository
- `GET /api/github/clone-progress/:operationId` - Get clone progress
- `POST /api/github/validate` - Validate repository access

### GitLab Integration

- `POST /api/gitlab/test-connection` - Test GitLab connection
- `POST /api/gitlab/branches` - List GitLab branches
- `POST /api/gitlab/create-branch` - Create new branch
- `POST /api/gitlab/sync` - Sync to GitLab
- `POST /api/gitlab/merge-requests` - List merge requests

### Pipeline Automation

- `POST /api/pipeline/automate` - Run automated pipeline
- `GET /api/pipeline-stats/stats` - Get user pipeline statistics
- `GET /api/pipeline-stats/runs` - Get pipeline run history
- `GET /api/pipeline-stats/runs/:id` - Get specific run details

### File Management

- `POST /api/files/copy` - Copy files between repositories
- `GET /api/files/tree` - Get repository file tree
- `POST /api/files/search` - Search files

### Settings

- `POST /api/settings/pipeline` - Save pipeline settings
- `GET /api/settings/pipeline` - Load pipeline settings

### Health

- `GET /health` - Health check endpoint

## 🐳 Docker Deployment

### Container Information

**Backend Container**: `codemergetool-backend-1`

- Port: 1021 (host) → 1020 (container)
- Image: codemergetool-backend
- Network: code-merge-network

**Frontend Container**: `codemergetool-frontend-1`

- Port: 1011 (host) → 1010 (container)
- Image: codemergetool-frontend
- Network: code-merge-network

**MongoDB Container**: `codemergetool-mongodb-1`

- Port: 27017
- Image: mongo:6.0
- Volume: mongodb_data

### Docker Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart services
docker-compose restart [service-name]

# Stop all services
docker-compose down

# Remove everything including volumes
docker-compose down -v

# Rebuild specific service
docker-compose build --no-cache [service-name]

# Execute commands in container
docker exec -it codemergetool-backend-1 sh
```

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend
npm test
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

## 📊 Development Phases

1. **Foundation and Architecture** ✅
   - Project structure and setup
   - Database schema design
   - API architecture

2. **Core Backend and Frontend Implementation** ✅
   - GitHub/GitLab integration services
   - Authentication system
   - Basic UI components

3. **Feature Development and Integration** ✅
   - Pipeline automation
   - File copy tool
   - Repository management
   - Real-time progress tracking

4. **Security and Containerization** ✅
   - JWT authentication
   - Docker deployment
   - SSL configuration
   - Rate limiting

5. **Testing, Quality, and Operations** 🚧
   - Unit testing
   - Integration testing
   - Performance optimization
   - Monitoring and logging

6. **Documentation and Finalization** 🚧
   - API documentation
   - User guides
   - Deployment guides

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Secure password hashing with bcrypt
- CORS protection
- Rate limiting on API endpoints
- Helmet.js security headers
- Input validation and sanitization
- Configurable SSL verification
- OAuth2 integration for GitHub/GitLab

## 🤝 Contributing

1. Follow the coding standards in `.vscode/copilot-instructions.md`
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commits
5. Ensure code passes linting and type checks

## 📝 License

Apache License 2.0

## 🆘 Support

For issues and questions:

- Check the documentation in `/docs`
- Review the architecture in `ARCHITECTURE.md`
- Check authentication docs in `AUTHENTICATION.md`

## 🎯 Roadmap

- [ ] Enhanced conflict resolution UI
- [ ] Webhook support for auto-sync
- [ ] Multi-branch pipeline support
- [ ] Advanced analytics dashboard
- [ ] CI/CD integration templates
- [ ] Slack/Teams notifications
- [ ] Repository templates
- [ ] Backup and restore functionality
