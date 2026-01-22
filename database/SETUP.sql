-- ============================================
-- HisaabKitab License Admin System
-- COMPLETE DATABASE SETUP SCRIPT
-- ============================================
-- 
-- This ONE file sets up EVERYTHING:
-- 1. Creates database (if not exists)
-- 2. Creates all tables (AdminUsers, Licenses, Activations, AuditLogs, login_2fa_codes)
-- 3. Creates all indexes
-- 4. Creates functions and triggers
-- 5. Sets up default admin user
-- 6. Grants permissions
-- 7. Verifies setup
--
-- INSTRUCTIONS:
-- Option A: Run in pgAdmin
--   1. Connect to PostgreSQL server
--   2. Right-click on "Databases" → "Query Tool"
--   3. Copy and paste this entire file
--   4. Click "Execute" (F5)
--   5. Done! Database and all tables will be created.
--
-- Option B: Run from command line
--   psql -U postgres -f SETUP.sql
--
-- ============================================

-- ============================================
-- STEP 1: CREATE DATABASE (run this FIRST if database doesn't exist)
-- ============================================
-- 
-- IMPORTANT: If the database "hisaabkitab_license" doesn't exist yet:
--   1. In pgAdmin: Right-click "Databases" → "Query Tool"
--   2. Run this command:
--      CREATE DATABASE hisaabkitab_license;
--   3. Then right-click the new database → "Query Tool"
--   4. Run the rest of this script (everything below)
--
-- If database already exists, skip the CREATE DATABASE step above
-- and run this entire script directly on the database.
--
-- ============================================
-- STEP 2: ENABLE REQUIRED EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 3: CREATE TABLES
-- ============================================

-- AdminUsers Table
CREATE TABLE IF NOT EXISTS AdminUsers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE AdminUsers IS 'Administrator user accounts for the license admin system';
COMMENT ON COLUMN AdminUsers.id IS 'Unique identifier for admin user';
COMMENT ON COLUMN AdminUsers.username IS 'Admin login username (unique)';
COMMENT ON COLUMN AdminUsers.passwordHash IS 'Bcrypt hashed password';
COMMENT ON COLUMN AdminUsers.role IS 'User role: admin, superadmin, support';

-- Licenses Table
CREATE TABLE IF NOT EXISTS Licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    licenseKey VARCHAR(50) UNIQUE NOT NULL,
    tenantName VARCHAR(255) NOT NULL,
    plan VARCHAR(50),
    maxDevices INTEGER DEFAULT 1 CHECK (maxDevices > 0),
    maxUsers INTEGER DEFAULT 1 CHECK (maxUsers > 0),
    features JSONB DEFAULT '{}',
    startDate DATE,
    expiryDate DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'suspended')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Licenses IS 'License records for POS software';
COMMENT ON COLUMN Licenses.licenseKey IS 'Unique license key in format HK-XXXX-XXXX-XXXX';
COMMENT ON COLUMN Licenses.tenantName IS 'Shop or company name';
COMMENT ON COLUMN Licenses.plan IS 'License plan: Basic, Pro, Enterprise, etc.';
COMMENT ON COLUMN Licenses.maxDevices IS 'Maximum number of devices allowed';
COMMENT ON COLUMN Licenses.maxUsers IS 'Maximum number of POS users allowed';
COMMENT ON COLUMN Licenses.features IS 'JSON object with feature flags';
COMMENT ON COLUMN Licenses.status IS 'License status: active, expired, revoked, suspended';

-- Activations Table
CREATE TABLE IF NOT EXISTS Activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    licenseId UUID NOT NULL REFERENCES Licenses(id) ON DELETE CASCADE,
    deviceId VARCHAR(255) NOT NULL,
    activatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastCheck TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'revoked')),
    UNIQUE(licenseId, deviceId)
);

COMMENT ON TABLE Activations IS 'Device activation records per license';
COMMENT ON COLUMN Activations.licenseId IS 'Reference to license';
COMMENT ON COLUMN Activations.deviceId IS 'Hashed device fingerprint';
COMMENT ON COLUMN Activations.activatedAt IS 'First activation timestamp';
COMMENT ON COLUMN Activations.lastCheck IS 'Last license validation timestamp';
COMMENT ON COLUMN Activations.status IS 'Activation status: active, blocked, revoked';

