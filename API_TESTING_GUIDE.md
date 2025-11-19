# CoupleBond API Testing Quick Reference

Quick copy-paste commands for testing all endpoints. Replace `YOUR_TOKEN` with actual JWT tokens.

## Environment Setup

```bash
export API_URL="http://localhost:4000"
export USER1_TOKEN="your_user1_jwt_token"
export USER2_TOKEN="your_user2_jwt_token"
```

## 1. Authentication

### Register User 1
```bash
curl -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123",
    "name": "Alice"
  }'
```

### Register User 2
```bash
curl -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "password": "password123",
    "name": "Bob"
  }'
```

### Login
```bash
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }'
```

### Get Current User
```bash
curl $API_URL/api/auth/me \
  -H "Authorization: Bearer $USER1_TOKEN"
```

## 2. User Profile

### Get Profile
```bash
curl $API_URL/api/user/profile \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Update Profile
```bash
curl -X PUT $API_URL/api/user/profile \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated"}'
```

## 3. Partner Pairing (Pairing Codes Flow)

### Generate Pairing Code (User 1)
```bash
curl -X POST $API_URL/api/user/partner/generate-code \
  -H "Authorization: Bearer $USER1_TOKEN"
# Save the returned code
```

### Connect with Partner (User 2 uses code)
```bash
curl -X POST $API_URL/api/user/partner/connect \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"partnerCode": "ABC123"}'
```

### Get Partner Info
```bash
curl $API_URL/api/user/partner \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Disconnect from Partner
```bash
curl -X DELETE $API_URL/api/user/partner/unmatch \
  -H "Authorization: Bearer $USER1_TOKEN"
```

## 4. Couple (Invite Code Flow - Alternative)

### Create Couple (User 1)
```bash
curl -X POST $API_URL/api/couple/create \
  -H "Authorization: Bearer $USER1_TOKEN"
# Save the invite code
```

### Join Couple (User 2 uses invite code)
```bash
curl -X POST $API_URL/api/couple/join \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inviteCode": "XYZ789AB"}'
```

### Get Couple Info
```bash
curl $API_URL/api/couple/me \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Leave Couple
```bash
curl -X DELETE $API_URL/api/couple/leave \
  -H "Authorization: Bearer $USER1_TOKEN"
```

## 5. Activities

### Create Activity
```bash
curl -X POST $API_URL/api/activities \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First Date",
    "description": "Coffee at local cafe",
    "date": "2024-11-15T14:00:00Z",
    "location": "Downtown Cafe"
  }'
# Note the returned activity ID
```

### Get All Activities
```bash
curl $API_URL/api/activities \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Get Specific Activity
```bash
curl $API_URL/api/activities/1 \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Update Activity
```bash
curl -X PUT $API_URL/api/activities/1 \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First Date (Updated)",
    "description": "Amazing coffee date"
  }'
```

### Delete Activity
```bash
curl -X DELETE $API_URL/api/activities/1 \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Get Timeline
```bash
curl $API_URL/api/activities/timeline/all \
  -H "Authorization: Bearer $USER1_TOKEN"
```

## 6. Photos

### Add Photo to Activity
```bash
curl -X POST $API_URL/api/activities/1/photos \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://example.com/photos/date1.jpg",
    "caption": "Great coffee and conversation!"
  }'
```

### Delete Photo
```bash
curl -X DELETE $API_URL/api/activities/1/photos/1 \
  -H "Authorization: Bearer $USER1_TOKEN"
```

## 7. Calendar Events

### Create Calendar Event
```bash
curl -X POST $API_URL/api/calendar/events \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId": 1,
    "date": "2024-12-25T18:00:00Z",
    "title": "Christmas Dinner",
    "location": "Our Place"
  }'
```

### Get All Events
```bash
curl $API_URL/api/calendar/events \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Get Specific Event
```bash
curl $API_URL/api/calendar/events/1 \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Update Event
```bash
curl -X PUT $API_URL/api/calendar/events/1 \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Christmas Dinner (Updated)",
    "location": "Parents House"
  }'
```

