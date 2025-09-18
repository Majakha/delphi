const express = require("express");
const router = express.Router();
const {
  executeAuthQuery,
  executeAuthQueryOne,
  executeAuthInsert,
  executeAuthUpdate,
  requireAuth,
} = require("../authDB.js");
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
  getFullProtocol,
} = require("../queries.js");
const { asyncHandler } = require("../middleware/errorHandler.js");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
} = require("../errors/CustomErrors.js");

// Get all protocols
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getAllProtocols();
    const protocols = await executeAuthQuery(query, [], req.token);
    res.list(protocols, "Protocols retrieved successfully");
  }),
);

// Get user's protocols
router.get(
  "/my",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const query = getProtocolsByUser(userContext.userId);
    const protocols = await executeAuthQuery(query, [], req.token);
    res.list(protocols, "User protocols retrieved successfully");
  }),
);

// Search protocols
router.get(
  "/search/:term",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { term } = req.params;

    if (!term.trim()) {
      throw new ValidationError("Search term is required");
    }

    if (term.length < 2) {
      throw new ValidationError(
        "Search term must be at least 2 characters long",
      );
    }

    const query = searchProtocols(term);
    const protocols = await executeAuthQuery(query, [], req.token);
    res.list(protocols, `Search results for '${term}' retrieved successfully`);
  }),
);

// Get protocol by ID
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    const query = getProtocolById(id);
    const protocol = await executeAuthQueryOne(query, [], req.token);

    if (!protocol) {
      throw new NotFoundError("Protocol");
    }

    res.success(protocol, "Protocol retrieved successfully");
  }),
);

// Get full protocol with sections and subsections
router.get(
  "/:id/full",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    const query = getFullProtocol(id);
    const result = await executeAuthQuery(query, [], req.token);

    if (result.length === 0) {
      throw new NotFoundError("Protocol");
    }

    // Structure the nested data
    const protocol = {
      id: result[0].protocol_id,
      name: result[0].protocol_name,
      sections: [],
    };

    // Group sections and subsections
    const sectionsMap = new Map();

    result.forEach((row) => {
      if (row.section_id) {
        if (!sectionsMap.has(row.section_id)) {
          sectionsMap.set(row.section_id, {
            id: row.section_id,
            title: row.section_title,
            description: row.section_description,
            order: row.section_order,
            subsections: [],
          });
        }

        if (row.subsection_id) {
          const section = sectionsMap.get(row.section_id);
          const existingSubsection = section.subsections.find(
            (sub) => sub.id === row.subsection_id,
          );

          if (!existingSubsection) {
            section.subsections.push({
              id: row.subsection_id,
              title: row.subsection_title,
              time: row.time,
              rating: row.rating,
              type: row.type,
              order: row.subsection_order,
            });
          }
        }
      }
    });

    // Sort and add to protocol
    protocol.sections = Array.from(sectionsMap.values())
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        ...section,
        subsections: section.subsections.sort((a, b) => a.order - b.order),
      }));

    res.success(protocol, "Full protocol retrieved successfully");
  }),
);

// Get protocol sections
router.get(
  "/:id/sections",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    const query = getProtocolSections(id);
    const sections = await executeAuthQuery(query, [], req.token);
    res.list(sections, "Protocol sections retrieved successfully");
  }),
);

// Create new protocol
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    // Validation
    const errors = [];

    if (!name?.trim()) {
      errors.push({
        field: "name",
        message: "Protocol name is required and cannot be empty",
      });
    }
    if (name && name.length < 2) {
      errors.push({
        field: "name",
        message: "Protocol name must be at least 2 characters long",
      });
    }
    if (name && name.length > 100) {
      errors.push({
        field: "name",
        message: "Protocol name must be less than 100 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Protocol validation failed", { errors });
    }

    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    // Check if protocol with same name already exists for user
    const existingQuery = getProtocolByName(name.trim(), userContext.userId);
    const existing = await executeAuthQueryOne(existingQuery, [], req.token);

    if (existing) {
      throw new ConflictError("Protocol with this name already exists", {
        field: "name",
        value: name,
        details: "Each user can only have one protocol with a given name",
      });
    }

    const query = createProtocol(name.trim(), userContext.userId);

    let protocolId;
    try {
      protocolId = await executeAuthInsert(query, [], req.token);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Protocol with this name already exists", {
          field: "name",
          value: name,
        });
      }
      throw new DatabaseError("Failed to create protocol");
    }

    // Return the created protocol
    const createdProtocol = await executeAuthQueryOne(
      getProtocolById(protocolId),
      [],
      req.token,
    );
    res.created(createdProtocol, "Protocol created successfully");
  }),
);

