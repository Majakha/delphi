const express = require('express');
const router = express.Router();
const { executeAuthQuery, executeAuthQueryOne, executeAuthInsert, executeAuthUpdate, requireAuth } = require('../authDB.js');
const {
  getAllProtocols,
  getProtocolById,
  getProtocolsByUser,
  getProtocolByName,
  createProtocol,
  updateProtocol,
  deleteProtocol,
  searchProtocols,
  getProtocolSections,
  addSectionToProtocol,
  removeSectionFromProtocol,
  removeAllSectionsFromProtocol,
  updateSectionOrder,
  getFullProtocol
} = require('../queries.js');

// Get all protocols
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = getAllProtocols();
    const protocols = await executeAuthQuery(query, [], req.token);
    res.json(protocols);
  } catch (error) {
    console.error('Error fetching protocols:', error);
    res.status(500).json({ error: 'Failed to fetch protocols' });
  }
});

// Get user's protocols
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { getUserContext } = require('../authDB.js');
    const userContext = getUserContext(req.token);

    const query = getProtocolsByUser(userContext.userId);
    const protocols = await executeAuthQuery(query, [], req.token);
    res.json(protocols);
  } catch (error) {
    console.error('Error fetching user protocols:', error);
    res.status(500).json({ error: 'Failed to fetch user protocols' });
  }
});

// Search protocols
router.get('/search/:term', requireAuth, async (req, res) => {
  try {
    const query = searchProtocols(req.params.term);
    const protocols = await executeAuthQuery(query, [], req.token);
    res.json(protocols);
  } catch (error) {
    console.error('Error searching protocols:', error);
    res.status(500).json({ error: 'Failed to search protocols' });
  }
});

// Get protocol by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const query = getProtocolById(req.params.id);
    const protocol = await executeAuthQueryOne(query, [], req.token);

    if (!protocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    res.json(protocol);
  } catch (error) {
    console.error('Error fetching protocol:', error);
    res.status(500).json({ error: 'Failed to fetch protocol' });
  }
});

// Get full protocol with sections and subsections
router.get('/:id/full', requireAuth, async (req, res) => {
  try {
    const query = getFullProtocol(req.params.id);
    const result = await executeAuthQuery(query, [], req.token);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    // Structure the nested data
    const protocol = {
      id: result[0].protocol_id,
      name: result[0].protocol_name,
      sections: []
    };

    // Group sections and subsections
    const sectionsMap = new Map();

    result.forEach(row => {
      if (row.section_id) {
        if (!sectionsMap.has(row.section_id)) {
          sectionsMap.set(row.section_id, {
            id: row.section_id,
            title: row.section_title,
            description: row.section_description,
            order: row.section_order,
            subsections: []
          });
        }

        if (row.subsection_id) {
          const section = sectionsMap.get(row.section_id);
          const existingSubsection = section.subsections.find(sub => sub.id === row.subsection_id);

          if (!existingSubsection) {
            section.subsections.push({
              id: row.subsection_id,
              title: row.subsection_title,
              time: row.time,
              rating: row.rating,
              type: row.type,
              order: row.subsection_order
            });
          }
        }
      }
    });

    // Sort and add to protocol
    protocol.sections = Array.from(sectionsMap.values())
      .sort((a, b) => a.order - b.order)
      .map(section => ({
        ...section,
        subsections: section.subsections.sort((a, b) => a.order - b.order)
      }));

    res.json(protocol);
  } catch (error) {
    console.error('Error fetching full protocol:', error);
    res.status(500).json({ error: 'Failed to fetch full protocol' });
  }
});

// Get protocol sections
router.get('/:id/sections', requireAuth, async (req, res) => {
  try {
    const query = getProtocolSections(req.params.id);
    const sections = await executeAuthQuery(query, [], req.token);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching protocol sections:', error);
    res.status(500).json({ error: 'Failed to fetch protocol sections' });
  }
});

