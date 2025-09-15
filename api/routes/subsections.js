const express = require('express');
const router = express.Router();
const { executeAuthQuery, executeAuthQueryOne, executeAuthInsert, executeAuthUpdate, requireAuth } = require('../authDB.js');
const {
  getAllSubsections,
  getSubsectionById,
  getSubsectionsByUser,
  getPublicSubsections,
  getSubsectionsByType,
  getEnabledSubsections,
  createSubsection,
  updateSubsection,
  deleteSubsection,
  searchSubsections,
  getSubsectionSensors,
  addSensorToSubsection,
  removeSensorFromSubsection,
  removeAllSensorsFromSubsection,
  getSubsectionWithSensors
} = require('../queries.js');
const { v4: uuidv4 } = require('uuid');

// Get all subsections
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = getAllSubsections();
    const subsections = await executeAuthQuery(query, [], req.token);
    res.json(subsections);
  } catch (error) {
    console.error('Error fetching subsections:', error);
    res.status(500).json({ error: 'Failed to fetch subsections' });
  }
});

// Get public subsections
router.get('/public', requireAuth, async (req, res) => {
  try {
    const query = getPublicSubsections();
    const subsections = await executeAuthQuery(query, [], req.token);
    res.json(subsections);
  } catch (error) {
    console.error('Error fetching public subsections:', error);
    res.status(500).json({ error: 'Failed to fetch public subsections' });
  }
});

// Get enabled subsections
router.get('/enabled', requireAuth, async (req, res) => {
  try {
    const query = getEnabledSubsections();
    const subsections = await executeAuthQuery(query, [], req.token);
    res.json(subsections);
  } catch (error) {
    console.error('Error fetching enabled subsections:', error);
    res.status(500).json({ error: 'Failed to fetch enabled subsections' });
  }
});

// Get subsections by type
router.get('/type/:type', requireAuth, async (req, res) => {
  try {
    const { type } = req.params;

    if (!['subsection', 'break'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "subsection" or "break"' });
    }

    const query = getSubsectionsByType(type);
    const subsections = await executeAuthQuery(query, [], req.token);
    res.json(subsections);
  } catch (error) {
    console.error('Error fetching subsections by type:', error);
    res.status(500).json({ error: 'Failed to fetch subsections by type' });
  }
});

// Get user's subsections
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { getUserContext } = require('../authDB.js');
    const userContext = getUserContext(req.token);

    const query = getSubsectionsByUser(userContext.userId);
    const subsections = await executeAuthQuery(query, [], req.token);
    res.json(subsections);
  } catch (error) {
    console.error('Error fetching user subsections:', error);
    res.status(500).json({ error: 'Failed to fetch user subsections' });
  }
});

// Search subsections
router.get('/search/:term', requireAuth, async (req, res) => {
  try {
    const query = searchSubsections(req.params.term);
    const subsections = await executeAuthQuery(query, [], req.token);
    res.json(subsections);
  } catch (error) {
    console.error('Error searching subsections:', error);
    res.status(500).json({ error: 'Failed to search subsections' });
  }
});

// Get subsection by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const query = getSubsectionById(req.params.id);
    const subsection = await executeAuthQueryOne(query, [], req.token);

    if (!subsection) {
      return res.status(404).json({ error: 'Subsection not found' });
    }

    res.json(subsection);
  } catch (error) {
    console.error('Error fetching subsection:', error);
    res.status(500).json({ error: 'Failed to fetch subsection' });
  }
});

// Get subsection with all sensors
router.get('/:id/with-sensors', requireAuth, async (req, res) => {
  try {
    const query = getSubsectionWithSensors(req.params.id);
    const result = await executeAuthQuery(query, [], req.token);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Subsection not found' });
    }

    // Group sensors with subsection data
    const subsection = {
      id: result[0].id,
      title: result[0].title,
      time: result[0].time,
      rating: result[0].rating,
      description: result[0].description,
      additional_notes: result[0].additional_notes,
      enabled: result[0].enabled,
      type: result[0].type,
      created_by: result[0].created_by,
      is_public: result[0].is_public,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      sensors: result.filter(row => row.sensor_id).map(row => ({
        id: row.sensor_id,
        name: row.sensor_name,
        category: row.sensor_category
      }))
    };

    res.json(subsection);
  } catch (error) {
    console.error('Error fetching subsection with sensors:', error);
    res.status(500).json({ error: 'Failed to fetch subsection with sensors' });
  }
});

