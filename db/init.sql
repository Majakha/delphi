-- db-init/init.sql

CREATE DATABASE IF NOT EXISTS mydatabase;

USE mydatabase;

-- User authentication table
CREATE TABLE IF NOT EXISTS access_passwords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token-based authentication
CREATE TABLE IF NOT EXISTS access_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES access_passwords(id) ON DELETE CASCADE,
  UNIQUE KEY (token)
);

-- Add initial passwords (these should be hashed in production)
INSERT INTO access_passwords (password) VALUES
  ('test1'),
  ('test2'),
  ('test3'),
  ('alpha123'),
  ('beta456'),
  ('gamma789'),
  ('delta123'),
  ('epsilon456'),
  ('zeta789'),
  ('eta901'),
  ('theta234'),
  ('iota567');

-- Sensors table
CREATE TABLE IF NOT EXISTS sensors (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  is_custom BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES access_passwords(id) ON DELETE SET NULL
);

-- Subsections table
CREATE TABLE IF NOT EXISTS subsections (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  time INT NOT NULL,
  rating FLOAT,
  description TEXT,
  additional_notes TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  type ENUM('subsection', 'break') DEFAULT 'subsection',
  created_by INT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES access_passwords(id) ON DELETE SET NULL
);

-- Sections table (simplified - no time/rating as those belong to subsections)
CREATE TABLE IF NOT EXISTS sections (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_by INT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES access_passwords(id) ON DELETE SET NULL
);

-- Protocols table (simplified structure matching API expectations)
CREATE TABLE IF NOT EXISTS protocols (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES access_passwords(id) ON DELETE CASCADE,
  UNIQUE KEY unique_protocol_per_user (created_by, name)
);

-- Subsection-Sensor relationship (many-to-many)
CREATE TABLE IF NOT EXISTS subsection_sensors (
  subsection_id VARCHAR(36) NOT NULL,
  sensor_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (subsection_id, sensor_id),
  FOREIGN KEY (subsection_id) REFERENCES subsections(id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

-- Section-Subsection relationship (many-to-many with ordering)
CREATE TABLE IF NOT EXISTS section_subsections (
  section_id VARCHAR(36) NOT NULL,
  subsection_id VARCHAR(36) NOT NULL,
  order_index INT NOT NULL,
  PRIMARY KEY (section_id, subsection_id),
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (subsection_id) REFERENCES subsections(id) ON DELETE CASCADE
);

-- Protocol-Section relationship (many-to-many with ordering)
CREATE TABLE IF NOT EXISTS protocol_sections (
  protocol_id INT NOT NULL,
  section_id VARCHAR(36) NOT NULL,
  order_index INT NOT NULL,
  PRIMARY KEY (protocol_id, section_id),
  FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- Component usage records for analytics
CREATE TABLE IF NOT EXISTS component_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  component_type ENUM('sensor', 'subsection', 'section', 'protocol') NOT NULL,
  component_id VARCHAR(36) NOT NULL,
  use_count INT DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES access_passwords(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id, component_type, component_id)
);

-- Insert default sensors
INSERT INTO sensors (id, name, category, is_custom) VALUES
  ('sensor-001', 'Heart Rate Monitor', 'Cardiovascular', FALSE),
  ('sensor-002', 'Temperature Sensor', 'Environmental', FALSE),
  ('sensor-003', 'Accelerometer', 'Motion', FALSE),
  ('sensor-004', 'EEG', 'Neurological', FALSE),
  ('sensor-005', 'EMG', 'Muscular', FALSE),
  ('sensor-006', 'Blood Pressure Monitor', 'Cardiovascular', FALSE),
  ('sensor-007', 'Glucose Monitor', 'Metabolic', FALSE),
  ('sensor-008', 'Pulse Oximeter', 'Respiratory', FALSE),
  ('sensor-009', 'Gyroscope', 'Motion', FALSE),
  ('sensor-010', 'GPS', 'Location', FALSE);

-- Insert some sample subsections
INSERT INTO subsections (id, title, time, description, type, is_public) VALUES
  ('subsection-001', 'Warm-up', 300, 'Initial preparation phase', 'subsection', TRUE),
  ('subsection-002', 'Rest Period', 180, 'Recovery break', 'break', TRUE),
  ('subsection-003', 'Baseline Measurement', 120, 'Initial readings', 'subsection', TRUE),
  ('subsection-004', 'Cool Down', 600, 'Final relaxation phase', 'subsection', TRUE);

-- Insert some sample sections
INSERT INTO sections (id, title, description, is_public) VALUES
  ('section-001', 'Pre-Exercise Protocol', 'Preparation before main activity', TRUE),
  ('section-002', 'Main Exercise Phase', 'Primary activity period', TRUE),
  ('section-003', 'Recovery Protocol', 'Post-exercise monitoring', TRUE);
