# Service

Backend API service for the mobile application. This service handles authentication, user management, and connects to an Azure PostgreSQL database.

## Related Repositories
- [Client Repository](https://github.com/calvin-cs262-fall2025-teamH/Client)
- [Project Repository](https://github.com/calvin-cs262-fall2025-teamH/Project)

## Tech Stack
- Node.js with TypeScript
- Express.js
- PostgreSQL (Azure Database)
- JWT Authentication
- bcrypt for password hashing

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the Service folder (copy from `.env.example`):

```env
PORT=4000
DATABASE_URL=postgres://username:password@server.postgres.database.azure.com:5432/dbname?sslmode=require
JWT_SECRET=your_secret_here
CORS_ORIGIN=*
```

**Ask your team lead for the actual database credentials** (they should not be committed to GitHub).

### 3. Azure Database Firewall Access

**Everyone shares the same Azure database, but runs their own local server.**

You need to add your IP address to the Azure PostgreSQL firewall:
1. Contact the team lead to add your IP address to the Azure firewall rules
2. Or ask for Azure portal access to add it yourself: Azure Portal → PostgreSQL Server → Networking → "Add current client IP address"
3. Find your IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

**Note:** Your IP may change when you connect to different WiFi networks, so you may need to update the firewall rule.

### 4. Database Schema

The database is already set up on Azure with the following tables:
- `users` - for authentication
- `game`, `player`, `playergame` - for the monopoly game data

If you need to recreate the users table, run:
```bash
node setup-azure-db.js
```

### 5. Start the Service

```bash
npm run dev
```

The service will run on `http://localhost:4000` (or the PORT specified in .env).

You should see:
```
[db] connected
Server running on port 4000, listening on all interfaces
```

## Testing the API

Test the health endpoint:
```powershell
Invoke-RestMethod -Uri http://localhost:4000/api/health
```

Test registration:
```powershell
$body = @{ email="test@example.com"; password="password123" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $body
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user (requires JWT token)

### User
- `GET /api/user/profile` - Get user profile (requires JWT token)

### Health Check
- `GET /api/health` - Check if service is running
- `GET /` - Root endpoint

## Common Issues

### Connection Timeout
If you get `ETIMEDOUT` errors, your IP address needs to be added to the Azure firewall rules.

### Authentication Failed
Make sure you're using the correct database credentials in your `.env` file.

### Port Already in Use
If port 4000 is already in use, change the `PORT` in your `.env` file.

