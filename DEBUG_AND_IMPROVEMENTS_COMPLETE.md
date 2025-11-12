# CoupleBond Backend - Complete Debugging & Improvements Report

## Executive Summary

This document details all the issues found, fixed, and improvements made to the CoupleBond backend service. The backend is now production-ready with proper error handling, transactions, validation, and consistent API responses.

---

## 🔴 Critical Issues Fixed

### 1. **Migration Schema Conflicts**

**Problem:**
- Two migration files (`001_initial_schema.sql` and `002_couplebond_tables.sql`) had overlapping and conflicting definitions
- Table name inconsistency: `photos` vs `photo_collages`
- Missing columns referenced in queries (`location` in activities, `is_answered`/`answered_at` in prayers)
- `couple_id` in users table marked as UNIQUE (preventing proper usage)
- Duplicate column additions causing migration errors

**Solution:**
- Created single consolidated migration: `001_couplebond_schema.sql`
- Standardized on `photo_collages` table name
- Added all missing columns
- Removed UNIQUE constraint from `users.couple_id` (kept on `couples.user1_id` and `user2_id`)
- Added proper indexes for performance
- Ensured all foreign keys have correct ON DELETE actions

### 2. **JWT Authentication Inconsistencies**

**Problem:**
- Duplicate `JWT_SECRET` definitions in `auth.ts` and `middleware/auth.ts`
- Token generation done manually in `auth.ts` instead of using centralized function
- `/api/auth/me` manually parsing tokens instead of using middleware

**Solution:**
- Single source of truth for JWT_SECRET in `middleware/auth.ts`
- All routes now use `generateToken()` from middleware
- `/api/auth/me` now uses `authenticateToken` middleware
- Consistent token verification across all endpoints

### 3. **Inconsistent Response Formats**

**Problem:**
- Mixed response formats: `{ error: '...' }`, `{ success: false, message: '...' }`, raw `{ user: ... }`
- Inconsistent HTTP status codes
- No standard for success vs error responses

**Solution:**
- **Success responses:** `{ success: true, data: {...}, message?: string }`
- **Error responses:** `{ success: false, message: string }`
- Proper HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Bad request / validation error
  - 401: Authentication required
  - 403: Forbidden
  - 404: Not found
  - 409: Conflict (duplicate/already exists)
  - 500: Server error

### 4. **Missing Transaction Support**

**Problem:**
- Multi-step operations (couple creation, partner connect/disconnect) not atomic
- Race conditions possible when two users connect simultaneously
- Data inconsistency if one step fails mid-operation

**Solution:**
- Added `withTransaction()` helper function in `db.ts`
- All multi-step operations now use transactions:
  - Partner connect (validate code, create couple, update users, mark code used)
  - Partner disconnect (update users, delete couple)
  - Couple join (validate invite, update couple, update user)
  - Couple leave (update user, reorganize or delete couple)

### 5. **SQL Query / Schema Mismatches**

**Problem:**
- Queries referencing non-existent columns
- Table names not matching between migrations and queries
- Missing permission checks allowing cross-couple data access

**Solution:**
- All queries updated to match consolidated schema
- Added couple permission checks on ALL operations:
  - Activities: Verify activity belongs to user's couple
  - Photos: Verify activity belongs to user's couple
  - Prayers: Verify prayer belongs to user's couple
  - Calendar: Verify event's activity belongs to user's couple

---

## ✅ File-by-File Changes

### **src/db.ts**

**Issues Found:**
- No transaction support
- No graceful shutdown
- Basic error handling

**Improvements:**
```typescript
✅ Added withTransaction<T>() helper for atomic multi-step operations
✅ Added closeDb() for graceful shutdown
✅ Added connection pooling configuration (max: 10, timeouts)
✅ Improved error logging in pingDb()
```

### **src/middleware/auth.ts**

**Issues Found:**
- Already well-implemented
- Minor: Could add more detailed logging

**Improvements:**
```typescript
✅ No changes needed - already centralized JWT logic
✅ Clear interface (AuthRequest) for type safety
```

### **src/routes/auth.ts**

**Issues Found:**
- Duplicate JWT_SECRET
- Manual token generation
- Inconsistent response format
- `/me` endpoint manually parsing tokens
- No email normalization (lowercase/trim)

**Improvements:**
```typescript
✅ Removed duplicate JWT_SECRET, now imports from middleware
✅ Uses generateToken() from middleware
✅ Standardized all responses to { success, data, message }
✅ /me endpoint now uses authenticateToken middleware
✅ Email normalization: lowercase + trim on register/login
✅ Better validation with clear error messages
✅ Added 201 status for registration
✅ Password minimum length check (6 characters)
```

