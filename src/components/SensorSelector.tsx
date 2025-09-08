import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Sensor } from '../types';
import { predefinedSensors } from '../data/sensors';

interface SensorSelectorProps {
  selectedSensors: string[];
  onSensorsChange: (sensors: string[]) => void;
  availableSensors?: Sensor[];
}

const SensorSelector: React.FC<SensorSelectorProps> = ({
  selectedSensors,
  onSensorsChange,
  availableSensors = predefinedSensors
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customSensor, setCustomSensor] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSensorToggle = (sensorId: string) => {
    const newSelectedSensors = selectedSensors.includes(sensorId)
      ? selectedSensors.filter(id => id !== sensorId)
      : [...selectedSensors, sensorId];
    onSensorsChange(newSelectedSensors);
  };

  const handleAddCustomSensor = () => {
    if (customSensor.trim()) {
      const newSensor: Sensor = {
        id: `custom-${Date.now()}`,
        name: customSensor.trim(),
        isCustom: true
      };
      const newSelectedSensors = [...selectedSensors, newSensor.id];
      onSensorsChange(newSelectedSensors);
      setCustomSensor('');
      setShowCustomInput(false);
    }
  };

  const handleRemoveSensor = (sensorId: string) => {
    const newSelectedSensors = selectedSensors.filter(id => id !== sensorId);
    onSensorsChange(newSelectedSensors);
  };

  const getSensorName = (sensorId: string) => {
    const sensor = availableSensors.find(s => s.id === sensorId);
    return sensor ? sensor.name : sensorId;
  };

  const groupedSensors = availableSensors.reduce((acc, sensor) => {
    const category = sensor.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(sensor);
    return acc;
  }, {} as Record<string, Sensor[]>);

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedSensors.map((sensorId) => (
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
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary w-full text-left flex items-center justify-between"
      >
        <span>Select Sensors</span>
        <span className="text-sm text-gray-500">
          {selectedSensors.length} selected
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            {Object.entries(groupedSensors).map(([category, sensors]) => (
              <div key={category} className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2 text-sm uppercase tracking-wide">
                  {category}
                </h4>
                <div className="space-y-1">
                  {sensors.map((sensor) => (
                    <label
                      key={sensor.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSensors.includes(sensor.id)}
                        onChange={() => handleSensorToggle(sensor.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">{sensor.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {showCustomInput ? (
              <div className="border-t pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSensor}
                    onChange={(e) => setCustomSensor(e.target.value)}
                    placeholder="Enter custom sensor name"
                    className="input-field flex-1 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSensor()}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSensor}
                    className="btn-primary text-sm px-3 py-1"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm mt-2"
              >
                <Plus className="w-4 h-4" />
                Add Custom Sensor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorSelector; 