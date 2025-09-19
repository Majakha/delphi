# API Migration Summary - New Schema Implementation

## Overview
This document summarizes the complete rewrite of the Delphi API to support the new database schema with improved authentication, protocol-based task management, and user customization capabilities.

## Major Changes

### 1. Database Schema Updates
- **New Authentication**: Added proper username/email fields and bcryptjs password hashing
- **Protocol-Task Structure**: Replaced sections/subsections with protocols containing tasks
- **User Customization**: Added protocol-specific overrides for tasks, sensors, and domains
- **Global Templates**: Separated global templates from user-specific customizations
- **Proper UUIDs**: Changed from auto-increment IDs to UUIDs for better scalability

### 2. Authentication System Overhaul

#### Enhanced Security
- **bcryptjs Password Hashing**: Replaced plaintext passwords with proper hashing (12 salt rounds)
- **Username/Email Support**: Users can login with either username or email
- **User Registration**: Added proper user registration endpoint with validation

#### New Auth Endpoints
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Login with username/email and password  
- `PUT /auth/password` - Change password with current password verification
- All existing auth endpoints updated for new schema

### 3. Core Entity Changes

#### From Sections/Subsections → To Tasks/Protocols
| Old Structure | New Structure |
|---------------|---------------|
| `subsections` | `tasks` (global templates) |
| `sections` | `domains` (categorical grouping) |
| `protocols` contain `sections` | `protocols` contain `tasks` |

#### New Task Management
- **Global Tasks**: Immutable templates available to all users
- **Custom Tasks**: User-created tasks with full CRUD capabilities
- **Protocol Tasks**: User-specific overrides of global tasks within protocols
- **Task Properties**: title, time, rating, description, notes, type (task/break)

### 4. Protocol System Redesign

#### Protocol Features
- **Template Support**: Protocols can be marked as templates for reuse
- **Task Overrides**: Users can override task properties per protocol without affecting global tasks
- **Sensor/Domain Customization**: Per-protocol customization of task relationships
- **Order Management**: Proper task ordering within protocols

#### Key Improvements
- Protocol creation from templates
- Task reordering within protocols
- Custom importance ratings and notes per task
- Modification tracking for analytics

### 5. API Architecture Improvements

#### Query Structure
- **Parameterized Queries**: Complete elimination of SQL injection vulnerabilities
- **Class-based Organization**: Logical grouping of related queries in `DatabaseQueries` class
- **Consistent Patterns**: Standardized `{query, params}` return format

#### Enhanced Error Handling
- **Comprehensive Validation**: Field-level validation with detailed error messages
- **Authorization Checks**: Proper user ownership verification for custom resources
- **Database Error Handling**: Graceful handling of constraint violations

### 6. New API Endpoints

#### Tasks (`/tasks`)
- `GET /tasks` - Get all public tasks (with filters)
- `GET /tasks/search/:term` - Search tasks
- `GET /tasks/:id` - Get task details with optional relationships
- `POST /tasks` - Create custom task
- `PUT /tasks/:id` - Update custom task (owner only)
- `DELETE /tasks/:id` - Delete custom task (owner only)
- `POST/DELETE /tasks/:id/sensors/:sensorId` - Manage task-sensor relationships
- `POST/DELETE /tasks/:id/domains/:domainId` - Manage task-domain relationships

#### Domains (`/domains`)
- `GET /domains` - Get all domains
- `GET /domains/public` - Get public domains only
- `GET /domains/:id` - Get domain details
- `POST /domains` - Create custom domain
- `PUT /domains/:id` - Update custom domain (owner only)
- `DELETE /domains/:id` - Delete custom domain (owner only)

#### Protocols (Updated)
- `GET /protocols?templates_only=true` - Get template protocols
- `GET /protocols/:id/full` - Get protocol with all tasks and relationships
- `POST /protocols` - Create protocol (with template support)
- `POST/DELETE /protocols/:id/tasks/:taskId` - Manage protocol tasks

#### Sensors (Updated)
- Updated for new schema with proper authorization
- Custom sensor management by creators only
- Improved validation and error handling

### 7. Authentication & Authorization

#### Security Model
- **Resource Ownership**: Users can only modify their own custom resources
- **Global Protection**: Global templates cannot be modified by regular users
- **Session Management**: Improved token validation and cleanup

#### Permission Levels
- **Global Resources**: Read-only for all users (tasks, sensors, domains)
- **Custom Resources**: Full CRUD for creators only
- **Protocol Resources**: Full control for protocol owners

### 8. Data Migration Considerations

#### Schema Changes Required
1. Add new authentication fields to `access_passwords`
2. Create new tables: `domains`, `protocol_tasks`, `protocol_task_sensors`, `protocol_task_domains`, `modification_tracking`
3. Update existing tables with new fields and constraints
4. Migrate existing data to new structure

#### Breaking Changes
- All authentication endpoints require new request/response format
- Protocol structure completely changed
- API endpoints restructured (`/sections` → `/domains`, `/subsections` → `/tasks`)

### 9. Development Setup

#### New Dependencies
```json
{
  "bcryptjs": "^2.4.3"
}
```

#### Environment Variables
- `JWT_SECRET` - JWT signing secret
- `TOKEN_EXPIRY` - Token expiration (default: 24h)
- Database connection variables remain the same

### 10. Testing Recommendations

#### Critical Test Areas
1. **Authentication Flow**: Registration → Login → Token validation
2. **Protocol Management**: Create → Add tasks → Customize → Delete
3. **Permission Testing**: Verify ownership checks for custom resources
4. **Data Integrity**: Test cascade deletes and constraint violations
5. **API Consistency**: Validate all endpoints follow new patterns

#### Migration Testing
1. Test with existing data to ensure smooth transition
2. Verify all old endpoints return appropriate deprecation messages
3. Validate new authentication requirements

### 11. Deployment Notes

#### Pre-deployment
1. Install new dependencies (`npm install bcryptjs`)
2. Run database migration scripts
3. Update environment variables
4. Test authentication flow

#### Post-deployment
1. Monitor error rates for auth failures
2. Verify database performance with new schema
3. Check for any missed endpoint updates

## Conclusion

This migration represents a complete overhaul of the Delphi API, introducing modern security practices, improved data modeling, and enhanced user experience. The new system provides better separation of concerns, proper user customization, and maintains backward compatibility where possible while setting the foundation for future enhancements.