// Get subsection sensors
router.get('/:id/sensors', requireAuth, async (req, res) => {
  try {
    const query = getSubsectionSensors(req.params.id);
    const sensors = await executeAuthQuery(query, [], req.token);
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching subsection sensors:', error);
    res.status(500).json({ error: 'Failed to fetch subsection sensors' });
  }
});

// Create new subsection
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      time,
      rating,
      description,
      additionalNotes,
      type = 'subsection',
      isPublic = false
    } = req.body;

    if (!title || !time) {
      return res.status(400).json({ error: 'Title and time are required' });
    }

    if (!['subsection', 'break'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "subsection" or "break"' });
    }

    const { getUserContext } = require('../authDB.js');
    const userContext = getUserContext(req.token);

    const subsectionId = uuidv4();
    const query = createSubsection(
      subsectionId,
      title,
      time,
      rating,
      description,
      additionalNotes,
      type,
      userContext.userId,
      isPublic
    );

    await executeAuthInsert(query, [], req.token);

    // Return the created subsection
    const createdSubsection = await executeAuthQueryOne(getSubsectionById(subsectionId), [], req.token);
    res.status(201).json(createdSubsection);
  } catch (error) {
    console.error('Error creating subsection:', error);
    res.status(500).json({ error: 'Failed to create subsection' });
  }
});

// Update subsection
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      title,
      time,
      rating,
      description,
      additionalNotes,
      enabled = true
    } = req.body;
    const subsectionId = req.params.id;

    if (!title || !time) {
      return res.status(400).json({ error: 'Title and time are required' });
    }

    // Check if subsection exists
    const existingSubsection = await executeAuthQueryOne(getSubsectionById(subsectionId), [], req.token);
    if (!existingSubsection) {
      return res.status(404).json({ error: 'Subsection not found' });
    }

    const query = updateSubsection(
      subsectionId,
      title,
      time,
      rating,
      description,
      additionalNotes,
      enabled
    );
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Subsection not found' });
    }

    // Return updated subsection
    const updatedSubsection = await executeAuthQueryOne(getSubsectionById(subsectionId), [], req.token);
    res.json(updatedSubsection);
  } catch (error) {
    console.error('Error updating subsection:', error);
    res.status(500).json({ error: 'Failed to update subsection' });
  }
});

// Delete subsection
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const subsectionId = req.params.id;

    // Check if subsection exists
    const existingSubsection = await executeAuthQueryOne(getSubsectionById(subsectionId), [], req.token);
    if (!existingSubsection) {
      return res.status(404).json({ error: 'Subsection not found' });
    }

    const query = deleteSubsection(subsectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Subsection not found' });
    }

    res.json({ message: 'Subsection deleted successfully' });
  } catch (error) {
    console.error('Error deleting subsection:', error);
    res.status(500).json({ error: 'Failed to delete subsection' });
  }
});

// Add sensor to subsection
router.post('/:id/sensors/:sensorId', requireAuth, async (req, res) => {
  try {
    const { id: subsectionId, sensorId } = req.params;

    // Check if subsection exists
    const existingSubsection = await executeAuthQueryOne(getSubsectionById(subsectionId), [], req.token);
    if (!existingSubsection) {
      return res.status(404).json({ error: 'Subsection not found' });
    }

    const query = addSensorToSubsection(subsectionId, sensorId);
    await executeAuthUpdate(query, [], req.token);

    res.json({ message: 'Sensor added to subsection successfully' });
  } catch (error) {
    console.error('Error adding sensor to subsection:', error);
    res.status(500).json({ error: 'Failed to add sensor to subsection' });
  }
});

// Remove sensor from subsection
router.delete('/:id/sensors/:sensorId', requireAuth, async (req, res) => {
  try {
    const { id: subsectionId, sensorId } = req.params;

    const query = removeSensorFromSubsection(subsectionId, sensorId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Sensor not found in subsection' });
    }

    res.json({ message: 'Sensor removed from subsection successfully' });
  } catch (error) {
    console.error('Error removing sensor from subsection:', error);
    res.status(500).json({ error: 'Failed to remove sensor from subsection' });
  }
});

// Remove all sensors from subsection
router.delete('/:id/sensors', requireAuth, async (req, res) => {
  try {
    const subsectionId = req.params.id;

    const query = removeAllSensorsFromSubsection(subsectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    res.json({
      message: 'All sensors removed from subsection successfully',
      removedCount: affectedRows
    });
  } catch (error) {
    console.error('Error removing all sensors from subsection:', error);
    res.status(500).json({ error: 'Failed to remove all sensors from subsection' });
  }
});

module.exports = router;
