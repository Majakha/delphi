// Database query functions for MySQL database

// ==================== ACCESS PASSWORDS ====================

const getAllUsers = () => {
  return `SELECT id, username, email, created_at FROM access_passwords ORDER BY created_at DESC`;
};

const getUserById = (userId) => {
  return `SELECT id, username, email, created_at FROM access_passwords WHERE id = ${userId}`;
};

const getUserByCredentials = (password) => {
  return `SELECT id, username, email FROM access_passwords WHERE password = '${password}'`;
};

const createUser = (username, email, password) => {
  return `INSERT INTO access_passwords (username, email, password) VALUES ('${username}', '${email}', '${password}')`;
};

const updateUser = (userId, username, email) => {
  return `UPDATE access_passwords SET username = '${username}', email = '${email}' WHERE id = ${userId}`;
};

const deleteUser = (userId) => {
  return `DELETE FROM access_passwords WHERE id = ${userId}`;
};

// ==================== ACCESS TOKENS ====================

const getTokenByValue = (token) => {
  return `SELECT * FROM access_tokens WHERE token = '${token}' AND expires_at > NOW()`;
};

const getTokensByUserId = (userId) => {
  return `SELECT * FROM access_tokens WHERE user_id = ${userId} ORDER BY created_at DESC`;
};

const createToken = (userId, token, expiresAt) => {
  return `INSERT INTO access_tokens (user_id, token, expires_at) VALUES (${userId}, '${token}', '${expiresAt}')`;
};

const deleteToken = (token) => {
  return `DELETE FROM access_tokens WHERE token = '${token}'`;
};

const deleteExpiredTokens = () => {
  return `DELETE FROM access_tokens WHERE expires_at <= NOW()`;
};

const deleteUserTokens = (userId) => {
  return `DELETE FROM access_tokens WHERE user_id = ${userId}`;
};

// ==================== SENSORS ====================

const getAllSensors = () => {
  return `SELECT * FROM sensors ORDER BY name`;
};

const getSensorById = (sensorId) => {
  return `SELECT * FROM sensors WHERE id = '${sensorId}'`;
};

const getSensorsByCategory = (category) => {
  return `SELECT * FROM sensors WHERE category = '${category}' ORDER BY name`;
};

const getCustomSensorsByUser = (userId) => {
  return `SELECT * FROM sensors WHERE is_custom = TRUE AND created_by = ${userId} ORDER BY name`;
};

const getPublicSensors = () => {
  return `SELECT * FROM sensors WHERE is_custom = FALSE ORDER BY category, name`;
};

const createSensor = (id, name, category, isCustom, createdBy) => {
  return `INSERT INTO sensors (id, name, category, is_custom, created_by) VALUES ('${id}', '${name}', '${category}', ${isCustom}, ${createdBy})`;
};

const updateSensor = (sensorId, name, category) => {
  return `UPDATE sensors SET name = '${name}', category = '${category}', updated_at = NOW() WHERE id = '${sensorId}'`;
};

const deleteSensor = (sensorId) => {
  return `DELETE FROM sensors WHERE id = '${sensorId}'`;
};

// ==================== SUBSECTIONS ====================

const getAllSubsections = () => {
  return `SELECT * FROM subsections ORDER BY created_at DESC`;
};

const getSubsectionById = (subsectionId) => {
  return `SELECT * FROM subsections WHERE id = '${subsectionId}'`;
};

const getSubsectionsByUser = (userId) => {
  return `SELECT * FROM subsections WHERE created_by = ${userId} ORDER BY created_at DESC`;
};

const getPublicSubsections = () => {
  return `SELECT * FROM subsections WHERE is_public = TRUE ORDER BY title`;
};

const getSubsectionsByType = (type) => {
  return `SELECT * FROM subsections WHERE type = '${type}' ORDER BY title`;
};

const getEnabledSubsections = () => {
  return `SELECT * FROM subsections WHERE enabled = TRUE ORDER BY title`;
};

const createSubsection = (
  id,
  title,
  time,
  rating,
  description,
  additionalNotes,
  type,
  createdBy,
  isPublic,
) => {
  const ratingValue = rating ? `${rating}` : "NULL";
  const notesValue = additionalNotes ? `'${additionalNotes}'` : "NULL";
  const createdByValue = createdBy ? `${createdBy}` : "NULL";
  return `INSERT INTO subsections (id, title, time, rating, description, additional_notes, type, created_by, is_public) VALUES ('${id}', '${title}', ${time}, ${ratingValue}, '${description}', ${notesValue}, '${type}', ${createdByValue}, ${isPublic})`;
};