-- AuditLogs Table
CREATE TABLE IF NOT EXISTS AuditLogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    licenseId UUID REFERENCES Licenses(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE AuditLogs IS 'System audit trail for all operations';
COMMENT ON COLUMN AuditLogs.licenseId IS 'Related license (if applicable)';
COMMENT ON COLUMN AuditLogs.action IS 'Action performed: login, license_created, etc.';
COMMENT ON COLUMN AuditLogs.details IS 'JSON object with action details';
COMMENT ON COLUMN AuditLogs.ipAddress IS 'IP address of the request';
COMMENT ON COLUMN AuditLogs.userAgent IS 'User agent string from request';

-- login_2fa_codes Table (for Two-Factor Authentication)
CREATE TABLE IF NOT EXISTS login_2fa_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temp_token VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES adminusers(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_2fa_temp_token ON login_2fa_codes(temp_token);
CREATE INDEX IF NOT EXISTS idx_2fa_expires_at ON login_2fa_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_2fa_user_id ON login_2fa_codes(user_id);

COMMENT ON TABLE login_2fa_codes IS 'Pending 2FA verification codes for admin login';
COMMENT ON COLUMN login_2fa_codes.temp_token IS 'Temporary token for 2FA verification session';
COMMENT ON COLUMN login_2fa_codes.code IS '6-digit verification code';
COMMENT ON COLUMN login_2fa_codes.expires_at IS 'Code expiration timestamp (10 minutes)';

-- ============================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Licenses indexes
CREATE INDEX IF NOT EXISTS idx_licenses_licenseKey ON Licenses(licenseKey);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON Licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_tenantName ON Licenses(tenantName);
CREATE INDEX IF NOT EXISTS idx_licenses_expiryDate ON Licenses(expiryDate);
CREATE INDEX IF NOT EXISTS idx_licenses_createdAt ON Licenses(createdAt);

-- Activations indexes
CREATE INDEX IF NOT EXISTS idx_activations_licenseId ON Activations(licenseId);
CREATE INDEX IF NOT EXISTS idx_activations_deviceId ON Activations(deviceId);
CREATE INDEX IF NOT EXISTS idx_activations_status ON Activations(status);
CREATE INDEX IF NOT EXISTS idx_activations_lastCheck ON Activations(lastCheck);

-- AuditLogs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_licenseId ON AuditLogs(licenseId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON AuditLogs(createdAt);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON AuditLogs(action);

-- AdminUsers indexes
CREATE INDEX IF NOT EXISTS idx_adminusers_username ON AdminUsers(username);

-- ============================================
-- STEP 5: CREATE FUNCTIONS
-- ============================================

-- Function to update updatedAt timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updatedAt timestamp on row update';

-- Function to automatically expire licenses
CREATE OR REPLACE FUNCTION check_license_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expiryDate < CURRENT_DATE AND NEW.status = 'active' THEN
        NEW.status = 'expired';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION check_license_expiry() IS 'Automatically marks licenses as expired when expiry date passes';

-- ============================================
-- STEP 6: CREATE TRIGGERS
-- ============================================

-- Trigger to auto-update updatedAt on Licenses table
DROP TRIGGER IF EXISTS update_licenses_updated_at ON Licenses;
CREATE TRIGGER update_licenses_updated_at 
    BEFORE UPDATE ON Licenses
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to check license expiry on insert/update
DROP TRIGGER IF EXISTS check_license_expiry_trigger ON Licenses;
CREATE TRIGGER check_license_expiry_trigger
    BEFORE INSERT OR UPDATE ON Licenses
    FOR EACH ROW
    EXECUTE FUNCTION check_license_expiry();

-- ============================================
-- STEP 7: INSERT DEFAULT DATA
-- ============================================

-- Insert default admin user
-- Password: admin123
-- Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
INSERT INTO AdminUsers (username, passwordHash, role) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin')
ON CONFLICT (username) DO UPDATE 
SET passwordHash = EXCLUDED.passwordHash,
    role = EXCLUDED.role;

-- ============================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================

-- Grant all privileges to postgres user (or your application user)
-- Adjust the username as needed for your setup

-- Grant permissions on tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Grant permissions for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

-- ============================================
-- STEP 9: VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('adminusers', 'licenses', 'activations', 'auditlogs', 'login_2fa_codes');
    
    IF table_count = 5 THEN
        RAISE NOTICE '✅ All 5 tables created successfully!';
    ELSE
        RAISE WARNING '⚠️  Expected 5 tables, found %', table_count;
    END IF;
END $$;

-- Verify indexes were created
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    IF index_count >= 15 THEN
        RAISE NOTICE '✅ Indexes created successfully! (Found % indexes)', index_count;
    ELSE
        RAISE WARNING '⚠️  Expected at least 15 indexes, found %', index_count;
    END IF;
END $$;

-- Verify admin user exists
DO $$
DECLARE
    admin_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM AdminUsers WHERE username = 'admin') INTO admin_exists;
    
    IF admin_exists THEN
        RAISE NOTICE '✅ Default admin user created successfully!';
        RAISE NOTICE '   Username: admin';
        RAISE NOTICE '   Password: admin123';
        RAISE NOTICE '   ⚠️  IMPORTANT: Change this password in production!';
    ELSE
        RAISE WARNING '⚠️  Admin user not found!';
    END IF;
END $$;

-- ============================================
-- STEP 10: DISPLAY SUMMARY
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    admin_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
    twofa_table_exists BOOLEAN;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    -- Count admin users
    SELECT COUNT(*) INTO admin_count
    FROM AdminUsers;
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    -- Count triggers
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'));
    
    -- Check if 2FA table exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'login_2fa_codes'
    ) INTO twofa_table_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETE! ✅';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'Functions created: %', function_count;
    RAISE NOTICE 'Triggers created: %', trigger_count;
    RAISE NOTICE 'Admin users: %', admin_count;
    IF twofa_table_exists THEN
        RAISE NOTICE '2FA table: ✅ Enabled';
    ELSE
        RAISE NOTICE '2FA table: ⚠️  Not found';
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE 'Default Admin Credentials:';
    RAISE NOTICE '  Username: admin';
    RAISE NOTICE '  Password: admin123';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  SECURITY REMINDER:';
    RAISE NOTICE '  1. Change the default admin password';
    RAISE NOTICE '  2. Configure SMTP for 2FA (backend/.env)';
    RAISE NOTICE '  3. Use strong JWT_SECRET in .env';
    RAISE NOTICE '  4. Enable SSL in production';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update backend/.env with database credentials';
    RAISE NOTICE '  2. Add SMTP config for 2FA (see backend/ENV_2FA_SMTP.txt)';
    RAISE NOTICE '  3. Run: npm run dev';
    RAISE NOTICE '  4. Login at http://localhost:3000';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- END OF SCRIPT
-- ============================================
-- 
-- If you see the summary above, everything is set up correctly!
-- You can now use the system with:
--   Username: admin
--   Password: admin123
--   (Then enter the 6-digit code sent to TWO_FA_EMAIL)
--
-- ============================================

