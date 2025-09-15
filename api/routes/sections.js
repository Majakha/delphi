const express = require('express');
const router = express.Router();
const { executeAuthQuery, executeAuthQueryOne, executeAuthInsert, executeAuthUpdate, requireAuth } = require('../authDB.js');
const {
  getAllSections,
  getSectionById,
  getSectionsByUser,
  getPublicSections,
  getEnabledSections,
  createSection,
  updateSection,
  deleteSection,
  searchSections,
  getSectionSubsections,
  addSubsectionToSection,
  removeSubsectionFromSection,
  removeAllSubsectionsFromSection,
  updateSubsectionOrder
} = require('../queries.js');
const { v4: uuidv4 } = require('uuid');

// Get all sections
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = getAllSections();
    const sections = await executeAuthQuery(query, [], req.token);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Get public sections
router.get('/public', requireAuth, async (req, res) => {
  try {
    const query = getPublicSections();
    const sections = await executeAuthQuery(query, [], req.token);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching public sections:', error);
    res.status(500).json({ error: 'Failed to fetch public sections' });
  }
});

// Get enabled sections
router.get('/enabled', requireAuth, async (req, res) => {
  try {
    const query = getEnabledSections();
    const sections = await executeAuthQuery(query, [], req.token);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching enabled sections:', error);
    res.status(500).json({ error: 'Failed to fetch enabled sections' });
  }
});

// Get user's sections
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { getUserContext } = require('../authDB.js');
    const userContext = getUserContext(req.token);

    const query = getSectionsByUser(userContext.userId);
    const sections = await executeAuthQuery(query, [], req.token);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching user sections:', error);
    res.status(500).json({ error: 'Failed to fetch user sections' });
  }
});

// Search sections
router.get('/search/:term', requireAuth, async (req, res) => {
  try {
    const query = searchSections(req.params.term);
    const sections = await executeAuthQuery(query, [], req.token);
    res.json(sections);
  } catch (error) {
    console.error('Error searching sections:', error);
    res.status(500).json({ error: 'Failed to search sections' });
  }
});

// Get section by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const query = getSectionById(req.params.id);
    const section = await executeAuthQueryOne(query, [], req.token);

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(section);
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
});

// Get section with subsections
router.get('/:id/subsections', requireAuth, async (req, res) => {
  try {
    const query = getSectionSubsections(req.params.id);
    const subsections = await executeAuthQuery(query, [], req.token);
    res.json(subsections);
  } catch (error) {
    console.error('Error fetching section subsections:', error);
    res.status(500).json({ error: 'Failed to fetch section subsections' });
  }
});

// Create new section
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, isPublic = false } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const { getUserContext } = require('../authDB.js');
    const userContext = getUserContext(req.token);

    const sectionId = uuidv4();
    const query = createSection(sectionId, title, description, userContext.userId, isPublic);

    await executeAuthInsert(query, [], req.token);

    // Return the created section
    const createdSection = await executeAuthQueryOne(getSectionById(sectionId), [], req.token);
    res.status(201).json(createdSection);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// Update section
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, enabled = true } = req.body;
    const sectionId = req.params.id;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check if section exists
    const existingSection = await executeAuthQueryOne(getSectionById(sectionId), [], req.token);
    if (!existingSection) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const query = updateSection(sectionId, title, description, enabled);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Return updated section
    const updatedSection = await executeAuthQueryOne(getSectionById(sectionId), [], req.token);
    res.json(updatedSection);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Delete section
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const sectionId = req.params.id;

    // Check if section exists
    const existingSection = await executeAuthQueryOne(getSectionById(sectionId), [], req.token);
    if (!existingSection) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const query = deleteSection(sectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// Add subsection to section
router.post('/:id/subsections/:subsectionId', requireAuth, async (req, res) => {
  try {
    const { id: sectionId, subsectionId } = req.params;
    const { orderIndex = 0 } = req.body;

    // Check if section exists
    const existingSection = await executeAuthQueryOne(getSectionById(sectionId), [], req.token);
    if (!existingSection) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const query = addSubsectionToSection(sectionId, subsectionId, orderIndex);
    await executeAuthUpdate(query, [], req.token);

    res.json({ message: 'Subsection added to section successfully' });
  } catch (error) {
    console.error('Error adding subsection to section:', error);
    res.status(500).json({ error: 'Failed to add subsection to section' });
  }
});

// Remove subsection from section
router.delete('/:id/subsections/:subsectionId', requireAuth, async (req, res) => {
  try {
    const { id: sectionId, subsectionId } = req.params;

    const query = removeSubsectionFromSection(sectionId, subsectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Subsection not found in section' });
    }

    res.json({ message: 'Subsection removed from section successfully' });
  } catch (error) {
    console.error('Error removing subsection from section:', error);
    res.status(500).json({ error: 'Failed to remove subsection from section' });
  }
});

// Update subsection order in section
router.put('/:id/subsections/:subsectionId/order', requireAuth, async (req, res) => {
  try {
    const { id: sectionId, subsectionId } = req.params;
    const { orderIndex } = req.body;

    if (orderIndex === undefined) {
      return res.status(400).json({ error: 'Order index is required' });
    }

    const query = updateSubsectionOrder(sectionId, subsectionId, orderIndex);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Subsection not found in section' });
    }

    res.json({ message: 'Subsection order updated successfully' });
  } catch (error) {
    console.error('Error updating subsection order:', error);
    res.status(500).json({ error: 'Failed to update subsection order' });
  }
});

// Remove all subsections from section
router.delete('/:id/subsections', requireAuth, async (req, res) => {
  try {
    const sectionId = req.params.id;

    const query = removeAllSubsectionsFromSection(sectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    res.json({
      message: 'All subsections removed from section successfully',
      removedCount: affectedRows
    });
  } catch (error) {
    console.error('Error removing all subsections from section:', error);
    res.status(500).json({ error: 'Failed to remove all subsections from section' });
  }
});

module.exports = router;
