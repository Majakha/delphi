import React, { createContext, useContext, useEffect, useState } from "react";
import { DataProvider } from "./DataProvider";
import { AuthManager } from "./AuthManager";
import { CacheManager } from "./CacheManager";
import { StorageManager } from "./StorageManager";
import { ServiceUtils, ServiceEventBus, ServiceHealth } from "./serviceUtils";
import {
  User,
  DataProviderStatus,
  NotificationType,
} from "./types";

// Service instances
const storageManager = new StorageManager();
const cacheManager = new CacheManager();
const authManager = new AuthManager(storageManager);

interface ServiceContextValue {
  dataProvider: DataProvider;
  authManager: AuthManager;
  cacheManager: CacheManager;
  storageManager: StorageManager;
  serviceUtils: typeof ServiceUtils;
  serviceEventBus: ServiceEventBus;
  serviceHealth: typeof ServiceHealth;
  isInitialized: boolean;
  initializationError: string | null;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

interface ServiceProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
  cacheConfig?: {
    maxSize?: number;
    defaultTtl?: number;
  };
  onServiceEvent?: (type: NotificationType, data: any) => void;
  onInitialized?: (services: ServiceContextValue) => void;
  onError?: (error: string) => void;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  apiBaseUrl = process.env.REACT_APP_API_URL || "http://localhost:3001/api",
  cacheConfig = {},
  onServiceEvent,
  onInitialized,
  onError,
}) => {
  const [dataProvider, setDataProvider] = useState<DataProvider | null>(null);
  const [serviceEventBus] = useState(() => new ServiceEventBus());
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Configure cache if options provided
        if (cacheConfig.maxSize || cacheConfig.defaultTtl) {
          cacheManager.setConfig(cacheConfig.maxSize, cacheConfig.defaultTtl);
        }

        // Create data provider instance
        const dp = new DataProvider(
          apiBaseUrl,
          storageManager,
          cacheManager,
          authManager
        );

        // Subscribe to data provider events and forward to service event bus
        dp.subscribe((type: NotificationType, data: any) => {
          serviceEventBus.emit(type, data);
          onServiceEvent?.(type, data);
        });

        // Set up global error handling
        window.addEventListener('unhandledrejection', (event) => {
          console.error('Unhandled promise rejection:', event.reason);
          serviceEventBus.emit('error', {
            type: 'unhandled_rejection',
            error: event.reason,
          });
        });

        window.addEventListener('error', (event) => {
          console.error('Global error:', event.error);
          serviceEventBus.emit('error', {
            type: 'global_error',
            error: event.error,
          });
        });

        setDataProvider(dp);
        setIsInitialized(true);
        setInitializationError(null);

        const serviceContext: ServiceContextValue = {
          dataProvider: dp,
          authManager,
          cacheManager,
          storageManager,
          serviceUtils: ServiceUtils,
          serviceEventBus,
          serviceHealth: ServiceHealth,
          isInitialized: true,
          initializationError: null,
        };

        onInitialized?.(serviceContext);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Service initialization failed';
        setInitializationError(errorMessage);
        onError?.(errorMessage);
        console.error('Service initialization error:', error);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      if (dataProvider) {
        dataProvider.destroy();
      }
      serviceEventBus.clear();
    };
  }, [apiBaseUrl, cacheConfig.maxSize, cacheConfig.defaultTtl]);

  // Don't render children until services are initialized
  if (!isInitialized || !dataProvider) {
    return (
      <div className="service-provider-loading">
        {initializationError ? (
          <div className="service-provider-error">
            <h3>Service Initialization Failed</h3>
            <p>{initializationError}</p>
            <button onClick={() => window.location.reload()}>
              Reload Application
            </button>
          </div>
        ) : (
          <div className="service-provider-initializing">
            <p>Initializing services...</p>
          </div>
        )}
      </div>
    );
  }

  const contextValue: ServiceContextValue = {
    dataProvider,
    authManager,
    cacheManager,
    storageManager,
    serviceUtils: ServiceUtils,
    serviceEventBus,
    serviceHealth: ServiceHealth,
    isInitialized,
    initializationError,
  };

  return (
    <ServiceContext.Provider value={contextValue}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * Hook to access services from components
 */
export const useServices = (): ServiceContextValue => {
  const context = useContext(ServiceContext);

  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }

  return context;
};