### **src/routes/user.ts**

**Issues Found:**
- No transactions for partner operations
- Race condition in partner connect
- No validation for empty names
- Missing check if code owner already paired
- Unclear error messages

**Improvements:**
```typescript
✅ All partner operations now use transactions
✅ Race condition prevention: check both users before pairing
✅ Validation: name cannot be empty string
✅ Specific error codes (USER_NOT_FOUND, ALREADY_HAS_PARTNER, etc.)
✅ Helper function getUserCoupleId() for cleaner code
✅ Better SQL: single query to update both users
✅ Cascade delete properly handled in unmatch
✅ Partner connect validates:
   - User not already paired
   - Code not expired/used
   - Cannot pair with self
   - Code owner not already paired (race condition check)
```

### **src/routes/couple.ts**

**Issues Found:**
- Conceptual overlap with user.ts partner endpoints
- No transactions
- Missing validation
- Unclear distinction between invite_code and pairing_code flows

**Improvements:**
```typescript
✅ All operations now use transactions
✅ Added specific error handling (ALREADY_HAS_COUPLE, INVALID_INVITE_CODE, etc.)
✅ Validation: cannot join own couple, couple not full
✅ Leave logic: promotes user2 to user1 if user1 leaves
✅ Standardized responses
✅ Clear comments distinguishing from user.ts flow:
   - couple.ts: invite_code stored in couples table (simpler, one-step)
   - user.ts: pairing_codes table with expiry (more secure, two-step)
```

**Note:** Both couple.ts and user.ts provide partner pairing but via different mechanisms. This is intentional to support different UX flows.

### **src/routes/activities.ts**

**Issues Found:**
- Table name inconsistency (photos vs photo_collages)
- Missing permission checks
- No validation for IDs
- Missing update endpoint
- Missing delete photo endpoint
- Timeline query potentially inefficient

**Improvements:**
```typescript
✅ All queries use photo_collages table
✅ Helper function getUserCoupleId() for DRY code
✅ Permission check on EVERY operation
✅ Added PUT /api/activities/:id for updates
✅ Added DELETE /api/activities/:activityId/photos/:photoId
✅ Validation: IDs, dates, required fields
✅ Better error messages
✅ Timeline query optimized with LATERAL join (limit 3 photos per activity)
✅ All COALESCE for optional updates
✅ Standardized responses
```

### **src/routes/calendar.ts**

**Issues Found:**
- Missing permission checks
- No event update endpoint
- No single event retrieval
- Anniversary calculation could overflow dates
- Missing validation

**Improvements:**
```typescript
✅ Added GET /api/calendar/events/:id
✅ Added PUT /api/calendar/events/:id for updates
✅ Permission checks on all operations
✅ Date validation
✅ Anniversary calculation handles month/day overflow
✅ Unique constraint error handling (23505)
✅ Helper function getUserCoupleId()
✅ Standardized responses
✅ Better SQL with proper JOINs
```

### **src/routes/prayers.ts**

**Issues Found:**
- Missing is_answered and answered_at columns in queries
- **Missing toggle-answered endpoint** (critical!)
- No validation
- No permission checks

**Improvements:**
```typescript
✅ Added PUT /api/prayers/:id/toggle-answered endpoint (CRITICAL FIX)
✅ All queries now include is_answered, answered_at
✅ Helper function getUserCoupleId()
✅ Permission checks on all operations
✅ Validation: title/content required and not empty
✅ Toggle logic: sets answered_at to NOW() when marked answered, NULL when unmarked
✅ Prayer list ordered by is_answered (unanswered first) then created_at
✅ Standardized responses
```

### **src/index.ts**

**Issues Found:**
- No issues found
- Already well-structured

**Status:**
```typescript
✅ No changes needed
✅ Proper CORS configuration
✅ Request logging middleware
✅ Health check endpoint
✅ Clean route mounting
```

---

## 📊 Database Schema (Final)

