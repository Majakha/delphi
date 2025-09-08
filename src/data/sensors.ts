import { Sensor } from '../types';

export const predefinedSensors: Sensor[] = [
  { id: 'imu', name: 'IMU (Inertial Measurement Unit)', category: 'Motion' },
  { id: 'eeg', name: 'EEG (Electroencephalography)', category: 'Brain' },
  { id: 'ecg', name: 'ECG (Electrocardiography)', category: 'Cardiac' },
  { id: 'emg', name: 'EMG (Electromyography)', category: 'Muscle' },
  { id: 'gps', name: 'GPS (Global Positioning System)', category: 'Location' },
  { id: 'accelerometer', name: 'Accelerometer', category: 'Motion' },
  { id: 'gyroscope', name: 'Gyroscope', category: 'Motion' },
  { id: 'magnetometer', name: 'Magnetometer', category: 'Motion' },
  { id: 'heart-rate', name: 'Heart Rate Monitor', category: 'Cardiac' },
  { id: 'blood-pressure', name: 'Blood Pressure Monitor', category: 'Cardiac' },
  { id: 'temperature', name: 'Temperature Sensor', category: 'Environmental' },
  { id: 'humidity', name: 'Humidity Sensor', category: 'Environmental' },
  { id: 'light', name: 'Light Sensor', category: 'Environmental' },
  { id: 'sound', name: 'Sound Level Meter', category: 'Environmental' },
  { id: 'camera', name: 'Camera', category: 'Visual' },
  { id: 'microphone', name: 'Microphone', category: 'Audio' },
]; 