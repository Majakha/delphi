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
  updateSubsectionOrder,
} = require("../queries.js");
const { v4: uuidv4 } = require("uuid");
const { asyncHandler } = require("../middleware/errorHandler.js");
const {
  ValidationError,
  NotFoundError,
  DatabaseError,
} = require("../errors/CustomErrors.js");

// Get all sections
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getAllSections();
    const sections = await executeAuthQuery(query, [], req.token);
    res.list(sections, "Sections retrieved successfully");
  }),
);

// Get public sections
router.get(
  "/public",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getPublicSections();
    const sections = await executeAuthQuery(query, [], req.token);
    res.list(sections, "Public sections retrieved successfully");
  }),
);

// Get enabled sections
router.get(
  "/enabled",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getEnabledSections();
    const sections = await executeAuthQuery(query, [], req.token);
    res.list(sections, "Enabled sections retrieved successfully");
  }),
);

// Get user's sections
router.get(
  "/my",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const query = getSectionsByUser(userContext.userId);
    const sections = await executeAuthQuery(query, [], req.token);
    res.list(sections, "User sections retrieved successfully");
  }),
);

// Search sections
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

    const query = searchSections(term);
    const sections = await executeAuthQuery(query, [], req.token);
    res.list(sections, `Search results for '${term}' retrieved successfully`);
  }),
);

// Get section by ID
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Section ID is required");
    }

    const query = getSectionById(id);
    const section = await executeAuthQueryOne(query, [], req.token);

    if (!section) {
      throw new NotFoundError("Section");
    }

    res.success(section, "Section retrieved successfully");
  }),
);

// Get section with subsections
router.get(
  "/:id/subsections",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Section ID is required");
    }

    const query = getSectionSubsections(id);
    const subsections = await executeAuthQuery(query, [], req.token);
    res.list(subsections, "Section subsections retrieved successfully");
  }),
);

// Create new section
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { title, description, isPublic = false } = req.body;

    // Validation
    const errors = [];

    if (!title?.trim()) {
      errors.push({
        field: "title",
        message: "Title is required and cannot be empty",
      });
    }
    if (title && title.length < 2) {
      errors.push({
        field: "title",
        message: "Title must be at least 2 characters long",
      });
    }
    if (title && title.length > 200) {
      errors.push({
        field: "title",
        message: "Title must be less than 200 characters",
      });
    }
    if (description && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }
    if (typeof isPublic !== "boolean") {
      errors.push({
        field: "isPublic",
        message: "isPublic must be a boolean value",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Section validation failed", { errors });
    }

    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const sectionId = uuidv4();
    const query = createSection(
      sectionId,
      title.trim(),
      description?.trim(),
      userContext.userId,
      isPublic,
    );

    try {
      await executeAuthInsert(query, [], req.token);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ValidationError("A section with this title already exists", {
          field: "title",
          value: title,
        });
      }
      throw new DatabaseError("Failed to create section");
    }

    // Return the created section
    const createdSection = await executeAuthQueryOne(
      getSectionById(sectionId),
      [],
      req.token,
    );
    res.created(createdSection, "Section created successfully");
  }),
);

// Update section
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, enabled = true } = req.body;

    if (!id) {
      throw new ValidationError("Section ID is required");
    }

    // Validation
    const errors = [];

    if (!title?.trim()) {
      errors.push({
        field: "title",
        message: "Title is required and cannot be empty",
      });
    }
    if (title && title.length < 2) {
      errors.push({
        field: "title",
        message: "Title must be at least 2 characters long",
      });
    }
    if (title && title.length > 200) {
      errors.push({
        field: "title",
        message: "Title must be less than 200 characters",
      });
    }
    if (description && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }
    if (typeof enabled !== "boolean") {
      errors.push({
        field: "enabled",
        message: "enabled must be a boolean value",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Section validation failed", { errors });
    }

    // Check if section exists
    const existingSection = await executeAuthQueryOne(
      getSectionById(id),
      [],
      req.token,
    );
    if (!existingSection) {
      throw new NotFoundError("Section");
    }

    const query = updateSection(id, title.trim(), description?.trim(), enabled);

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("Section");
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ValidationError("A section with this title already exists", {
          field: "title",
          value: title,
        });
      }
      throw error;
    }

    // Return updated section
    const updatedSection = await executeAuthQueryOne(
      getSectionById(id),
      [],
      req.token,
    );
    res.success(updatedSection, "Section updated successfully");
  }),
);

// Delete section
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Section ID is required");
    }

    // Check if section exists
    const existingSection = await executeAuthQueryOne(
      getSectionById(id),
      [],
      req.token,
    );
    if (!existingSection) {
      throw new NotFoundError("Section");
    }

    const query = deleteSection(id);

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("Section");
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new ValidationError(
          "Cannot delete section that is being used in protocols",
          {
            details: "Remove the section from all protocols before deleting",
          },
        );
      }
      throw error;
    }

    res.success(null, "Section deleted successfully");
  }),
);

// Add subsection to section
router.post(
  "/:id/subsections/:subsectionId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: sectionId, subsectionId } = req.params;
    const { orderIndex = 0 } = req.body;

    if (!sectionId) {
      throw new ValidationError("Section ID is required");
    }
    if (!subsectionId) {
      throw new ValidationError("Subsection ID is required");
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
      throw new ValidationError("Subsection assignment validation failed", {
        errors,
      });
    }

    // Check if section exists
    const existingSection = await executeAuthQueryOne(
      getSectionById(sectionId),
      [],
      req.token,
    );
    if (!existingSection) {
      throw new NotFoundError("Section");
    }

    const query = addSubsectionToSection(sectionId, subsectionId, orderIndex);

    try {
      await executeAuthUpdate(query, [], req.token);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ValidationError(
          "Subsection is already added to this section",
        );
      }
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new NotFoundError("Subsection");
      }
      throw error;
    }

    res.success(null, "Subsection added to section successfully");
  }),
);

// Remove subsection from section
router.delete(
  "/:id/subsections/:subsectionId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: sectionId, subsectionId } = req.params;

    if (!sectionId) {
      throw new ValidationError("Section ID is required");
    }
    if (!subsectionId) {
      throw new ValidationError("Subsection ID is required");
    }

    const query = removeSubsectionFromSection(sectionId, subsectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      throw new NotFoundError("Subsection not found in section");
    }

    res.success(null, "Subsection removed from section successfully");
  }),
);

// Update subsection order in section
router.put(
  "/:id/subsections/:subsectionId/order",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: sectionId, subsectionId } = req.params;
    const { orderIndex } = req.body;

    if (!sectionId) {
      throw new ValidationError("Section ID is required");
    }
    if (!subsectionId) {
      throw new ValidationError("Subsection ID is required");
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

    const query = updateSubsectionOrder(sectionId, subsectionId, orderIndex);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      throw new NotFoundError("Subsection not found in section");
    }

    res.success(null, "Subsection order updated successfully");
  }),
);

// Remove all subsections from section
router.delete(
  "/:id/subsections",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: sectionId } = req.params;

    if (!sectionId) {
      throw new ValidationError("Section ID is required");
    }

    const query = removeAllSubsectionsFromSection(sectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    res.success(
      { removedCount: affectedRows },
      "All subsections removed from section successfully",
    );
  }),
);

module.exports = router;
