# Environment Variables Documentation

## Authentication Configuration

### JWT Settings

- `JWT_SECRET`: Secret key for signing access tokens (minimum 32 characters)
- `JWT_REFRESH_SECRET`: Secret key for signing refresh tokens (minimum 32 characters)
- `JWT_EXPIRES_IN`: Access token expiration time (default: 15m)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration time (default: 7d)

### Example .env file

```
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-at-least-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production-at-least-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Authentication Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### POST /api/auth/login

Authenticate user and receive tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### GET /api/auth/me

Get current user profile (requires authentication).

**Headers:**

```
Authorization: Bearer <access_token>
```

### PUT /api/auth/change-password

Change user password (requires authentication).

**Request Body:**

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

### DELETE /api/auth/logout

Logout user (requires authentication).

## Password Requirements

Passwords must meet the following criteria:

- At least 8 characters long
- Contains at least one lowercase letter
- Contains at least one uppercase letter
- Contains at least one number
- Contains at least one special character (@$!%\*?&)

## Security Features

- JWT tokens with configurable expiration
- Secure password hashing using bcrypt (12 rounds)
- Refresh token rotation
- User existence validation on each request
- Role-based access control
- Password strength validation
