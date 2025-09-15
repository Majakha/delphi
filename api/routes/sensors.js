const express = require('express');
const router = express.Router();
const { executeAuthQuery, executeAuthQueryOne, executeAuthInsert, executeAuthUpdate, requireAuth } = require('../authDB.js');
const {
  getAllSensors,
  getSensorById,
  getSensorsByCategory,
  getCustomSensorsByUser,
  getPublicSensors,
  createSensor,
  updateSensor,
  deleteSensor,
  searchSensors
} = require('../queries.js');
const { v4: uuidv4 } = require('uuid');

// Get all sensors
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = getAllSensors();
    const sensors = await executeAuthQuery(query, [], req.token);
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({ error: 'Failed to fetch sensors' });
  }
});

// Get public sensors
router.get('/public', async (req, res) => {
  try {
    const query = getPublicSensors();
    const sensors = await executeAuthQuery(query, [], req.token);
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching public sensors:', error);
    res.status(500).json({ error: 'Failed to fetch public sensors' });
  }
});

// Get sensors by category
router.get('/category/:category', requireAuth, async (req, res) => {
  try {
    const query = getSensorsByCategory(req.params.category);
    const sensors = await executeAuthQuery(query, [], req.token);
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching sensors by category:', error);
    res.status(500).json({ error: 'Failed to fetch sensors by category' });
  }
});

// Get user's custom sensors
router.get('/custom', requireAuth, async (req, res) => {
  try {
    // Extract user ID from token
    const { getUserContext } = require('../authDB.js');
    const userContext = getUserContext(req.token);

    const query = getCustomSensorsByUser(userContext.userId);
    const sensors = await executeAuthQuery(query, [], req.token);
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching custom sensors:', error);
    res.status(500).json({ error: 'Failed to fetch custom sensors' });
  }
});

// Search sensors
router.get('/search/:term', requireAuth, async (req, res) => {
  try {
    const query = searchSensors(req.params.term);
    const sensors = await executeAuthQuery(query, [], req.token);
    res.json(sensors);
  } catch (error) {
    console.error('Error searching sensors:', error);
    res.status(500).json({ error: 'Failed to search sensors' });
  }
});

// Get sensor by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const query = getSensorById(req.params.id);
    const sensor = await executeAuthQueryOne(query, [], req.token);

    if (!sensor) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    res.json(sensor);
  } catch (error) {
    console.error('Error fetching sensor:', error);
    res.status(500).json({ error: 'Failed to fetch sensor' });
  }
});

// Create new sensor
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, category, isCustom = true } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    // Extract user ID from token
    const { getUserContext } = require('../authDB.js');
    const userContext = getUserContext(req.token);

    const sensorId = uuidv4();
    const query = createSensor(sensorId, name, category, isCustom, userContext.userId);

    await executeAuthInsert(query, [], req.token);

    // Return the created sensor
    const createdSensor = await executeAuthQueryOne(getSensorById(sensorId), [], req.token);
    res.status(201).json(createdSensor);
  } catch (error) {
    console.error('Error creating sensor:', error);
    res.status(500).json({ error: 'Failed to create sensor' });
  }
});

// Update sensor
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, category } = req.body;
    const sensorId = req.params.id;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    // Check if sensor exists
    const existingSensor = await executeAuthQueryOne(getSensorById(sensorId), [], req.token);
    if (!existingSensor) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const query = updateSensor(sensorId, name, category);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    // Return updated sensor
    const updatedSensor = await executeAuthQueryOne(getSensorById(sensorId), [], req.token);
    res.json(updatedSensor);
  } catch (error) {
    console.error('Error updating sensor:', error);
    res.status(500).json({ error: 'Failed to update sensor' });
  }
});

// Delete sensor
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const sensorId = req.params.id;

    // Check if sensor exists
    const existingSensor = await executeAuthQueryOne(getSensorById(sensorId), [], req.token);
    if (!existingSensor) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const query = deleteSensor(sensorId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    res.json({ message: 'Sensor deleted successfully' });
  } catch (error) {
    console.error('Error deleting sensor:', error);
    res.status(500).json({ error: 'Failed to delete sensor' });
  }
});

module.exports = router;
