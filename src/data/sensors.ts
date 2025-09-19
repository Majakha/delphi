import { Sensor } from "../services/types";

export const predefinedSensors: Sensor[] = [
  {
    id: "imu",
    name: "IMU (Inertial Measurement Unit)",
    category: "Motion",
    description: "Measures acceleration and angular velocity in 3D space",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "eeg",
    name: "EEG (Electroencephalography)",
    category: "Brain",
    description: "Records electrical activity of the brain",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ecg",
    name: "ECG (Electrocardiography)",
    category: "Cardiac",
    description: "Records electrical activity of the heart",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "emg",
    name: "EMG (Electromyography)",
    category: "Muscle",
    description: "Records electrical activity produced by skeletal muscles",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "gps",
    name: "GPS (Global Positioning System)",
    category: "Location",
    description: "Provides location and time information",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "accelerometer",
    name: "Accelerometer",
    category: "Motion",
    description: "Measures proper acceleration",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "gyroscope",
    name: "Gyroscope",
    category: "Motion",
    description: "Measures angular velocity",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "magnetometer",
    name: "Magnetometer",
    category: "Motion",
    description: "Measures magnetic field strength and direction",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "heart-rate",
    name: "Heart Rate Monitor",
    category: "Cardiac",
    description: "Monitors heart rate in real-time",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "blood-pressure",
    name: "Blood Pressure Monitor",
    category: "Cardiac",
    description: "Measures blood pressure",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "temperature",
    name: "Temperature Sensor",
    category: "Environmental",
    description: "Measures ambient temperature",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "humidity",
    name: "Humidity Sensor",
    category: "Environmental",
    description: "Measures relative humidity",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "light",
    name: "Light Sensor",
    category: "Environmental",
    description: "Measures light intensity",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sound",
    name: "Sound Level Meter",
    category: "Environmental",
    description: "Measures sound pressure level",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "camera",
    name: "Camera",
    category: "Visual",
    description: "Captures visual data",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "microphone",
    name: "Microphone",
    category: "Audio",
    description: "Captures audio data",
    is_custom: false,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Function to get sensors sorted by category (most items first)
export const getSortedSensorsByCategory = (
  sensors: Sensor[] = predefinedSensors,
) => {
  // Count items per category
  const categoryCounts = sensors.reduce(
    (counts, sensor) => {
      const category = sensor.category || "Other";
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );

  // Group sensors by category
  const groupedSensors = sensors.reduce(
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
