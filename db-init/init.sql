-- db-init/init.sql

CREATE DATABASE IF NOT EXISTS mydatabase;

USE mydatabase;

CREATE TABLE IF NOT EXISTS access_passwords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  password VARCHAR(255) NOT NULL UNIQUE
);

-- Add initial passwords
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

-- Create table for protocol data
CREATE TABLE IF NOT EXISTS protocols (
  id INT AUTO_INCREMENT PRIMARY KEY,
  password_id INT NOT NULL,
  protocol_id VARCHAR(255) NOT NULL,
  protocol_name VARCHAR(255) NOT NULL,
  protocol_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (password_id) REFERENCES access_passwords(id) ON DELETE CASCADE,
  UNIQUE KEY unique_protocol_per_user (password_id, protocol_id)
);
