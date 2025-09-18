# Delphi Database

MySQL database setup for the Delphi Protocol Builder application.

## Quick Start

### Setup (First Time)
```bash
# Copy centralized environment template (from project root)
cp .env.example .env

# Edit .env with your secure passwords
nano .env
```

### Option 1: Database Only
```bash
# Start just the database service
docker-compose up db -d

# View logs
docker-compose logs -f db

# Stop database
docker-compose stop db
```

### Option 2: Full Application Stack
```bash
# Start everything (app, api, database)
docker-compose up -d
```

## Database Configuration

### Centralized Environment Variables
Environment variables are now centralized in `.env` at the project root:
- `DB_HOST`: Database host (default: `localhost`, `db` in Docker)
- `DB_PORT`: Database port (default: `3306`)
- `DB_NAME`: Database name (default: `delphi_db`)
- `DB_USER`: Application user (default: `delphi_user`)
- `DB_PASSWORD`: Application user password
- `JWT_SECRET`: Secret for JWT tokens
- `API_PORT`: API server port (default: `3001`)

### Database Initialization
The database uses initialization scripts that read environment variables:
- `db/01-init.sh`: Creates database and user with environment variables
- `db/02-schema.sql`: Creates tables and inserts sample data
- `db/my.cnf`: MySQL configuration file (performance tuning)

### Connection Details
Connection details are defined in `.env`:
- **Host**: `localhost` (local) or `db` (Docker container)
- **Port**: `3306` (or value from `DB_PORT`)
- **Database**: Value from `DB_NAME` (default: `delphi_db`)
- **Username**: Value from `DB_USER` (default: `delphi_user`)
- **Password**: Value from `DB_PASSWORD`

## Database Schema

### Core Tables
- `access_passwords` - User authentication
- `access_tokens` - JWT token storage
- `sensors` - Sensor definitions
- `subsections` - Protocol subsections
- `sections` - Protocol sections
- `protocols` - Complete protocols
- `component_usage` - Usage analytics

### Relationship Tables
- `subsection_sensors` - Many-to-many: subsections ↔ sensors
- `section_subsections` - Many-to-many: sections ↔ subsections (ordered)
- `protocol_sections` - Many-to-many: protocols ↔ sections (ordered)

## Sample Data

The database includes default sample data:
- **10 sensors** (Heart Rate Monitor, Temperature, etc.)
- **4 subsections** (Warm-up, Rest Period, etc.)
- **3 sections** (Pre-Exercise, Main Exercise, Recovery)
- **12 test user accounts** (passwords: test1-test3, alpha123, etc.)

## Management Commands

### Access MySQL CLI
```bash
# Connect as root (use password from .env)
docker exec -it delphi-db-1 mysql -u root -p

# Connect as application user (use DB_USER and DB_PASSWORD from .env)
docker exec -it delphi-db-1 mysql -u ${DB_USER} -p
```

### Reset Database
```bash
# Stop and remove containers + volumes
docker-compose down -v

# Start fresh (no rebuild needed - uses official MySQL image)
docker-compose up -d db
```

### Backup Database
```bash
# Create backup (replace passwords with values from .env)
docker exec delphi-db-1 mysqldump -u root -p${DB_PASSWORD} ${DB_NAME} > backup.sql

# Restore backup
docker exec -i delphi-db-1 mysql -u root -p${DB_PASSWORD} ${DB_NAME} < backup.sql
```

### View Logs
```bash
# Database container logs
docker-compose logs -f db

# Check initialization logs (if using container name)
docker logs [container_name]
```

## Development

### Local MySQL Alternative
If you prefer running MySQL locally instead of Docker:

1. Install MySQL 8.0+
2. Set up `.env` with `DB_HOST=localhost`
3. Run: `bash db/01-init.sh` (after installing mysql client)
4. Or manually create database and run `db/02-schema.sql`

### Schema Changes
1. Modify `db/02-schema.sql`
2. Restart container: `docker-compose up -d db`
3. Or apply changes manually via MySQL CLI

### Performance Tuning
1. Modify `db/my.cnf` for MySQL-specific settings
2. Update `.env` for environment variables
3. Restart: `docker-compose restart db`

## Troubleshooting

### Container Won't Start
```bash
# Check container status
docker ps -a

# View error logs
docker logs delphi-database

# Remove volume and restart fresh
docker-compose down -v
docker-compose up --build -d db
```

### Connection Issues
- Ensure port 3306 is not in use by another MySQL instance
- Check environment variables match between API and database
- Verify network connectivity: `docker network ls`

### Performance Issues
- Increase memory limits in docker-compose
- Add database indexes for frequently queried columns
- Monitor with: `docker stats [container_name]`

## Security Notes

⚠️ **Development Only**: Default passwords in `.env.example` are insecure and should be changed:

```bash
# Generate secure passwords
openssl rand -base64 32  # For database passwords
openssl rand -base64 64  # For JWT secrets
```

### Security Checklist:
1. Copy `.env.example` to `.env`
2. Replace all placeholder passwords with secure values
3. Never commit `.env` to version control
4. Use different passwords for each environment (dev/staging/prod)
5. Consider using Docker secrets for production deployments

### File Structure:
- `/.env` - Centralized environment variables (shared by API and DB)
- `/db/01-init.sh` - Database and user creation script
- `/db/02-schema.sql` - Database schema and sample data
- `/db/my.cnf` - MySQL performance and configuration settings
