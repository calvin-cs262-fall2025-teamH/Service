## Related Repositories
- [Client Repository](https://github.com/calvin-cs262-fall2025-teamH/Client)
- [Project Repository](https://github.com/calvin-cs262-fall2025-teamH/Project)


# Service
This one will eventually hold your data service application.

In order to run backend please use the below:
npm run dev

HAVE YOUR SQL FIRST THAN DO!

✅ What YOU need to change

1. **Create your own `.env` file in the Service folder**
   Copy and rename `.env.example` → `.env`,then update this line:
   DATABASE_URL=postgres://<YOUR_USERNAME>:<YOUR_PASSWORD>@localhost:5432/<YOUR_DATABASE_NAME>
   
Example:
DATABASE_URL=postgres://postgres:123456@localhost:5432/cs262_login

2. Make sure PostgreSQL is running on your computer

3. If database does not exist, create it manually
```sql
CREATE DATABASE cs262_login;

4. Try :
$body = @{ email="newuser1@example.com"; password="secret123" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $body

If working correctly, response should be :
user
----
@{id=7629fa97-1fba-4d4b-83c0-32954fadef2e; email=newuser1@exam..

