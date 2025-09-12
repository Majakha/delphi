import { Sensor } from "../types";

export const predefinedSensors: Sensor[] = [
  { id: "imu", name: "IMU (Inertial Measurement Unit)", category: "Motion" },
  { id: "eeg", name: "EEG (Electroencephalography)", category: "Brain" },
  { id: "ecg", name: "ECG (Electrocardiography)", category: "Cardiac" },
  { id: "emg", name: "EMG (Electromyography)", category: "Muscle" },
  { id: "gps", name: "GPS (Global Positioning System)", category: "Location" },
  { id: "accelerometer", name: "Accelerometer", category: "Motion" },
  { id: "gyroscope", name: "Gyroscope", category: "Motion" },
  { id: "magnetometer", name: "Magnetometer", category: "Motion" },
  { id: "heart-rate", name: "Heart Rate Monitor", category: "Cardiac" },
  { id: "blood-pressure", name: "Blood Pressure Monitor", category: "Cardiac" },
  { id: "temperature", name: "Temperature Sensor", category: "Environmental" },
  { id: "humidity", name: "Humidity Sensor", category: "Environmental" },
  { id: "light", name: "Light Sensor", category: "Environmental" },
  { id: "sound", name: "Sound Level Meter", category: "Environmental" },
  { id: "camera", name: "Camera", category: "Visual" },
  { id: "microphone", name: "Microphone", category: "Audio" },
];

// Function to get sensors sorted by category (most items first)
export const getSortedSensorsByCategory = () => {
  // Count items per category
  const categoryCounts = predefinedSensors.reduce(
    (counts, sensor) => {
      const category = sensor.category || "Other";
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );

  // Group sensors by category
  const groupedSensors = predefinedSensors.reduce(
    (grouped, sensor) => {
      const category = sensor.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(sensor);
      return grouped;
    },
    {} as Record<string, Sensor[]>,
  );

  // Sort categories by count (descending)
  const sortedCategories = Object.keys(groupedSensors).sort(
    (a, b) => (categoryCounts[b] || 0) - (categoryCounts[a] || 0),
  );

  // Create sorted object with categories in count order
  const sortedByCategoryCount: Record<string, Sensor[]> = {};
  sortedCategories.forEach((category) => {
    sortedByCategoryCount[category] = groupedSensors[category];
  });

  return sortedByCategoryCount;
};
