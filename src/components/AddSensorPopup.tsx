import React, { useState, useEffect } from "react";
import Popup from "./Popup";
import { Sensor } from "../services/types";
import { predefinedSensors } from "../data/sensors";
import { dataProvider } from "../services/DataProvider";

interface AddSensorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sensor: Omit<Sensor, "id">) => void;
}

const AddSensorPopup: React.FC<AddSensorPopupProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load available categories when popup opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Get categories from predefined sensors
      const predefinedCategories = Array.from(
        new Set(
          predefinedSensors
            .map((sensor: any) => sensor.category)
            .filter(Boolean),
        ),
      );

      // Get categories from API sensors
      const apiSensors = await dataProvider.getSensors();
      const apiCategories = Array.from(
        new Set(apiSensors.map((sensor) => sensor.category).filter(Boolean)),
      );

      // Combine and deduplicate
      const allCategories = Array.from(
        new Set([...predefinedCategories, ...apiCategories]),
      ).sort();

      setAvailableCategories(allCategories);
    } catch (error) {
      console.error("Failed to load sensor categories:", error);
      // Fallback to predefined categories only
      const predefinedCategories = Array.from(
        new Set(
          predefinedSensors
            .map((sensor: any) => sensor.category)
            .filter(Boolean),
        ),
      ).sort();
      setAvailableCategories(predefinedCategories);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Sensor name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCategoryChange = (value: string) => {
    if (value === "CREATE_NEW") {
      setIsCreatingNewCategory(true);
      setSelectedCategory("");
      setNewCategory("");
    } else {
      setIsCreatingNewCategory(false);
      setSelectedCategory(value);
      setNewCategory("");
    }
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const categoryValue = isCreatingNewCategory
      ? newCategory.trim()
      : selectedCategory;

    const newSensor: Omit<Sensor, "id"> = {
      name: name.trim(),
      description: "",
      category: categoryValue || "Other",
      is_custom: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(newSensor);
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setSelectedCategory("");
    setNewCategory("");
    setIsCreatingNewCategory(false);
    setErrors({});
    onClose();
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Sensor"
      width="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sensor Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter sensor name"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          {loading ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              Loading categories...
            </div>
          ) : (
            <>
              <select
                value={isCreatingNewCategory ? "CREATE_NEW" : selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category (optional)</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="CREATE_NEW">+ Create new category</option>
              </select>

              {isCreatingNewCategory && (
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                />
              )}
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Sensor
          </button>
        </div>
      </div>
    </Popup>
  );
};

export default AddSensorPopup;
