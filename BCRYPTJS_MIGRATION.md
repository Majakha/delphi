# bcrypt to bcryptjs Migration Guide

## Overview

This document explains the migration from `bcrypt` to `bcryptjs` for better Docker/container compatibility.

## Problem

The native `bcrypt` library has platform-specific binary dependencies that can cause issues in containerized environments:

```
Error: Error loading shared library /app/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node: Exec format error
```

## Solution

We've migrated to `bcryptjs`, a pure JavaScript implementation that:
- Has no native dependencies
- Works consistently across all platforms
- Is fully compatible with bcrypt hashes
- Provides the same API

## Changes Made

### 1. Package Dependencies

**Before:**
```json
{
  "bcrypt": "^5.1.1"
}
```

**After:**
```json
{
  "bcryptjs": "^2.4.3"
}
```

### 2. Import Statements

**Before:**
```javascript
const bcrypt = require("bcrypt");
```

**After:**
```javascript
const bcrypt = require("bcryptjs");
```

### 3. Files Updated

- `api/package.json` - Updated dependency
- `api/routes/auth.js` - Updated import
- `api/routes/protocols.js` - Updated import  
- `api/server.js` - Updated documentation
- `API_MIGRATION_SUMMARY.md` - Updated references
- `SERVICES_HOOKS_GUIDE.md` - Updated references

## API Compatibility

The `bcryptjs` library provides the exact same API as `bcrypt`:

```javascript
// Hashing (unchanged)
const hash = await bcrypt.hash(password, saltRounds);

// Comparing (unchanged)  
const isValid = await bcrypt.compare(password, hash);

// Salt rounds (unchanged)
const SALT_ROUNDS = 12;
```

## Performance Considerations

- `bcryptjs` is slightly slower than native `bcrypt` (~30%)
- For authentication use cases, this difference is negligible
- Container compatibility benefits outweigh performance cost

## Security

- Same cryptographic strength as `bcrypt`
- Compatible with existing bcrypt hashes
- Uses same salt rounds (12) for consistency
- No security implications from the migration

## Verification

To verify the migration worked:

```bash
# Test that bcryptjs loads correctly
cd api
node -e "const bcrypt = require('bcryptjs'); console.log('✅ bcryptjs loaded');"

# Test hash generation
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('test', 12).then(hash => {
  console.log('✅ Hash generated:', hash.substring(0, 20) + '...');
  return bcrypt.compare('test', hash);
}).then(valid => {
  console.log('✅ Hash validation:', valid);
});
"

# Start server (should not have bcrypt errors)
npm run devStartAuth
```

## Rollback Plan

If needed to rollback:

```bash
# Remove bcryptjs
npm uninstall bcryptjs

# Reinstall bcrypt
npm install bcrypt@^5.1.1

# Revert import statements
# Change require("bcryptjs") back to require("bcrypt")
```

## Docker Considerations

With `bcryptjs`, your Dockerfile no longer needs:
- Build tools for native compilation
- Platform-specific binary handling
- Architecture-specific image variants

The container will work consistently across:
- Different CPU architectures (x86, ARM)
- Different operating systems
- Different Node.js versions
- Multi-stage Docker builds

## Testing

All existing authentication tests should pass without modification since the API is identical. Key areas to verify:

1. **User Registration** - Password hashing works
2. **User Login** - Password comparison works  
3. **Password Changes** - New hash generation works
4. **Existing Users** - Old bcrypt hashes still validate
5. **Container Deployment** - No more native binding errors

## Conclusion

The migration to `bcryptjs` resolves container compatibility issues while maintaining full API compatibility and security. No application logic changes were required beyond updating the import statements.