const updateSubsection = (
  subsectionId,
  title,
  time,
  rating,
  description,
  additionalNotes,
  enabled,
) => {
  const ratingValue = rating ? `${rating}` : "NULL";
  const notesValue = additionalNotes ? `'${additionalNotes}'` : "NULL";
  return `UPDATE subsections SET title = '${title}', time = ${time}, rating = ${ratingValue}, description = '${description}', additional_notes = ${notesValue}, enabled = ${enabled}, updated_at = NOW() WHERE id = '${subsectionId}'`;
};

const deleteSubsection = (subsectionId) => {
  return `DELETE FROM subsections WHERE id = '${subsectionId}'`;
};

// ==================== SECTIONS ====================

const getAllSections = () => {
  return `SELECT * FROM sections ORDER BY created_at DESC`;
};

const getSectionById = (sectionId) => {
  return `SELECT * FROM sections WHERE id = '${sectionId}'`;
};

const getSectionsByUser = (userId) => {
  return `SELECT * FROM sections WHERE created_by = ${userId} ORDER BY created_at DESC`;
};

const getPublicSections = () => {
  return `SELECT * FROM sections WHERE is_public = TRUE ORDER BY title`;
};

const getEnabledSections = () => {
  return `SELECT * FROM sections WHERE enabled = TRUE ORDER BY title`;
};

const createSection = (id, title, description, createdBy, isPublic) => {
  const createdByValue = createdBy ? `${createdBy}` : "NULL";
  return `INSERT INTO sections (id, title, description, created_by, is_public) VALUES ('${id}', '${title}', '${description}', ${createdByValue}, ${isPublic})`;
};

const updateSection = (sectionId, title, description, enabled) => {
  return `UPDATE sections SET title = '${title}', description = '${description}', enabled = ${enabled}, updated_at = NOW() WHERE id = '${sectionId}'`;
};

const deleteSection = (sectionId) => {
  return `DELETE FROM sections WHERE id = '${sectionId}'`;
};

// ==================== PROTOCOLS ====================

const getAllProtocols = () => {
  return `SELECT * FROM protocols ORDER BY created_at DESC`;
};

const getProtocolById = (protocolId) => {
  return `SELECT * FROM protocols WHERE id = ${protocolId}`;
};

const getProtocolsByUser = (userId) => {
  return `SELECT * FROM protocols WHERE created_by = ${userId} ORDER BY created_at DESC`;
};

const getProtocolByName = (name, userId) => {
  return `SELECT * FROM protocols WHERE name = '${name}' AND created_by = ${userId}`;
};

const createProtocol = (name, createdBy) => {
  return `INSERT INTO protocols (name, created_by) VALUES ('${name}', ${createdBy})`;
};

const updateProtocol = (protocolId, name) => {
  return `UPDATE protocols SET name = '${name}', updated_at = NOW() WHERE id = ${protocolId}`;
};

const deleteProtocol = (protocolId) => {
  return `DELETE FROM protocols WHERE id = ${protocolId}`;
};

// ==================== SUBSECTION SENSORS (Many-to-Many) ====================

const getSubsectionSensors = (subsectionId) => {
  return `SELECT s.* FROM sensors s
          JOIN subsection_sensors ss ON s.id = ss.sensor_id
          WHERE ss.subsection_id = '${subsectionId}'
          ORDER BY s.name`;
};

const getSensorSubsections = (sensorId) => {
  return `SELECT sub.* FROM subsections sub
          JOIN subsection_sensors ss ON sub.id = ss.subsection_id
          WHERE ss.sensor_id = '${sensorId}'
          ORDER BY sub.title`;
};

const addSensorToSubsection = (subsectionId, sensorId) => {
  return `INSERT IGNORE INTO subsection_sensors (subsection_id, sensor_id) VALUES ('${subsectionId}', '${sensorId}')`;
};

const removeSensorFromSubsection = (subsectionId, sensorId) => {
  return `DELETE FROM subsection_sensors WHERE subsection_id = '${subsectionId}' AND sensor_id = '${sensorId}'`;
};

const removeAllSensorsFromSubsection = (subsectionId) => {
  return `DELETE FROM subsection_sensors WHERE subsection_id = '${subsectionId}'`;
};

