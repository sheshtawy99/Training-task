# Training Task - Strapi CMS Project

A comprehensive Strapi 5.30.0 CMS application with custom content types, authorization policies, middleware, and full test coverage. This project demonstrates best practices for building a secure, tested Strapi application with posts and comments functionality.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Custom Features](#custom-features)
- [Testing](#testing)
- [CI/CD](#cicd)

## Features

- **Posts & Comments System**: Create and delete operations for posts and comments with author relationships
- **Role-Based Authorization**: Custom policies enforce that only content owners can delete their content
- **Auto-Author Assignment**: Middleware automatically associates authenticated users with created content
- **Comment Validation**: Enforces post ID requirement for comment creation
- **Comprehensive Test Suite**: Unit tests, integration tests, and policy tests with 13+ test scenarios
- **CI/CD Pipeline**: Automated testing on multiple Node.js versions via GitHub Actions
- **TypeScript Support**: Full TypeScript implementation for type safety

## Tech Stack

- **Framework**: Strapi 5.30.0
- **Language**: TypeScript 5.x
- **Database**: SQLite (better-sqlite3)
- **Testing**: Jest 30.2.0 with ts-jest and supertest
- **Runtime**: Node.js 18.x - 22.x
- **CI/CD**: GitHub Actions

## Project Structure

```
├── src/
│   ├── api/
│   │   ├── post/
│   │   │   ├── controllers/post.ts
│   │   │   ├── services/post.ts
│   │   │   ├── routes/post.ts
│   │   │   ├── policies/delete-post.ts
│   │   │   └── tests/policies/post.test.ts
│   │   └── comment/
│   │       ├── controllers/comment.ts
│   │       ├── services/comment.ts
│   │       ├── routes/comment.ts
│   │       ├── policies/delete-comment.ts
│   │       └── tests/policies/comment.test.ts
│   ├── middlewares/
│   │   ├── attach-author.ts
│   │   ├── validate-comment-post.ts
│   │   └── tests/middlewares.test.ts
│   └── index.ts
├── tests/
│   ├── integration/
│   │   ├── posts.test.ts
│   │   └── comments.test.ts
│   ├── constants/errors.ts
│   ├── permissions.ts
│   ├── strapi.js
│   └── jest.setup.js
└── .github/
    └── workflows/ci.yml
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0 <= 22.x.x
- npm >= 6.0.0

### Installation

```bash
npm install
```

### Development

Start your Strapi application with autoReload enabled:

```bash
npm run develop
```

### Production

Build and start your Strapi application:

```bash
npm run build
npm run start
```

### Testing

Run the test suite:

```bash
npm test
```

## API Documentation

### Content Types

#### Post
- **Fields**:
  - `body` (string, required) - Post content
  - `author` (relation) - User who created the post
  - `comments` (relation) - Associated comments

#### Comment
- **Fields**:
  - `body` (string, required) - Comment text
  - `post` (relation, required) - Associated post
  - `author` (relation) - User who created the comment

#### User
Extended from Users-Permissions plugin with:
- `posts` (relation) - Posts authored by user
- `comments` (relation) - Comments authored by user

### API Endpoints

#### Posts API

```bash
# Create a post (requires authentication)
POST /api/posts
Body: { "data": { "body": "Post content" } }
# Author is automatically attached via middleware

# Get all posts
GET /api/posts

# Get a single post
GET /api/posts/:id

# Update a post
PUT /api/posts/:id

# Delete a post (only post author)
DELETE /api/posts/:id
```

#### Comments API

```bash
# Create a comment (requires authentication and post ID)
POST /api/comments
Body: { "data": { "body": "Comment text", "post": 1 } }
# Author is automatically attached via middleware

# Get all comments
GET /api/comments

# Get a single comment
GET /api/comments/:id

# Update a comment
PUT /api/comments/:id

# Delete a comment (comment author or post author)
DELETE /api/comments/:id
```

## Custom Features

### Custom Policies

#### Delete Post Policy
**Location**: [src/api/post/policies/delete-post.ts](src/api/post/policies/delete-post.ts)

Enforces that only the post author can delete their own post.
- Returns `403 Forbidden` if user is not the post author
- Error message: "You can only delete your own posts"

#### Delete Comment Policy
**Location**: [src/api/comment/policies/delete-comment.ts](src/api/comment/policies/delete-comment.ts)

Allows comment deletion by:
- The comment author
- The post author (for comments on their posts)

Returns `403 Forbidden` if user is neither.

### Custom Middleware

#### Attach Author Middleware
**Location**: [src/middlewares/attach-author.ts](src/middlewares/attach-author.ts)

Automatically assigns the authenticated user as the author when creating posts or comments.
- Applied to: `POST /api/posts` and `POST /api/comments`
- Extracts user from `ctx.state.user`
- Attaches to `request.body.data.author`

#### Validate Comment Post Middleware
**Location**: [src/middlewares/validate-comment-post.ts](src/middlewares/validate-comment-post.ts)

Validates that a post ID is provided when creating a comment.
- Applied to: `POST /api/comments`
- Returns `400 Bad Request` if post ID is missing
- Error message: "You must include the post ID for this comment!"

### Route Configuration

Routes are configured to apply middleware and policies:

**Post Routes** ([src/api/post/routes/post.ts](src/api/post/routes/post.ts)):
- `POST /api/posts` - Uses `global::attach-author` middleware
- `DELETE /api/posts/:id` - Uses `api::post.delete-post` policy

**Comment Routes** ([src/api/comment/routes/comment.ts](src/api/comment/routes/comment.ts)):
- `POST /api/comments` - Uses `global::validate-comment-post` and `global::attach-author` middlewares
- `DELETE /api/comments/:id` - Uses `api::comment.delete-comment` policy

## Testing

### Test Infrastructure

The project includes comprehensive testing with Jest and Supertest:

- **Unit Tests**: Policy and middleware logic tests
- **Integration Tests**: Full API endpoint tests with HTTP requests
- **Test Utilities**: Reusable helpers for permissions, user creation, and Strapi setup

### Test Files

#### Unit Tests
- [src/api/post/tests/policies/post.test.ts](src/api/post/tests/policies/post.test.ts) - Post policy tests
- [src/api/comment/tests/policies/comment.test.ts](src/api/comment/tests/policies/comment.test.ts) - Comment policy tests
- [src/middlewares/tests/middlewares.test.ts](src/middlewares/tests/middlewares.test.ts) - Middleware tests

#### Integration Tests
- [tests/integration/posts.test.ts](tests/integration/posts.test.ts) - Post API integration tests
- [tests/integration/comments.test.ts](tests/integration/comments.test.ts) - Comment API integration tests

#### Test Utilities
- [tests/strapi.js](tests/strapi.js) - Strapi instance setup and cleanup
- [tests/permissions.ts](tests/permissions.ts) - Permission granting and user creation helpers
- [tests/constants/errors.ts](tests/constants/errors.ts) - Centralized error messages and HTTP status codes
- [tests/jest.setup.js](tests/jest.setup.js) - Jest configuration and environment setup

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/integration/posts.test.ts
```

## CI/CD

### GitHub Actions

**Workflow File**: [.github/workflows/ci.yml](.github/workflows/ci.yml)

The CI pipeline runs on:
- Push to `main` branch
- Pull requests to `main` branch

**Test Matrix**: Node.js 18.x and 20.x

**Pipeline Steps**:
1. Checkout code
2. Setup Node.js with npm cache
3. Install dependencies
4. Build project
5. Create test environment configuration
6. Run test suite
7. Upload test artifacts (7-day retention)

### Environment Variables

Required secrets for CI/CD:
- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

🎥 [Watch the Loom video](https://www.loom.com/share/b52be9a9543e44eb9434315dc76d1b67).

📋 [Jira Ticket: Training_Task](https://metactoengineer.atlassian.net/browse/BOND-133).


## Learn More

- [Strapi Documentation](https://docs.strapi.io) - Official Strapi documentation
- [Strapi Tutorials](https://strapi.io/tutorials) - Community tutorials
- [Strapi GitHub](https://github.com/strapi/strapi) - Source code and contributions
