import React, { useState, useEffect } from "react";
import { X, Settings, Plus } from "lucide-react";
import { Sensor } from "../services/types";
import { getSortedSensorsByCategory, predefinedSensors } from "../data/sensors";
import Popup from "./Popup";
import AddSensorPopup from "./AddSensorPopup";
import { dataProvider } from "../services/DataProvider";

interface SensorSelectorProps {
  selectedSensors: string[];
  onSensorsChange: (sensors: string[]) => void;
  availableSensors?: Sensor[];
  inline?: boolean;
}

const SensorSelector: React.FC<SensorSelectorProps> = ({
  selectedSensors,
  onSensorsChange,
  availableSensors = [],
  inline = false,
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [allSensors, setAllSensors] = useState<Sensor[]>(availableSensors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPopupOpen || inline) {
      loadSensors();
    }
  }, [isPopupOpen, inline]);

  const loadSensors = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiSensors = await dataProvider.getSensors();
      // Combine predefined sensors with API sensors
      const combined = [...predefinedSensors, ...apiSensors];
      // Remove duplicates based on ID
      const unique = combined.filter(
        (sensor, index, arr) =>
          arr.findIndex((s) => s.id === sensor.id) === index,
      );
      setAllSensors(unique);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sensors");
      setAllSensors(predefinedSensors); // Fallback to predefined sensors
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewSensor = async (sensorData: Omit<Sensor, "id">) => {
    try {
      const newSensor = await dataProvider.createSensor({
        name: sensorData.name,
        description: sensorData.description || "",
        category: sensorData.category || "Custom",
      });

      // Add to local sensors list
      setAllSensors((prev) => [...prev, newSensor]);

      // Auto-select the new sensor
      const newSelectedSensors = [...selectedSensors, newSensor.id];
      onSensorsChange(newSelectedSensors);

      setShowCreatePopup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sensor");
    }
  };

  const handleSensorToggle = (sensorId: string) => {
    const newSelectedSensors = selectedSensors.includes(sensorId)
      ? selectedSensors.filter((id) => id !== sensorId)
      : [...selectedSensors, sensorId];
    onSensorsChange(newSelectedSensors);
  };

  const handleRemoveSensor = (sensorId: string) => {
    const newSelectedSensors = selectedSensors.filter((id) => id !== sensorId);
    onSensorsChange(newSelectedSensors);
  };

  const getSensorName = (sensorId: string) => {
    const sensor = allSensors.find((s) => s.id === sensorId);
    return sensor ? sensor.name : sensorId;
  };

  const groupedSensors = getSortedSensorsByCategory(allSensors);

  // Sensor content component
  const SensorContent = () => (
    <div>
      <div className="mb-4">
        <div className="font-medium text-gray-700 mb-2">Selected Sensors:</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedSensors.length > 0 ? (
            selectedSensors.map((sensorId) => (
              <span
                key={sensorId}
                className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-sm"
              >
                {getSensorName(sensorId)}
                <button
                  type="button"
                  onClick={() => handleRemoveSensor(sensorId)}
                  className="hover:bg-primary-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-sm">No sensors selected</span>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        {/* Create New Sensor Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowCreatePopup(true)}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Shared Sensor
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              type="button"
              onClick={loadSensors}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 text-sm mt-2">Loading sensors...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groupedSensors).map(([category, sensors]) => (
              <div key={category} className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2 text-sm uppercase tracking-wide">
                  {category}
                </h4>
                <div className="space-y-1 bg-gray-50 p-2 rounded-md max-h-48 overflow-y-auto">
                  {sensors.map((sensor) => (
                    <label
                      key={sensor.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSensors.includes(sensor.id)}
                        onChange={() => handleSensorToggle(sensor.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm">{sensor.name}</span>
                        {!sensor.is_custom && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Built-in
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!inline && (
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsPopupOpen(false)}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Create Sensor Popup */}
      <AddSensorPopup
        isOpen={showCreatePopup}
        onClose={() => setShowCreatePopup(false)}
        onSave={handleCreateNewSensor}
      />
    </div>
  );

  // Return inline content for embedded use
  if (inline) {
    return <SensorContent />;
  }

  // Return popup trigger for standalone use
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          {selectedSensors.length} sensor
          {selectedSensors.length !== 1 ? "s" : ""} selected
        </span>
        <button
          type="button"
          onClick={() => setIsPopupOpen(true)}
          className="btn-secondary text-sm"
        >
          <Settings className="w-4 h-4 mr-1" />
          Configure
        </button>
      </div>

      {isPopupOpen && (
        <Popup
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          title="Select Sensors"
          width="lg"
        >
          <SensorContent />
        </Popup>
      )}
    </>
  );
};

export default SensorSelector;