### Get Upcoming Events
```bash
curl $API_URL/api/calendar/upcoming \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Get Anniversaries
```bash
curl $API_URL/api/calendar/anniversaries \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Delete Event
```bash
curl -X DELETE $API_URL/api/calendar/events/1 \
  -H "Authorization: Bearer $USER1_TOKEN"
```

## 8. Prayer Items

### Create Prayer
```bash
curl -X POST $API_URL/api/prayers \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Job Interview",
    "content": "Praying for success in upcoming job interview"
  }'
```

### Get All Prayers
```bash
curl $API_URL/api/prayers \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Get Specific Prayer
```bash
curl $API_URL/api/prayers/1 \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Update Prayer
```bash
curl -X PUT $API_URL/api/prayers/1 \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Job Interview (Updated)",
    "content": "Praying for peace and confidence"
  }'
```

### Toggle Answered Status
```bash
curl -X PUT $API_URL/api/prayers/1/toggle-answered \
  -H "Authorization: Bearer $USER1_TOKEN"
```

### Delete Prayer
```bash
curl -X DELETE $API_URL/api/prayers/1 \
  -H "Authorization: Bearer $USER1_TOKEN"
```

## 9. System Endpoints

### Health Check
```bash
curl $API_URL/api/health
```

### Server Status
```bash
curl $API_URL/
```

## Expected Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

## Common HTTP Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation error)
- **401** - Unauthorized (no/invalid token)
- **403** - Forbidden (permission denied)
- **404** - Not Found
- **409** - Conflict (duplicate/already exists)
- **500** - Server Error

## Testing Flow Example

```bash
# 1. Register two users
curl -X POST $API_URL/api/auth/register -H "Content-Type: application/json" -d '{"email":"alice@test.com","password":"pass123","name":"Alice"}'
curl -X POST $API_URL/api/auth/register -H "Content-Type: application/json" -d '{"email":"bob@test.com","password":"pass123","name":"Bob"}'

# 2. Login both users (save their tokens)
curl -X POST $API_URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"alice@test.com","password":"pass123"}'
curl -X POST $API_URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"bob@test.com","password":"pass123"}'

# 3. Alice generates pairing code
curl -X POST $API_URL/api/user/partner/generate-code -H "Authorization: Bearer ALICE_TOKEN"

# 4. Bob connects using code
curl -X POST $API_URL/api/user/partner/connect -H "Authorization: Bearer BOB_TOKEN" -H "Content-Type: application/json" -d '{"partnerCode":"ABC123"}'

# 5. Create activity
curl -X POST $API_URL/api/activities -H "Authorization: Bearer ALICE_TOKEN" -H "Content-Type: application/json" -d '{"title":"Date Night","description":"Dinner","date":"2024-11-20T19:00:00Z","location":"Restaurant"}'

# 6. Add photo
curl -X POST $API_URL/api/activities/1/photos -H "Authorization: Bearer BOB_TOKEN" -H "Content-Type: application/json" -d '{"photoUrl":"https://example.com/photo.jpg","caption":"Great evening!"}'

# 7. Create prayer
curl -X POST $API_URL/api/prayers -H "Authorization: Bearer ALICE_TOKEN" -H "Content-Type: application/json" -d '{"title":"Travel Safety","content":"Praying for safe travels"}'

# 8. Mark prayer as answered
curl -X PUT $API_URL/api/prayers/1/toggle-answered -H "Authorization: Bearer BOB_TOKEN"

# 9. Get timeline
curl $API_URL/api/activities/timeline/all -H "Authorization: Bearer ALICE_TOKEN"
```

## Tips

1. **Save tokens**: After login, save the JWT token from the response
2. **Use environment variables**: Set `$USER1_TOKEN` and `$USER2_TOKEN` for easier testing
3. **Check response**: Always verify `success: true` in responses
4. **Note IDs**: Save returned IDs (activity_id, prayer_id, etc.) for subsequent requests
5. **Test permissions**: Try accessing data with wrong user token (should fail)
6. **Test validation**: Try sending invalid data (should get 400 errors)

## Postman Collection

To import into Postman:
1. Copy all commands into a text file
2. Use "Import" → "Curl" in Postman
3. Set up environment variables for `{{api_url}}`, `{{user1_token}}`, `{{user2_token}}`

---

Happy testing! 🚀
