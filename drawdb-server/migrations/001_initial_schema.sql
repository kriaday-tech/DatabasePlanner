-- DrawDB Database Schema
-- Version: 1.0.0
-- Date: January 2, 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create diagrams table
CREATE TABLE IF NOT EXISTS diagrams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Untitled Diagram',
  database VARCHAR(50) NOT NULL DEFAULT 'generic',
  tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  todos JSONB NOT NULL DEFAULT '[]'::jsonb,
  enums JSONB,
  types JSONB,
  pan JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  zoom FLOAT DEFAULT 1.0,
  gist_id VARCHAR(255),
  loaded_from_gist_id VARCHAR(255),
  last_modified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_by UUID REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create diagram sharing table
CREATE TABLE IF NOT EXISTS diagram_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_diagram_user UNIQUE(diagram_id, shared_with_user_id),
  CONSTRAINT valid_permission CHECK (permission_level IN ('viewer', 'editor', 'owner'))
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  custom BOOLEAN DEFAULT true,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_diagrams_user_modified ON diagrams(user_id, last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_diagrams_user_name ON diagrams(user_id, name);
CREATE INDEX IF NOT EXISTS idx_diagrams_version ON diagrams(version);
CREATE INDEX IF NOT EXISTS idx_diagram_shares_diagram ON diagram_shares(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_shares_user ON diagram_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_diagram_shares_shared_by ON diagram_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_public ON templates(custom, is_public);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_diagrams_updated_at ON diagrams;
CREATE TRIGGER update_diagrams_updated_at 
  BEFORE UPDATE ON diagrams
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_diagram_shares_updated_at ON diagram_shares;
CREATE TRIGGER update_diagram_shares_updated_at 
  BEFORE UPDATE ON diagram_shares
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at 
  BEFORE UPDATE ON templates
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some default system templates (optional)
-- Uncomment and modify as needed
-- INSERT INTO templates (user_id, title, custom, data, is_public) VALUES
-- (NULL, 'E-commerce Database', false, '{"database": "postgresql", "tables": []}', true);

-- Create a view for diagram permissions (useful for queries)
CREATE OR REPLACE VIEW diagram_permissions AS
SELECT 
  d.id as diagram_id,
  d.user_id as owner_id,
  d.name,
  d.version,
  d.last_modified,
  d.is_shared,
  u.username as owner_username,
  u.email as owner_email
FROM diagrams d
JOIN users u ON d.user_id = u.id;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO drawdb_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO drawdb_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO drawdb_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'DrawDB database schema created successfully!';
    RAISE NOTICE 'Tables: users, diagrams, diagram_shares, templates';
    RAISE NOTICE 'Indexes and triggers have been applied.';
END $$;

