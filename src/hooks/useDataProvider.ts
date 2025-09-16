import { useState, useEffect, useCallback, useRef } from 'react';
import { dataProvider } from '../services/DataProvider';
import {
  Protocol,
  StoredProtocol,
  Sensor,
  Section,
  User,
  NotificationType,
  CreateProtocolData,
  CreateSensorData,
  CreateSectionData,
  DataProviderStatus,
  Notification
} from '../services/types';

/**
 * Hook for managing protocol data with automatic syncing
 */
export const useProtocol = (protocolId: string) => {
  const [protocol, setProtocol] = useState<StoredProtocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load protocol on mount
  useEffect(() => {
    if (!protocolId) return;

    const loadProtocol = async () => {
      try {
        setLoading(true);
        setError(null);
        const protocolData = await dataProvider.loadProtocol(protocolId);
        setProtocol(protocolData);
        setSyncStatus(protocolData.syncStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load protocol');
      } finally {
        setLoading(false);
      }
    };

    loadProtocol();
  }, [protocolId]);

  // Listen for data provider notifications
  useEffect(() => {
    const unsubscribe = dataProvider.subscribe((type: NotificationType, data: any) => {
      switch (type) {
        case 'saved_locally':
          if (data.id === protocolId) {
            setSyncStatus('pending');
            setLastSaved(new Date());
          }
          break;
        case 'synced':
          setSyncStatus('synced');
          break;
        case 'sync_failed':
          setSyncStatus('error');
          break;
        case 'protocol_updated':
          if (data.id === protocolId) {
            setProtocol(data);
          }
          break;
      }
    });

    return unsubscribe;
  }, [protocolId]);

  // Update protocol function
  const updateProtocol = useCallback(
    async (updates: Partial<Protocol>) => {
      if (!protocol) return;

      const updatedProtocol = { ...protocol, ...updates };
      setProtocol(updatedProtocol);

      try {
        await dataProvider.saveProtocol(updatedProtocol);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save protocol');
        // Revert optimistic update on error
        setProtocol(protocol);
      }
    },
    [protocol]
  );

  // Force sync function
  const forceSync = useCallback(async () => {
    try {
      setSyncStatus('pending');
      await dataProvider.syncPendingChanges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      setSyncStatus('error');
    }
  }, []);

  return {
    protocol,
    loading,
    error,
    syncStatus,
    lastSaved,
    updateProtocol,
    forceSync,
  };
};

/**
 * Hook for managing sensors data with on-demand fetching
 */
export const useSensors = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ timestamp: string; age: number; size: number } | null>(null);

  // Load sensors function
  const loadSensors = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const sensorsData = await dataProvider.getSensors(forceRefresh);
      setSensors(sensorsData);

      // Update cache info
      const info = dataProvider.getCacheInfo('sensors');
      setCacheInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sensors');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new sensor
  const createSensor = useCallback(async (sensorData: CreateSensorData): Promise<Sensor> => {
    try {
      setLoading(true);
      const newSensor = await dataProvider.createSensor(sensorData);
      setSensors(prev => [...prev, newSensor]);
      return newSensor;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sensor');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh sensors
  const refreshSensors = useCallback(() => {
    loadSensors(true);
  }, [loadSensors]);

  return {
    sensors,
    loading,
    error,
    cacheInfo,
    loadSensors,
    refreshSensors,
    createSensor,
  };
};

/**
 * Hook for managing sections data with on-demand fetching
 */
export const useSections = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ timestamp: string; age: number; size: number } | null>(null);

  // Load sections function
  const loadSections = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const sectionsData = await dataProvider.getSections(forceRefresh);
      setSections(sectionsData);

      // Update cache info
      const info = dataProvider.getCacheInfo('sections');
      setCacheInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new section
  const createSection = useCallback(async (sectionData: CreateSectionData): Promise<Section> => {
    try {
      setLoading(true);
      const newSection = await dataProvider.createSection(sectionData);
      setSections(prev => [...prev, newSection]);
      return newSection;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create section');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh sections
  const refreshSections = useCallback(() => {
    loadSections(true);
  }, [loadSections]);

  return {
    sections,
    loading,
    error,
    cacheInfo,
    loadSections,
    refreshSections,
    createSection,
  };
};

/**
 * Hook for creating new protocols
 */
export const useProtocolCreation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProtocol = useCallback(async (protocolData: CreateProtocolData): Promise<Protocol> => {
    try {
      setLoading(true);
      setError(null);
      const newProtocol = await dataProvider.createProtocol(protocolData);
      return newProtocol;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create protocol');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createProtocol,
    loading,
    error,
  };
};

/**
 * Hook for global data provider status and notifications
 */
export const useDataProviderStatus = () => {
  const [status, setStatus] = useState<DataProviderStatus>({
    online: navigator.onLine,
    authenticated: false,
    pendingSync: 0,
    cacheKeys: [],
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationIdRef = useRef(0);

  useEffect(() => {
    // Update status periodically
    const updateStatus = () => {
      setStatus(dataProvider.getStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    // Listen for notifications
    const unsubscribe = dataProvider.subscribe((type: NotificationType, data: any) => {
      const notification: Notification = {
        id: ++notificationIdRef.current,
        type,
        data,
        timestamp: new Date(),
        read: false,
      };

      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10

      // Auto-remove non-error notifications after 5 seconds
      if (!type.includes('error')) {
        setTimeout(() => {
          setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
          );
        }, 5000);
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((notificationId: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  return {
    status,
    notifications: notifications.filter(n => !n.read),
    clearNotifications,
    markAsRead,
  };
};

/**
 * Hook for managing cache operations
 */
export const useCache = () => {
  const clearCache = useCallback((key?: string) => {
    dataProvider.clearCache(key);
  }, []);

  const getCacheInfo = useCallback((key: string) => {
    return dataProvider.getCacheInfo(key);
  }, []);

  return {
    clearCache,
    getCacheInfo,
  };
};

/**
 * Hook for authentication management
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    dataProvider.isAuthenticated()
  );

  // Check authentication status on mount
  useEffect(() => {
    const currentUser = dataProvider.getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(dataProvider.isAuthenticated());
  }, []);

  // Listen for auth notifications
  useEffect(() => {
    const unsubscribe = dataProvider.subscribe((type: NotificationType, data: any) => {
      switch (type) {
        case 'logged_in':
          setUser(data.user);
          setIsAuthenticated(true);
          setError(null);
          break;
        case 'logged_out':
        case 'session_expired':
          setUser(null);
          setIsAuthenticated(false);
          break;
        case 'auth_error':
          setError(data.error);
          break;
        case 'token_refreshed':
          const updatedUser = dataProvider.getCurrentUser();
          setUser(updatedUser);
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      setLoading(true);
      setError(null);
      const userData = await dataProvider.login(email, password);
      return userData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await dataProvider.logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
  };
};