// Update protocol
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    // Validation
    const errors = [];

    if (!name?.trim()) {
      errors.push({
        field: "name",
        message: "Protocol name is required and cannot be empty",
      });
    }
    if (name && name.length < 2) {
      errors.push({
        field: "name",
        message: "Protocol name must be at least 2 characters long",
      });
    }
    if (name && name.length > 100) {
      errors.push({
        field: "name",
        message: "Protocol name must be less than 100 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Protocol validation failed", { errors });
    }

    // Check if protocol exists
    const existingProtocol = await executeAuthQueryOne(
      getProtocolById(id),
      [],
      req.token,
    );
    if (!existingProtocol) {
      throw new NotFoundError("Protocol");
    }

    // Check if another protocol with same name exists for the user
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);
    const duplicateQuery = getProtocolByName(name.trim(), userContext.userId);
    const duplicate = await executeAuthQueryOne(duplicateQuery, [], req.token);

    if (duplicate && duplicate.id !== parseInt(id)) {
      throw new ConflictError(
        "Another protocol with this name already exists",
        {
          field: "name",
          value: name,
          details: "Each user can only have one protocol with a given name",
        },
      );
    }

    const query = updateProtocol(id, name.trim());

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("Protocol");
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Protocol with this name already exists", {
          field: "name",
          value: name,
        });
      }
      throw error;
    }

    // Return updated protocol
    const updatedProtocol = await executeAuthQueryOne(
      getProtocolById(id),
      [],
      req.token,
    );
    res.success(updatedProtocol, "Protocol updated successfully");
  }),
);

// Delete protocol
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    // Check if protocol exists
    const existingProtocol = await executeAuthQueryOne(
      getProtocolById(id),
      [],
      req.token,
    );
    if (!existingProtocol) {
      throw new NotFoundError("Protocol");
    }

    const query = deleteProtocol(id);

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("Protocol");
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new ValidationError(
          "Cannot delete protocol that contains sections",
          {
            details: "Remove all sections from the protocol before deleting it",
          },
        );
      }
      throw error;
    }

    res.success(null, "Protocol deleted successfully");
  }),
);

// Add section to protocol
router.post(
  "/:id/sections/:sectionId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: protocolId, sectionId } = req.params;
    const { orderIndex = 0 } = req.body;

    if (!protocolId) {
      throw new ValidationError("Protocol ID is required");
    }
    if (!sectionId) {
      throw new ValidationError("Section ID is required");
    }

    // Validation
    const errors = [];

    if (orderIndex !== undefined && (isNaN(orderIndex) || orderIndex < 0)) {
      errors.push({
        field: "orderIndex",
        message: "Order index must be a non-negative number",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Section assignment validation failed", {
        errors,
      });
    }

    // Check if protocol exists
    const existingProtocol = await executeAuthQueryOne(
      getProtocolById(protocolId),
      [],
      req.token,
    );
    if (!existingProtocol) {
      throw new NotFoundError("Protocol");
    }

    const query = addSectionToProtocol(protocolId, sectionId, orderIndex);

    try {
      await executeAuthUpdate(query, [], req.token);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Section is already added to this protocol");
      }
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new NotFoundError("Section");
      }
      throw error;
    }

    res.success(null, "Section added to protocol successfully");
  }),
);

// Remove section from protocol
router.delete(
  "/:id/sections/:sectionId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: protocolId, sectionId } = req.params;

    if (!protocolId) {
      throw new ValidationError("Protocol ID is required");
    }
    if (!sectionId) {
      throw new ValidationError("Section ID is required");
    }

    const query = removeSectionFromProtocol(protocolId, sectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      throw new NotFoundError("Section not found in protocol");
    }

    res.success(null, "Section removed from protocol successfully");
  }),
);

// Update section order in protocol
router.put(
  "/:id/sections/:sectionId/order",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: protocolId, sectionId } = req.params;
    const { orderIndex } = req.body;

    if (!protocolId) {
      throw new ValidationError("Protocol ID is required");
    }
    if (!sectionId) {
      throw new ValidationError("Section ID is required");
    }

    // Validation
    const errors = [];

    if (orderIndex === undefined) {
      errors.push({
        field: "orderIndex",
        message: "Order index is required",
      });
    } else if (isNaN(orderIndex) || orderIndex < 0) {
      errors.push({
        field: "orderIndex",
        message: "Order index must be a non-negative number",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Order update validation failed", { errors });
    }

    const query = updateSectionOrder(protocolId, sectionId, orderIndex);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      throw new NotFoundError("Section not found in protocol");
    }

    res.success(null, "Section order updated successfully");
  }),
);

// Remove all sections from protocol
router.delete(
  "/:id/sections",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: protocolId } = req.params;

    if (!protocolId) {
      throw new ValidationError("Protocol ID is required");
    }

    const query = removeAllSectionsFromProtocol(protocolId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    res.success(
      { removedCount: affectedRows },
      "All sections removed from protocol successfully",
    );
  }),
);

module.exports = router;
