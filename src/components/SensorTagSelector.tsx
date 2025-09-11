import React from "react";
import { Sensor } from "../types";
import { predefinedSensors } from "../data/sensors";

interface SensorTagSelectorProps {
  selectedSensors: string[];
  onSensorsChange: (sensors: string[]) => void;
  availableSensors?: Sensor[];
}

const SensorTagSelector: React.FC<SensorTagSelectorProps> = ({
  selectedSensors,
  onSensorsChange,
  availableSensors = predefinedSensors,
}) => {
  const groupedSensors = availableSensors.reduce(
    (acc, sensor) => {
      const category = sensor.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(sensor);
      return acc;
    },
    {} as Record<string, Sensor[]>,
  );

  const toggleCategorySensors = (category: string, enable: boolean) => {
    const categorySensors = groupedSensors[category] || [];
    const categorySensorIds = categorySensors.map((s) => s.id);

    let newSelectedSensors: string[];
    if (enable) {
      // Add all category sensors that aren't already selected
      newSelectedSensors = [
        ...new Set([...selectedSensors, ...categorySensorIds]),
      ];
    } else {
      // Remove all category sensors
      newSelectedSensors = selectedSensors.filter(
        (id) => !categorySensorIds.includes(id),
      );
    }

    onSensorsChange(newSelectedSensors);
  };

  const toggleSensor = (sensorId: string) => {
    const newSelectedSensors = selectedSensors.includes(sensorId)
      ? selectedSensors.filter((id) => id !== sensorId)
      : [...selectedSensors, sensorId];
    onSensorsChange(newSelectedSensors);
  };

  const getSensorColors = (category: string, isSelected: boolean) => {
    const colorMap: Record<string, { selected: string; unselected: string }> = {
      Motion: {
        selected: "bg-blue-500 text-white border-blue-600 hover:bg-blue-600",
        unselected:
          "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
      },
      Brain: {
        selected:
          "bg-purple-500 text-white border-purple-600 hover:bg-purple-600",
        unselected:
          "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200",
      },
      Cardiac: {
        selected: "bg-red-500 text-white border-red-600 hover:bg-red-600",
        unselected: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
      },
      Muscle: {
        selected:
          "bg-orange-500 text-white border-orange-600 hover:bg-orange-600",
        unselected:
          "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200",
      },
      Location: {
        selected: "bg-green-500 text-white border-green-600 hover:bg-green-600",
        unselected:
          "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
      },
      Environmental: {
        selected: "bg-teal-500 text-white border-teal-600 hover:bg-teal-600",
        unselected:
          "bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200",
      },
      Visual: {
        selected: "bg-pink-500 text-white border-pink-600 hover:bg-pink-600",
        unselected:
          "bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200",
      },
      Audio: {
        selected:
          "bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600",
        unselected:
          "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200",
      },
      Other: {
        selected: "bg-gray-500 text-white border-gray-600 hover:bg-gray-600",
        unselected:
          "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200",
      },
    };

    const colors = colorMap[category] || colorMap["Other"];
    return isSelected ? colors.selected : colors.unselected;
  };

  const getCategoryHeaderColor = (category: string) => {
    const colors: Record<string, string> = {
      Motion: "text-blue-700 border-blue-200",
      Brain: "text-purple-700 border-purple-200",
      Cardiac: "text-red-700 border-red-200",
      Muscle: "text-orange-700 border-orange-200",
      Location: "text-green-700 border-green-200",
      Environmental: "text-teal-700 border-teal-200",
      Visual: "text-pink-700 border-pink-200",
      Audio: "text-yellow-700 border-yellow-200",
      Other: "text-gray-700 border-gray-200",
    };
    return colors[category] || colors["Other"];
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">
        Sensors ({selectedSensors.length} selected)
      </div>

      {Object.entries(groupedSensors).map(([category, sensors]) => {
        const selectedInCategory = sensors.filter((s) =>
          selectedSensors.includes(s.id),
        ).length;
        const headerColorClass = getCategoryHeaderColor(category);

        return (
          <div key={category} className="mb-2">
            {/* Category Header with Inline Sensor Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`flex items-center justify-between pr-2 ${headerColorClass}`}
              >
                <span className="text-sm font-medium">
                  {category} ({selectedInCategory}/{sensors.length}):
                </span>
              </div>

              {/* Sensor Tags (inline with category) */}
              {sensors.map((sensor) => {
                const isSelected = selectedSensors.includes(sensor.id);
                const colorClass = getSensorColors(category, isSelected);

                return (
                  <button
                    key={sensor.id}
                    onClick={() => toggleSensor(sensor.id)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${colorClass}`}
                    title={`${isSelected ? "Remove" : "Add"} ${sensor.name}`}
                  >
                    {sensor.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SensorTagSelector;
