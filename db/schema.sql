-- Database schema initialization
-- Database and user are automatically created by MySQL Docker environment variables

-- User authentication
CREATE TABLE IF NOT EXISTS access_passwords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES access_passwords(id) ON DELETE CASCADE,
  UNIQUE KEY (token),
  INDEX idx_user_token (user_id),
  INDEX idx_expires (expires_at)
);

-- Sensors (globally defined)
CREATE TABLE IF NOT EXISTS sensors (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES access_passwords(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_created_by (created_by)
);

-- Domains (globally defined categorical grouping of tasks)
CREATE TABLE IF NOT EXISTS domains (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES access_passwords(id) ON DELETE SET NULL,
  INDEX idx_created_by (created_by)
);

-- Tasks (globally defined, immutable templates)
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  time INT,
  rating FLOAT,
  description TEXT,
  additional_notes TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  type ENUM('task','break') DEFAULT 'task',
  is_custom BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES access_passwords(id) ON DELETE SET NULL,
  INDEX idx_type (type),
  INDEX idx_enabled (enabled),
  INDEX idx_created_by (created_by)
);

-- Global Task-Sensor relationship (many-to-many)
CREATE TABLE IF NOT EXISTS task_sensors (
  task_id VARCHAR(36) NOT NULL,
  sensor_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (task_id, sensor_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

-- Global Task-Domain relationship (many-to-many)
CREATE TABLE IF NOT EXISTS task_domains (
  task_id VARCHAR(36) NOT NULL,
  domain_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (task_id, domain_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

-- Protocols (user-owned collections of tasks)
CREATE TABLE IF NOT EXISTS protocols (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  template_protocol_id VARCHAR(36),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES access_passwords(id) ON DELETE CASCADE,
  FOREIGN KEY (template_protocol_id) REFERENCES protocols(id) ON DELETE SET NULL,
  UNIQUE KEY unique_protocol_per_user (created_by, name),
  INDEX idx_created_by (created_by),
  INDEX idx_template (is_template),
  INDEX idx_template_protocol (template_protocol_id)
);

-- Protocol-Task relationship with user-specific overrides
CREATE TABLE IF NOT EXISTS protocol_tasks (
  id VARCHAR(36) PRIMARY KEY,
  protocol_id VARCHAR(36) NOT NULL,
  task_id VARCHAR(36) NOT NULL,
  order_index INT NOT NULL,
  importance_rating FLOAT,
  notes TEXT,
  -- User-specific overrides for task properties
  override_title VARCHAR(255),
  override_time INT,
  override_description TEXT,
  override_additional_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_task_per_protocol (protocol_id, task_id),
  UNIQUE KEY unique_order_per_protocol (protocol_id, order_index),
  INDEX idx_protocol (protocol_id),
  INDEX idx_task (task_id),
  INDEX idx_order (order_index)
);

-- Protocol-specific Task-Sensor relationships
CREATE TABLE IF NOT EXISTS protocol_task_sensors (
  protocol_task_id VARCHAR(36) NOT NULL,
  sensor_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (protocol_task_id, sensor_id),
  FOREIGN KEY (protocol_task_id) REFERENCES protocol_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

-- Protocol-specific Task-Domain relationships
CREATE TABLE IF NOT EXISTS protocol_task_domains (
  protocol_task_id VARCHAR(36) NOT NULL,
  domain_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (protocol_task_id, domain_id),
  FOREIGN KEY (protocol_task_id) REFERENCES protocol_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

-- Component usage for analytics
CREATE TABLE IF NOT EXISTS component_usage (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  component_type ENUM('sensor', 'task', 'domain', 'protocol') NOT NULL,
  component_id VARCHAR(36) NOT NULL,
  use_count INT DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES access_passwords(id) ON DELETE CASCADE,
  UNIQUE KEY unique_usage_per_user (user_id, component_type, component_id),
  INDEX idx_user_component (user_id, component_type),
  INDEX idx_last_used (last_used)
);

-- Modification tracking for analytics
CREATE TABLE IF NOT EXISTS modification_tracking (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  protocol_task_id VARCHAR(36) NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  original_value TEXT,
  modified_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES access_passwords(id) ON DELETE CASCADE,
  FOREIGN KEY (protocol_task_id) REFERENCES protocol_tasks(id) ON DELETE CASCADE,
  INDEX idx_user_modifications (user_id),
  INDEX idx_protocol_task_modifications (protocol_task_id)
);

-- Insert default sensors
INSERT INTO sensors (id, name, category, description, is_custom) VALUES
  ('sensor-001', 'Heart Rate Monitor', 'Cardiovascular', 'Monitors heart rate in beats per minute', FALSE),
  ('sensor-002', 'Temperature Sensor', 'Environmental', 'Measures ambient or body temperature', FALSE),
  ('sensor-003', 'Accelerometer', 'Motion', 'Detects acceleration and movement patterns', FALSE),
  ('sensor-004', 'EEG', 'Neurological', 'Electroencephalography for brain activity', FALSE),
  ('sensor-005', 'EMG', 'Muscular', 'Electromyography for muscle activity', FALSE),
  ('sensor-006', 'Blood Pressure Monitor', 'Cardiovascular', 'Measures systolic and diastolic pressure', FALSE),
  ('sensor-007', 'Glucose Monitor', 'Metabolic', 'Monitors blood glucose levels', FALSE),
  ('sensor-008', 'Pulse Oximeter', 'Respiratory', 'Measures oxygen saturation in blood', FALSE),
  ('sensor-009', 'Gyroscope', 'Motion', 'Detects rotational movement and orientation', FALSE),
  ('sensor-010', 'GPS', 'Location', 'Global positioning and movement tracking', FALSE);

-- Insert default domains
INSERT INTO domains (id, name, description, is_custom) VALUES
  ('domain-001', 'Preparation', 'Pre-task setup and warm-up activities', FALSE),
  ('domain-002', 'Exercise', 'Main activity and workload tasks', FALSE),
  ('domain-003', 'Recovery', 'Post-task cooldown and relaxation', FALSE),
  ('domain-004', 'Assessment', 'Measurement and evaluation tasks', FALSE),
  ('domain-005', 'Break', 'Rest periods and intermissions', FALSE);

-- Insert default tasks
INSERT INTO tasks (id, title, time, description, type, is_custom) VALUES
  ('task-001', 'Warm-up', 5, 'Initial preparation phase to ready the body', 'task', FALSE),
  ('task-002', 'Rest Period', 3, 'Recovery break between activities', 'break', FALSE),
  ('task-003', 'Baseline Measurement', 2, 'Initial readings and assessments', 'task', FALSE),
  ('task-004', 'Cool Down', 10, 'Final relaxation phase', 'task', FALSE),
  ('task-005', 'Main Exercise', 20, 'Primary workout or activity phase', 'task', FALSE),
  ('task-006', 'Monitoring Check', 1, 'Quick sensor and vital sign check', 'task', FALSE);

-- Map tasks to domains (global defaults)
INSERT INTO task_domains (task_id, domain_id) VALUES
  ('task-001', 'domain-001'), -- Warm-up -> Preparation
  ('task-002', 'domain-005'), -- Rest Period -> Break
  ('task-003', 'domain-004'), -- Baseline Measurement -> Assessment
  ('task-004', 'domain-003'), -- Cool Down -> Recovery
  ('task-005', 'domain-002'), -- Main Exercise -> Exercise
  ('task-006', 'domain-004'); -- Monitoring Check -> Assessment

-- Map tasks to sensors (global defaults)
INSERT INTO task_sensors (task_id, sensor_id) VALUES
  ('task-001', 'sensor-001'), -- Warm-up -> Heart Rate
  ('task-001', 'sensor-002'), -- Warm-up -> Temperature
  ('task-003', 'sensor-001'), -- Baseline -> Heart Rate
  ('task-003', 'sensor-006'), -- Baseline -> Blood Pressure
  ('task-003', 'sensor-008'), -- Baseline -> Pulse Oximeter
  ('task-004', 'sensor-001'), -- Cool Down -> Heart Rate
  ('task-005', 'sensor-001'), -- Main Exercise -> Heart Rate
  ('task-005', 'sensor-003'), -- Main Exercise -> Accelerometer
  ('task-005', 'sensor-009'), -- Main Exercise -> Gyroscope
  ('task-006', 'sensor-001'); -- Monitoring -> Heart Rate

-- Add sample users (passwords should be properly hashed in production)
INSERT INTO access_passwords (username, email, password_hash) VALUES
  ('testuser1', 'test1@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'), -- password: password
  ('testuser2', 'test2@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('alpha', 'alpha@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('beta', 'beta@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Create a default template protocol
INSERT INTO protocols (id, name, description, is_template, created_by) VALUES
  ('protocol-template-001', 'Basic Exercise Protocol', 'Standard template for exercise sessions', TRUE, 1);

-- Add tasks to the template protocol
INSERT INTO protocol_tasks (id, protocol_id, task_id, order_index, importance_rating) VALUES
  ('pt-001', 'protocol-template-001', 'task-003', 1, 5.0), -- Baseline first
  ('pt-002', 'protocol-template-001', 'task-001', 2, 4.0), -- Warm-up second
  ('pt-003', 'protocol-template-001', 'task-005', 3, 5.0), -- Main exercise third
  ('pt-004', 'protocol-template-001', 'task-002', 4, 3.0), -- Rest period fourth
  ('pt-005', 'protocol-template-001', 'task-004', 5, 4.0), -- Cool down last
  ('pt-006', 'protocol-template-001', 'task-006', 6, 3.0); -- Final monitoring

-- Copy default sensor associations to protocol-specific associations
INSERT INTO protocol_task_sensors (protocol_task_id, sensor_id)
SELECT pt.id, ts.sensor_id
FROM protocol_tasks pt
JOIN task_sensors ts ON pt.task_id = ts.task_id
WHERE pt.protocol_id = 'protocol-template-001';

-- Copy default domain associations to protocol-specific associations
INSERT INTO protocol_task_domains (protocol_task_id, domain_id)
SELECT pt.id, td.domain_id
FROM protocol_tasks pt
JOIN task_domains td ON pt.task_id = td.task_id
WHERE pt.protocol_id = 'protocol-template-001';