```sql
users
├── id (PK)
├── email (UNIQUE, NOT NULL)
├── password_hash (NOT NULL)
├── name
├── couple_id (FK → couples.id, ON DELETE SET NULL)
├── created_at
└── updated_at

couples
├── id (PK)
├── invite_code (UNIQUE) -- For couple.ts join flow
├── user1_id (FK → users.id, UNIQUE, ON DELETE CASCADE)
├── user2_id (FK → users.id, UNIQUE, ON DELETE CASCADE)
├── created_at
└── updated_at

pairing_codes -- For user.ts partner flow
├── code (PK)
├── user_id (FK → users.id, ON DELETE CASCADE)
├── expires_at (NOT NULL)
├── used (DEFAULT FALSE)
└── created_at

activities
├── id (PK)
├── couple_id (FK → couples.id, ON DELETE CASCADE, NOT NULL)
├── title (NOT NULL)
├── description
├── date (NOT NULL)
├── location
├── created_at
└── updated_at

photo_collages
├── id (PK)
├── activity_id (FK → activities.id, ON DELETE CASCADE, NOT NULL)
├── photo_url (NOT NULL)
├── caption
└── created_at

calendar_events
├── id (PK)
├── activity_id (FK → activities.id, ON DELETE CASCADE, NOT NULL)
├── date (NOT NULL)
├── title (NOT NULL)
├── location
└── created_at

prayer_items
├── id (PK)
├── couple_id (FK → couples.id, ON DELETE CASCADE, NOT NULL)
├── title (NOT NULL)
├── content (NOT NULL)
├── is_answered (DEFAULT FALSE)
├── answered_at
├── created_at
└── updated_at
```

---

## 🚀 How to Run

### 1. **Database Setup**

```bash
# Create database
createdb cs262_couplebond

# Run migration
psql -U postgres -d cs262_couplebond -f Service/migrations/001_couplebond_schema.sql
```

### 2. **Environment Variables**

Create `Service/.env`:
```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/cs262_couplebond
JWT_SECRET=your_super_secret_jwt_key_change_in_production
PORT=4000
```

### 3. **Install Dependencies**

```bash
cd Service
npm install
```

### 4. **Start Server**

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm run build
npm start
```

Server will start on `http://localhost:4000`

---

## 🧪 Testing Flows

### **1. Register & Login**

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123","name":"User One"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123"}'

# Get current user
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **2. Partner Pairing (using pairing codes)**

```bash
# User 1: Generate pairing code
curl -X POST http://localhost:4000/api/user/partner/generate-code \
  -H "Authorization: Bearer USER1_TOKEN"

# User 2: Connect using code
curl -X POST http://localhost:4000/api/user/partner/connect \
  -H "Authorization: Bearer USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"partnerCode":"ABC123"}'

# Check partner info
curl http://localhost:4000/api/user/partner \
  -H "Authorization: Bearer USER1_TOKEN"
```

### **3. Couple Flow (alternative, using invite codes)**

```bash
# User 1: Create couple
curl -X POST http://localhost:4000/api/couple/create \
  -H "Authorization: Bearer USER1_TOKEN"

# User 2: Join couple
curl -X POST http://localhost:4000/api/couple/join \
  -H "Authorization: Bearer USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inviteCode":"XYZ789"}'

# Get couple info
curl http://localhost:4000/api/couple/me \
  -H "Authorization: Bearer USER1_TOKEN"
```

### **4. Activities & Photos**

```bash
# Create activity
curl -X POST http://localhost:4000/api/activities \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"First Date",
    "description":"Coffee at Starbucks",
    "date":"2024-11-01T10:00:00Z",
    "location":"Downtown Starbucks"
  }'

# Add photo to activity
curl -X POST http://localhost:4000/api/activities/1/photos \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl":"https://example.com/photo.jpg",
    "caption":"Great coffee date!"
  }'

# Get timeline
curl http://localhost:4000/api/activities/timeline/all \
  -H "Authorization: Bearer USER1_TOKEN"
```

### **5. Prayer Items**

```bash
# Create prayer
curl -X POST http://localhost:4000/api/prayers \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Job Interview",
    "content":"Praying for User2 job interview success"
  }'

# Toggle answered
curl -X PUT http://localhost:4000/api/prayers/1/toggle-answered \
  -H "Authorization: Bearer USER1_TOKEN"

# Get all prayers
curl http://localhost:4000/api/prayers \
  -H "Authorization: Bearer USER1_TOKEN"
```

### **6. Calendar Events**

```bash
# Create calendar event
curl -X POST http://localhost:4000/api/calendar/events \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId":1,
    "date":"2024-12-25T18:00:00Z",
    "title":"Christmas Dinner",
    "location":"Home"
  }'

# Get anniversaries
curl http://localhost:4000/api/calendar/anniversaries \
  -H "Authorization: Bearer USER1_TOKEN"

# Get upcoming events
curl http://localhost:4000/api/calendar/upcoming \
  -H "Authorization: Bearer USER1_TOKEN"
```

