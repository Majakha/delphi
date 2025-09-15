# Delphi Database

MySQL database setup for the Delphi Protocol Builder application.

## Quick Start

### Setup (First Time)
```bash
# Copy centralized environment template
cp .env.shared.example .env.shared

# Edit .env.shared with your secure passwords
nano .env.shared
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
Environment variables are now centralized in `.env.shared` at the project root:
- `DB_HOST`: Database host (default: `db` for containers, `localhost` for local)
- `DB_PORT`: Database port (default: `3306`)
- `DB_NAME`: Database name (default: `mydatabase`)
- `DB_USER`: Application user (default: `delphi`)
- `DB_PASSWORD`: Application user password
- `DB_ROOT_PASSWORD`: Root user password
- `MYSQL_*`: Docker MySQL environment variables

### Database-Specific Configuration
Performance and MySQL-specific settings are configured in:
- `db/my.cnf`: MySQL configuration file (performance tuning, logging, etc.)
- `db/Dockerfile`: Container build configuration

### Connection Details
Connection details are defined in `.env.shared`:
- **Host**: `db` (from containers) or `localhost` (local development)
- **Port**: `3306`
- **Database**: Value from `DB_NAME` in `.env.shared`
- **Username**: Value from `DB_USER` in `.env.shared`
- **Password**: Value from `DB_PASSWORD` in `.env.shared`

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
# Connect as root (use DB_ROOT_PASSWORD from .env.shared)
docker exec -it delphi-database mysql -u root -p

# Connect as application user (use DB_PASSWORD from .env.shared)
docker exec -it delphi-database mysql -u delphi -p
```

### Reset Database
```bash
# Stop and remove containers + volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build -d db
```

### Backup Database
```bash
# Create backup
docker exec delphi-database mysqldump -u root -pexample mydatabase > backup.sql

# Restore backup
docker exec -i delphi-database mysql -u root -pexample mydatabase < backup.sql
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
2. Create database: `CREATE DATABASE mydatabase;`
3. Run init script: `mysql -u root -p mydatabase < db/init.sql`
4. Update `.env.shared`: Set `DB_HOST=localhost`
5. Optional: Copy `db/my.cnf` settings to your local MySQL configuration

### Schema Changes
1. Modify `db/init.sql`
2. Rebuild container: `docker-compose up --build -d db`
3. Or apply changes manually via MySQL CLI

### Performance Tuning
1. Modify `db/my.cnf` for MySQL-specific settings
2. Update `.env.shared` for container-level environment variables
3. Rebuild: `docker-compose up --build -d db`

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

⚠️ **Development Only**: Default passwords in `.env.shared.example` are insecure and should be changed:

```bash
# Generate secure passwords
openssl rand -base64 32  # For database passwords
openssl rand -base64 64  # For JWT secrets
```

### Security Checklist:
1. Copy `.env.shared.example` to `.env.shared`
2. Replace all placeholder passwords with secure values
3. Never commit `.env.shared` to version control
4. Use different passwords for each environment (dev/staging/prod)
5. Consider using Docker secrets for production deployments

### File Structure:
- `/.env.shared` - Centralized environment variables (shared by API and DB)
- `/db/my.cnf` - MySQL performance and configuration settings
- `/db/init.sql` - Database schema and sample data
- `/db/Dockerfile` - Database container configuration