// ==================== SECTION SUBSECTIONS (Many-to-Many with Ordering) ====================

const getSectionSubsections = (sectionId) => {
  return `SELECT sub.*, ss.order_index FROM subsections sub
          JOIN section_subsections ss ON sub.id = ss.subsection_id
          WHERE ss.section_id = '${sectionId}'
          ORDER BY ss.order_index`;
};

const getSubsectionSections = (subsectionId) => {
  return `SELECT sec.*, ss.order_index FROM sections sec
          JOIN section_subsections ss ON sec.id = ss.section_id
          WHERE ss.subsection_id = '${subsectionId}'
          ORDER BY sec.title`;
};

const addSubsectionToSection = (sectionId, subsectionId, orderIndex) => {
  return `INSERT INTO section_subsections (section_id, subsection_id, order_index) VALUES ('${sectionId}', '${subsectionId}', ${orderIndex}) ON DUPLICATE KEY UPDATE order_index = ${orderIndex}`;
};

const removeSubsectionFromSection = (sectionId, subsectionId) => {
  return `DELETE FROM section_subsections WHERE section_id = '${sectionId}' AND subsection_id = '${subsectionId}'`;
};

const removeAllSubsectionsFromSection = (sectionId) => {
  return `DELETE FROM section_subsections WHERE section_id = '${sectionId}'`;
};

const updateSubsectionOrder = (sectionId, subsectionId, newOrderIndex) => {
  return `UPDATE section_subsections SET order_index = ${newOrderIndex} WHERE section_id = '${sectionId}' AND subsection_id = '${subsectionId}'`;
};

// ==================== PROTOCOL SECTIONS (Many-to-Many with Ordering) ====================

const getProtocolSections = (protocolId) => {
  return `SELECT sec.*, ps.order_index FROM sections sec
          JOIN protocol_sections ps ON sec.id = ps.section_id
          WHERE ps.protocol_id = ${protocolId}
          ORDER BY ps.order_index`;
};

const getSectionProtocols = (sectionId) => {
  return `SELECT p.*, ps.order_index FROM protocols p
          JOIN protocol_sections ps ON p.id = ps.protocol_id
          WHERE ps.section_id = '${sectionId}'
          ORDER BY p.name`;
};

const addSectionToProtocol = (protocolId, sectionId, orderIndex) => {
  return `INSERT INTO protocol_sections (protocol_id, section_id, order_index) VALUES (${protocolId}, '${sectionId}', ${orderIndex}) ON DUPLICATE KEY UPDATE order_index = ${orderIndex}`;
};

const removeSectionFromProtocol = (protocolId, sectionId) => {
  return `DELETE FROM protocol_sections WHERE protocol_id = ${protocolId} AND section_id = '${sectionId}'`;
};

const removeAllSectionsFromProtocol = (protocolId) => {
  return `DELETE FROM protocol_sections WHERE protocol_id = ${protocolId}`;
};

const updateSectionOrder = (protocolId, sectionId, newOrderIndex) => {
  return `UPDATE protocol_sections SET order_index = ${newOrderIndex} WHERE protocol_id = ${protocolId} AND section_id = '${sectionId}'`;
};

// ==================== COMPONENT USAGE ====================

const getComponentUsage = (userId) => {
  return `SELECT * FROM component_usage WHERE user_id = ${userId} ORDER BY last_used DESC`;
};

const getComponentUsageByType = (userId, componentType) => {
  return `SELECT * FROM component_usage WHERE user_id = ${userId} AND component_type = '${componentType}' ORDER BY use_count DESC, last_used DESC`;
};

const getMostUsedComponents = (userId, limit = 10) => {
  return `SELECT * FROM component_usage WHERE user_id = ${userId} ORDER BY use_count DESC, last_used DESC LIMIT ${limit}`;
};

const incrementComponentUsage = (userId, componentType, componentId) => {
  return `INSERT INTO component_usage (user_id, component_type, component_id, use_count, last_used)
          VALUES (${userId}, '${componentType}', '${componentId}', 1, NOW())
          ON DUPLICATE KEY UPDATE use_count = use_count + 1, last_used = NOW()`;
};

const resetComponentUsage = (userId, componentType, componentId) => {
  return `DELETE FROM component_usage WHERE user_id = ${userId} AND component_type = '${componentType}' AND component_id = '${componentId}'`;
};