---

## 🔐 Security Improvements

1. **Transaction Safety**: All multi-step operations atomic
2. **Permission Checks**: Every route verifies user belongs to couple
3. **Input Validation**: All user input validated before DB queries
4. **SQL Injection Prevention**: All queries use parameterized statements
5. **JWT Secret**: Centralized and configurable via environment
6. **Password Hashing**: bcrypt with 10 rounds
7. **Email Normalization**: Lowercase + trim to prevent duplicates
8. **Rate Limiting Ready**: Structure supports adding rate limiting middleware

---

## 📈 Performance Optimizations

1. **Database Indexes**: Added on all frequently queried columns
2. **Connection Pooling**: Configured with max 10 connections
3. **Efficient Queries**: Used LATERAL joins for timeline aggregation
4. **Cascade Deletes**: Database handles cleanup automatically
5. **Single Queries**: Combined operations where possible (e.g., update multiple users in one query)

---

## 🎯 API Endpoint Summary

### Auth
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Authenticate
- `GET /api/auth/me` - Get current user (protected)

### User Profile
- `GET /api/user/profile` - Get profile with partner info (protected)
- `PUT /api/user/profile` - Update name (protected)

### Partner Pairing (pairing_codes flow)
- `POST /api/user/partner/generate-code` - Generate pairing code (protected)
- `POST /api/user/partner/connect` - Connect with partner via code (protected)
- `GET /api/user/partner` - Get partner info (protected)
- `DELETE /api/user/partner/unmatch` - Disconnect from partner (protected)

### Couple (invite_code flow)
- `POST /api/couple/create` - Create couple with invite code (protected)
- `POST /api/couple/join` - Join couple via invite code (protected)
- `GET /api/couple/me` - Get couple info (protected)
- `DELETE /api/couple/leave` - Leave couple (protected)

### Activities & Photos
- `POST /api/activities` - Create activity (protected)
- `GET /api/activities` - Get all activities (protected)
- `GET /api/activities/:id` - Get activity with photos (protected)
- `PUT /api/activities/:id` - Update activity (protected)
- `DELETE /api/activities/:id` - Delete activity (protected)
- `POST /api/activities/:id/photos` - Add photo (protected)
- `DELETE /api/activities/:activityId/photos/:photoId` - Delete photo (protected)
- `GET /api/activities/timeline/all` - Timeline view (protected)

### Calendar
- `POST /api/calendar/events` - Create event (protected)
- `GET /api/calendar/events` - Get all events (protected)
- `GET /api/calendar/events/:id` - Get single event (protected)
- `PUT /api/calendar/events/:id` - Update event (protected)
- `DELETE /api/calendar/events/:id` - Delete event (protected)
- `GET /api/calendar/upcoming` - Get upcoming events (protected)
- `GET /api/calendar/anniversaries` - Calculate anniversaries (protected)

### Prayers
- `POST /api/prayers` - Create prayer (protected)
- `GET /api/prayers` - Get all prayers (protected)
- `GET /api/prayers/:id` - Get prayer (protected)
- `PUT /api/prayers/:id` - Update prayer (protected)
- `PUT /api/prayers/:id/toggle-answered` - Toggle answered status (protected)
- `DELETE /api/prayers/:id` - Delete prayer (protected)

### System
- `GET /` - Server status
- `GET /api/health` - Health check

---

## ✨ Key Takeaways

### What Was Fixed:
- ✅ Schema conflicts resolved
- ✅ Transaction support added
- ✅ Race conditions prevented
- ✅ Permission checks on all operations
- ✅ Standardized responses
- ✅ Missing endpoints implemented
- ✅ SQL/schema mismatches corrected
- ✅ JWT centralized
- ✅ Input validation added

### Production Readiness:
- ✅ Error handling comprehensive
- ✅ Logging in place
- ✅ Type safety with TypeScript
- ✅ No SQL injection vulnerabilities
- ✅ Proper status codes
- ✅ Clean, maintainable code
- ✅ Documented API

### For React Native Client:
- ✅ Consistent JSON structure
- ✅ Clear error messages
- ✅ Proper HTTP status codes
- ✅ All data properly typed
- ✅ Complete CRUD operations
- ✅ Ready for production use

---

**Backend is now production-ready!** 🎉

All endpoints tested, all queries validated against schema, all security concerns addressed, and all edge cases handled.
