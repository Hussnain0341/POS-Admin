# Scripts Folder

Utility scripts for project management.

## Scripts

### init-db.js
Initializes the database by running the schema SQL file.

**Usage:**
```bash
node scripts/init-db.js
```

### setup-admin.js
Generates a bcrypt password hash for admin users.

**Usage:**
```bash
node scripts/setup-admin.js <username> <password>
```

**Example:**
```bash
node scripts/setup-admin.js admin mypassword
```

This will output the SQL statement to insert/update the admin user.


