# manicule
 
Read together, argue with the text.
 
## Setup
 
You need Node 22+ and PostgreSQL 17.
 
```
git clone https://github.com/manicule-reader/manicule.git
cd manicule
npm install
cp .env.example .env
```
 
### Database
 
**Mac (Homebrew)**
 
```
brew install postgresql@17
brew services start postgresql@17
createdb manicule
```
 
In `.env`:
 
```
DATABASE_URL=postgresql://localhost:5432/manicule
```
 
**Windows**
 
Install PostgreSQL 17 from postgresql.org/download/windows. The installer asks for a password for the `postgres` user. Then:
 
```
createdb -U postgres manicule
```
 
In `.env`:
 
```
DATABASE_URL=postgresql://postgres:YOURPASSWORD@localhost:5432/manicule
```
 
If `psql` or `createdb` isn't recognized, they're in `C:\Program Files\PostgreSQL\17\bin`.
 
### Tables and sample data
 
```
psql "postgresql://localhost:5432/manicule" -f app/db/schema.sql
psql "postgresql://localhost:5432/manicule" -f app/db/sample.sql
```
 
Use the same URL as your `.env`. Both files are safe to rerun. `sample.sql` wipes book data and reloads it.
 
Also set `SESSION_SECRET` in `.env` to any long random string.
 
## Run
 
```
npm start
```
 
Open http://localhost:3000/read/1
 
## Troubleshooting
 
- `role "username" does not exist`: your shell or `.env` still has the placeholder URL from `.env.example`.
- `connection to server on socket ... failed`: Postgres isn't running. On Mac, `brew services start postgresql@17`.
- `Cannot find module ...`: run `npm install`.
 