const resetAllUserUsage = (userId) => {
  return `DELETE FROM component_usage WHERE user_id = ${userId}`;
};

// ==================== COMPLEX QUERIES ====================

// Get full protocol structure with sections and subsections
const getFullProtocol = (protocolId) => {
  return `SELECT
            p.id as protocol_id, p.name as protocol_name,
            sec.id as section_id, sec.title as section_title, sec.description as section_description,
            ps.order_index as section_order,
            sub.id as subsection_id, sub.title as subsection_title, sub.time, sub.rating, sub.type,
            ss.order_index as subsection_order
          FROM protocols p
          LEFT JOIN protocol_sections ps ON p.id = ps.protocol_id
          LEFT JOIN sections sec ON ps.section_id = sec.id AND sec.enabled = TRUE
          LEFT JOIN section_subsections ss ON sec.id = ss.section_id
          LEFT JOIN subsections sub ON ss.subsection_id = sub.id AND sub.enabled = TRUE
          WHERE p.id = ${protocolId}
          ORDER BY ps.order_index, ss.order_index`;
};

// Get subsection with all sensors
const getSubsectionWithSensors = (subsectionId) => {
  return `SELECT
            sub.*,
            s.id as sensor_id, s.name as sensor_name, s.category as sensor_category
          FROM subsections sub
          LEFT JOIN subsection_sensors ss ON sub.id = ss.subsection_id
          LEFT JOIN sensors s ON ss.sensor_id = s.id
          WHERE sub.id = '${subsectionId}'`;
};

// Search functions
const searchSensors = (searchTerm) => {
  return `SELECT * FROM sensors WHERE name LIKE '%${searchTerm}%' OR category LIKE '%${searchTerm}%' ORDER BY name`;
};

const searchSubsections = (searchTerm) => {
  return `SELECT * FROM subsections WHERE title LIKE '%${searchTerm}%' OR description LIKE '%${searchTerm}%' ORDER BY title`;
};

const searchSections = (searchTerm) => {
  return `SELECT * FROM sections WHERE title LIKE '%${searchTerm}%' OR description LIKE '%${searchTerm}%' ORDER BY title`;
};

const searchProtocols = (searchTerm) => {
  return `SELECT * FROM protocols WHERE name LIKE '%${searchTerm}%' ORDER BY name`;
};

module.exports = {
  // User functions
  getAllUsers,
  getUserById,
  getUserByCredentials,
  createUser,
  updateUser,
  deleteUser,

  // Token functions
  getTokenByValue,
  getTokensByUserId,
  createToken,
  deleteToken,
  deleteExpiredTokens,
  deleteUserTokens,

  // Sensor functions
  getAllSensors,
  getSensorById,
  getSensorsByCategory,
  getCustomSensorsByUser,
  getPublicSensors,
  createSensor,
  updateSensor,
  deleteSensor,

  // Subsection functions
  getAllSubsections,
  getSubsectionById,
  getSubsectionsByUser,
  getPublicSubsections,
  getSubsectionsByType,
  getEnabledSubsections,
  createSubsection,
  updateSubsection,
  deleteSubsection,

  // Section functions
  getAllSections,
  getSectionById,
  getSectionsByUser,
  getPublicSections,
  getEnabledSections,
  createSection,
  updateSection,
  deleteSection,

  // Protocol functions
  getAllProtocols,
  getProtocolById,
  getProtocolsByUser,
  getProtocolByName,
  createProtocol,
  updateProtocol,
  deleteProtocol,

  // Relationship functions
  getSubsectionSensors,
  getSensorSubsections,
  addSensorToSubsection,
  removeSensorFromSubsection,
  removeAllSensorsFromSubsection,
  getSectionSubsections,
  getSubsectionSections,
  addSubsectionToSection,
  removeSubsectionFromSection,
  removeAllSubsectionsFromSection,
  updateSubsectionOrder,
  getProtocolSections,
  getSectionProtocols,
  addSectionToProtocol,
  removeSectionFromProtocol,
  removeAllSectionsFromProtocol,
  updateSectionOrder,

  // Component usage functions
  getComponentUsage,
  getComponentUsageByType,
  getMostUsedComponents,
  incrementComponentUsage,
  resetComponentUsage,
  resetAllUserUsage,

  // Complex query functions
  getFullProtocol,
  getSubsectionWithSensors,

  // Search functions
  searchSensors,
  searchSubsections,
  searchSections,
  searchProtocols,
};