// Create new protocol
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Protocol name is required' });
    }

    const { getUserContext } = require('../authDB.js');
    const userContext = getUserContext(req.token);

    // Check if protocol with same name already exists for user
    const existingQuery = getProtocolByName(name, userContext.userId);
    const existing = await executeAuthQueryOne(existingQuery, [], req.token);

    if (existing) {
      return res.status(409).json({ error: 'Protocol with this name already exists' });
    }

    const query = createProtocol(name, userContext.userId);
    const protocolId = await executeAuthInsert(query, [], req.token);

    // Return the created protocol
    const createdProtocol = await executeAuthQueryOne(getProtocolById(protocolId), [], req.token);
    res.status(201).json(createdProtocol);
  } catch (error) {
    console.error('Error creating protocol:', error);
    res.status(500).json({ error: 'Failed to create protocol' });
  }
});

// Update protocol
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const protocolId = req.params.id;

    if (!name) {
      return res.status(400).json({ error: 'Protocol name is required' });
    }

    // Check if protocol exists
    const existingProtocol = await executeAuthQueryOne(getProtocolById(protocolId), [], req.token);
    if (!existingProtocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    const query = updateProtocol(protocolId, name);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    // Return updated protocol
    const updatedProtocol = await executeAuthQueryOne(getProtocolById(protocolId), [], req.token);
    res.json(updatedProtocol);
  } catch (error) {
    console.error('Error updating protocol:', error);
    res.status(500).json({ error: 'Failed to update protocol' });
  }
});

// Delete protocol
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const protocolId = req.params.id;

    // Check if protocol exists
    const existingProtocol = await executeAuthQueryOne(getProtocolById(protocolId), [], req.token);
    if (!existingProtocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    const query = deleteProtocol(protocolId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    res.json({ message: 'Protocol deleted successfully' });
  } catch (error) {
    console.error('Error deleting protocol:', error);
    res.status(500).json({ error: 'Failed to delete protocol' });
  }
});

// Add section to protocol
router.post('/:id/sections/:sectionId', requireAuth, async (req, res) => {
  try {
    const { id: protocolId, sectionId } = req.params;
    const { orderIndex = 0 } = req.body;

    // Check if protocol exists
    const existingProtocol = await executeAuthQueryOne(getProtocolById(protocolId), [], req.token);
    if (!existingProtocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    const query = addSectionToProtocol(protocolId, sectionId, orderIndex);
    await executeAuthUpdate(query, [], req.token);

    res.json({ message: 'Section added to protocol successfully' });
  } catch (error) {
    console.error('Error adding section to protocol:', error);
    res.status(500).json({ error: 'Failed to add section to protocol' });
  }
});

// Remove section from protocol
router.delete('/:id/sections/:sectionId', requireAuth, async (req, res) => {
  try {
    const { id: protocolId, sectionId } = req.params;

    const query = removeSectionFromProtocol(protocolId, sectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Section not found in protocol' });
    }

    res.json({ message: 'Section removed from protocol successfully' });
  } catch (error) {
    console.error('Error removing section from protocol:', error);
    res.status(500).json({ error: 'Failed to remove section from protocol' });
  }
});

// Update section order in protocol
router.put('/:id/sections/:sectionId/order', requireAuth, async (req, res) => {
  try {
    const { id: protocolId, sectionId } = req.params;
    const { orderIndex } = req.body;

    if (orderIndex === undefined) {
      return res.status(400).json({ error: 'Order index is required' });
    }

    const query = updateSectionOrder(protocolId, sectionId, orderIndex);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Section not found in protocol' });
    }

    res.json({ message: 'Section order updated successfully' });
  } catch (error) {
    console.error('Error updating section order:', error);
    res.status(500).json({ error: 'Failed to update section order' });
  }
});

// Remove all sections from protocol
router.delete('/:id/sections', requireAuth, async (req, res) => {
  try {
    const protocolId = req.params.id;

    const query = removeAllSectionsFromProtocol(protocolId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    res.json({
      message: 'All sections removed from protocol successfully',
      removedCount: affectedRows
    });
  } catch (error) {
    console.error('Error removing all sections from protocol:', error);
    res.status(500).json({ error: 'Failed to remove all sections from protocol' });
  }
});

module.exports = router;