/**
 * Hook to access specific service instances
 */
export const useDataProvider = () => {
  const { dataProvider } = useServices();
  return dataProvider;
};

export const useAuthManager = () => {
  const { authManager } = useServices();
  return authManager;
};

export const useCacheManager = () => {
  const { cacheManager } = useServices();
  return cacheManager;
};

export const useStorageManager = () => {
  const { storageManager } = useServices();
  return storageManager;
};

/**
 * Hook for service health monitoring
 */
export const useServiceHealth = () => {
  const { serviceHealth } = useServices();
  const [healthStatus, setHealthStatus] = useState<{
    healthy: boolean;
    services: {
      dataProvider: boolean;
      authentication: boolean;
      storage: boolean;
      cache: boolean;
    };
    issues: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const status = await serviceHealth.checkHealth();
      setHealthStatus(status);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({
        healthy: false,
        services: {
          dataProvider: false,
          authentication: false,
          storage: false,
          cache: false,
        },
        issues: ['Health check failed'],
      });
    } finally {
      setLoading(false);
    }
  };

  const attemptRecovery = async () => {
    setLoading(true);
    try {
      const result = await serviceHealth.attemptRecovery();
      // Re-check health after recovery attempt
      await checkHealth();
      return result;
    } catch (error) {
      console.error('Recovery failed:', error);
      return {
        recovered: false,
        actions: ['Recovery failed'],
      };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial health check
    checkHealth();

    // Periodic health checks every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    healthStatus,
    loading,
    checkHealth,
    attemptRecovery,
  };
};

/**
 * Hook for global service event listening
 */
export const useServiceEvents = (
  eventTypes: NotificationType[],
  callback: (type: NotificationType, data: any) => void
) => {
  const { serviceEventBus } = useServices();

  useEffect(() => {
    const unsubscribers = eventTypes.map(eventType =>
      serviceEventBus.subscribe(eventType, (data) => callback(eventType, data))
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [eventTypes, callback, serviceEventBus]);
};

/**
 * Development-only service debugging component
 */
export const ServiceDebugPanel: React.FC<{
  visible?: boolean;
}> = ({ visible = false }) => {
  const services = useServices();
  const { healthStatus, checkHealth, attemptRecovery } = useServiceHealth();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const updateDebugInfo = () => {
    const info = {
      dataProviderStatus: services.dataProvider.getStatus(),
      cacheStats: services.cacheManager.getStats(),
      storageInfo: services.storageManager.getStorageInfo(),
      authStatus: {
        isAuthenticated: services.authManager.isAuthenticated(),
        currentUser: services.authManager.getCurrentUser(),
        tokenExpiry: services.authManager.getTokenExpiry(),
      },
    };
    setDebugInfo(info);
  };

  useEffect(() => {
    if (visible) {
      updateDebugInfo();
      const interval = setInterval(updateDebugInfo, 1000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  if (!visible || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '20px',
      overflow: 'auto',
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace',
    }}>
      <h3>Service Debug Panel</h3>

      <button onClick={checkHealth} style={{ marginBottom: '10px' }}>
        Check Health
      </button>

      <button onClick={attemptRecovery} style={{ marginBottom: '10px', marginLeft: '10px' }}>
        Attempt Recovery
      </button>

      {healthStatus && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Health Status: {healthStatus.healthy ? '✅' : '❌'}</h4>
          {healthStatus.issues.length > 0 && (
            <div>
              <strong>Issues:</strong>
              <ul>
                {healthStatus.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {debugInfo && (
        <div>
          <h4>Debug Info:</h4>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ServiceProvider;
