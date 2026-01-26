-- ============================================
-- POS Updates & Maintenance Module
-- Database Schema
-- ============================================
-- This script creates tables for managing POS desktop app updates
-- ============================================

-- ============================================
-- POS Versions Table
-- ============================================
CREATE TABLE IF NOT EXISTS pos_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) UNIQUE NOT NULL,
    platform VARCHAR(20) DEFAULT 'windows' CHECK (platform IN ('windows', 'macos', 'linux')),
    filename VARCHAR(255) NOT NULL,
    filepath TEXT NOT NULL,
    filesize BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    download_url TEXT NOT NULL,
    mandatory BOOLEAN DEFAULT false,
    release_notes TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived', 'rollback')),
    uploaded_by UUID REFERENCES adminusers(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pos_versions IS 'POS desktop application versions';
COMMENT ON COLUMN pos_versions.version IS 'Version number (e.g., 1.2.3)';
COMMENT ON COLUMN pos_versions.platform IS 'Target platform (windows, macos, linux)';
COMMENT ON COLUMN pos_versions.filename IS 'Original filename of uploaded installer';
COMMENT ON COLUMN pos_versions.filepath IS 'Server file path where installer is stored';
COMMENT ON COLUMN pos_versions.filesize IS 'File size in bytes';
COMMENT ON COLUMN pos_versions.checksum_sha256 IS 'SHA256 hash of the installer file';
COMMENT ON COLUMN pos_versions.download_url IS 'Public URL for downloading the installer';
COMMENT ON COLUMN pos_versions.mandatory IS 'Whether this update is mandatory for all POS clients';
COMMENT ON COLUMN pos_versions.status IS 'Version status: draft, live, archived, rollback';
COMMENT ON COLUMN pos_versions.uploaded_by IS 'Admin user who uploaded this version';

-- ============================================
-- POS Update Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS pos_update_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID REFERENCES pos_versions(id) ON DELETE SET NULL,
    admin_user_id UUID REFERENCES adminusers(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('UPLOAD', 'PUBLISH', 'ROLLBACK', 'ARCHIVE', 'SET_LIVE')),
    status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pos_update_logs IS 'Audit log for all POS update management actions';
COMMENT ON COLUMN pos_update_logs.action IS 'Action performed: UPLOAD, PUBLISH, ROLLBACK, ARCHIVE, SET_LIVE';
COMMENT ON COLUMN pos_update_logs.status IS 'Action result: SUCCESS or FAILED';
COMMENT ON COLUMN pos_update_logs.metadata IS 'Additional action metadata (JSON)';

-- ============================================
-- INDEXES
-- ============================================

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_pos_versions_version ON pos_versions(version);
CREATE INDEX IF NOT EXISTS idx_pos_versions_status ON pos_versions(status);
CREATE INDEX IF NOT EXISTS idx_pos_versions_platform ON pos_versions(platform);
CREATE INDEX IF NOT EXISTS idx_pos_versions_uploaded_at ON pos_versions(uploaded_at DESC);

-- Index for update logs
CREATE INDEX IF NOT EXISTS idx_pos_update_logs_version_id ON pos_update_logs(version_id);
CREATE INDEX IF NOT EXISTS idx_pos_update_logs_admin_user_id ON pos_update_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_pos_update_logs_created_at ON pos_update_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_update_logs_action ON pos_update_logs(action);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_pos_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
DROP TRIGGER IF EXISTS trigger_pos_versions_updated_at ON pos_versions;
CREATE TRIGGER trigger_pos_versions_updated_at
    BEFORE UPDATE ON pos_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_pos_versions_updated_at();

-- ============================================
-- FUNCTION: Ensure only one live version per platform
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_live_version()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a version to 'live', archive all other live versions for the same platform
    IF NEW.status = 'live' AND (OLD.status IS NULL OR OLD.status != 'live') THEN
        UPDATE pos_versions
        SET status = 'archived',
            updated_at = CURRENT_TIMESTAMP
        WHERE platform = NEW.platform
          AND status = 'live'
          AND id != NEW.id;
        
        -- Set published_at timestamp
        NEW.published_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Ensure single live version
-- ============================================
DROP TRIGGER IF EXISTS trigger_ensure_single_live_version ON pos_versions;
CREATE TRIGGER trigger_ensure_single_live_version
    BEFORE INSERT OR UPDATE ON pos_versions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_live_version();

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('pos_versions', 'pos_update_logs');
    
    IF table_count = 2 THEN
        RAISE NOTICE '✅ POS Updates tables created successfully!';
    ELSE
        RAISE WARNING '⚠️  Expected 2 tables, found %', table_count;
    END IF;
END $$;

-- ============================================
-- END OF SCRIPT
-- ============================================

