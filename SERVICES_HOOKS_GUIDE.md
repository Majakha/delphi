# Services and Hooks Guide - Delphi

This guide covers the updated services and hooks for the new database schema and API architecture.

## Overview

The Delphi application now uses a modern service architecture with:
- **Protocol-Task Structure**: Protocols contain tasks (replacing sections/subsections)
- **Enhanced Authentication**: Username/email login with bcryptjs hashing
- **User Customization**: Per-protocol task overrides and custom entities
- **Global Templates**: Reusable protocol templates
- **Improved Caching**: Smart caching and offline support

## Service Architecture

### Core Services

#### DataProvider
The main service for all API interactions.

```typescript
import { dataProvider } from '../services/DataProvider';

// Authentication
await dataProvider.register({ username, email, password });
await dataProvider.login({ username, password });
await dataProvider.logout();

// Protocols
const protocols = await dataProvider.getProtocols();
const fullProtocol = await dataProvider.getProtocol(id, true);
const newProtocol = await dataProvider.createProtocol(data);

// Tasks
const tasks = await dataProvider.getTasks();
const task = await dataProvider.getTask(id, withRelations);
const searchResults = await dataProvider.searchTasks(query);

// Domains (formerly sections)
const domains = await dataProvider.getDomains();
const newDomain = await dataProvider.createDomain(data);

// Sensors
const sensors = await dataProvider.getSensors();
const newSensor = await dataProvider.createSensor(data);
```

#### AuthManager
Handles authentication and token management.

```typescript
import { authManager } from '../services/AuthManager';

// Check authentication status
const isAuth = authManager.isAuthenticated();
const user = authManager.getCurrentUser();
const willExpire = authManager.willExpireSoon(10); // 10 minutes
```

#### CacheManager & StorageManager
Handle caching and local storage.

```typescript
import { cacheManager, storageManager } from '../services';

// Cache operations
cacheManager.set('key', data, ttl);
const cached = cacheManager.get('key');
cacheManager.clear();

// Storage operations
storageManager.set('key', data);
const stored = storageManager.get('key');
```

## Using Hooks

### Authentication Hook

```typescript
import { useAuth } from '../hooks';

function LoginComponent() {
  const { 
    user, 
    isAuthenticated, 
    loading, 
    error, 
    register,
    login, 
    logout,
    changePassword,
    clearError 
  } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ username: 'user@example.com', password: 'password' });
    } catch (err) {
      // Error is automatically set in hook state
    }
  };

  const handleRegister = async () => {
    try {
      await register({ 
        username: 'newuser', 
        email: 'user@example.com', 
        password: 'password' 
      });
      // After registration, user needs to login
    } catch (err) {
      // Error handling
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>Welcome {user?.username}!</div>
      ) : (
        <form onSubmit={handleLogin}>
          {/* Login form */}
        </form>
      )}
    </div>
  );
}
```

### Protocol Management

```typescript
import { useProtocol, useProtocols } from '../hooks';

function ProtocolsList() {
  const { 
    protocols, 
    loading, 
    error, 
    loadProtocols, 
    createProtocol 
  } = useProtocols();

  const handleCreate = async () => {
    const newProtocol = await createProtocol({
      name: 'My Protocol',
      description: 'A new protocol',
      is_template: false,
    });
  };

  return (
    <div>
      {protocols.map(protocol => (
        <div key={protocol.id}>{protocol.name}</div>
      ))}
    </div>
  );
}

function ProtocolEditor({ protocolId }) {
  const { 
    protocol, 
    loading, 
    error, 
    updateProtocol, 
    deleteProtocol,
    addTask,
    removeTask,
    forceSync 
  } = useProtocol(protocolId, true); // true for full protocol with tasks

  const handleAddTask = async (taskId) => {
    await addTask(taskId, {
      order_index: protocol.tasks.length,
      importance_rating: 5,
      notes: 'Added via UI',
    });
  };

  return (
    <div>
      <h1>{protocol?.name}</h1>
      {protocol?.tasks.map(task => (
        <div key={task.task_id}>
          {task.title} - {task.time}min
        </div>
      ))}
    </div>
  );
}
```

### Task Management

```typescript
import { useTasks, useTask } from '../hooks';

function TasksList() {
  const { 
    tasks, 
    loading, 
    error, 
    searchTasks,
    createTask, 
    updateTask, 
    deleteTask 
  } = useTasks({ type: 'task' }); // Filter for tasks only

  const handleSearch = async (query) => {
    await searchTasks(query);
  };

  const handleCreate = async () => {
    await createTask({
      title: 'New Task',
      time: 30,
      rating: 4,
      type: 'task',
      description: 'Task description',
    });
  };

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {tasks.map(task => (
        <div key={task.id}>
          {task.title} - {task.is_custom ? 'Custom' : 'Global'}
        </div>
      ))}
    </div>
  );
}

function TaskEditor({ taskId }) {
  const { task, loading, error } = useTask(taskId, true); // with relationships

  return (
    <div>
      <h2>{task?.title}</h2>
      <p>Time: {task?.time} minutes</p>
      <p>Rating: {task?.rating}/5</p>
      
      <h3>Sensors:</h3>
      {task?.sensors?.map(sensor => (
        <span key={sensor.id}>{sensor.name}</span>
      ))}
      
      <h3>Domains:</h3>
      {task?.domains?.map(domain => (
        <span key={domain.id}>{domain.name}</span>
      ))}
    </div>
  );
}
```

### Domain & Sensor Management

```typescript
import { useDomains, useSensors } from '../hooks';

function DomainManager() {
  const { 
    domains, 
    loading, 
    createDomain, 
    updateDomain, 
    deleteDomain 
  } = useDomains({ user_only: true }); // Only user's custom domains

  return (
    <div>
      {domains.map(domain => (
        <div key={domain.id}>
          {domain.name} - {domain.is_custom ? 'Custom' : 'Global'}
        </div>
      ))}
    </div>
  );
}

function SensorManager() {
  const { 
    sensors, 
    loading, 
    searchSensors,
    createSensor, 
    updateSensor, 
    deleteSensor 
  } = useSensors({ category: 'biometric' });

  return (
    <div>
      {sensors.map(sensor => (
        <div key={sensor.id}>
          {sensor.name} ({sensor.category})
        </div>
      ))}
    </div>
  );
}
```

### Advanced Protocol Task Management

```typescript
import { useProtocolTasks, useProtocolTemplates } from '../hooks';

function ProtocolTaskManager({ protocolId }) {
  const {
    protocol,
    tasks,
    tasksByType,
    totalTime,
    overrideStats,
    loading,
    addTask,
    removeTask,
    updateProtocolTask,
    reorderTasks,
  } = useProtocolTasks(protocolId);

  const handleReorder = async (taskId, newPosition) => {
    await reorderTasks([{
      taskId,
      newOrderIndex: newPosition,
    }]);
  };

  return (
    <div>
      <h2>{protocol?.name}</h2>
      <p>Total Time: {Math.floor(totalTime / 60)}h {totalTime % 60}m</p>
      <p>Tasks: {tasksByType.tasks.length} | Breaks: {tasksByType.breaks.length}</p>
      <p>Overrides: {overrideStats.tasksWithOverrides}/{overrideStats.totalTasks}</p>
      
      {tasks.map((task, index) => (
        <div key={task.protocol_task_id}>
          <span>{task.title}</span>
          {task.has_title_override && <span>(Title Override)</span>}
          {task.has_time_override && <span>(Time Override)</span>}
          <button onClick={() => handleReorder(task.task_id, index + 1)}>
            Move Down
          </button>
        </div>
      ))}
    </div>
  );
}

function TemplateSelector() {
  const { 
    templates, 
    loading, 
    createFromTemplate 
  } = useProtocolTemplates();

  const handleUseTemplate = async (templateId) => {
    const newProtocol = await createFromTemplate(templateId, {
      name: 'Protocol from Template',
      description: 'Created from template',
    });
  };

  return (
    <div>
      <h3>Available Templates</h3>
      {templates.map(template => (
        <div key={template.id}>
          <h4>{template.name}</h4>
          <p>{template.tasks.length} tasks</p>
          <button onClick={() => handleUseTemplate(template.id)}>
            Use Template
          </button>
        </div>
      ))}
    </div>
  );
}
```

### System Status & Monitoring

```typescript
import { useDataProviderStatus, useCache, useServiceHealth } from '../hooks';

function SystemStatus() {
  const { 
    status, 
    notifications, 
    clearNotifications,
    markAsRead 
  } = useDataProviderStatus();

  const { healthStatus, checkHealth, attemptRecovery } = useServiceHealth();

  return (
    <div>
      <h3>System Status</h3>
      <p>Online: {status.online ? '✅' : '❌'}</p>
      <p>Authenticated: {status.authenticated ? '✅' : '❌'}</p>
      <p>Pending Sync: {status.pendingSync}</p>
      <p>Cache Keys: {status.cacheKeys.length}</p>

      {healthStatus && (
        <div>
          <h4>Health Check</h4>
          <p>Status: {healthStatus.healthy ? '✅ Healthy' : '❌ Issues'}</p>
          {healthStatus.issues.map((issue, i) => (
            <p key={i} style={{ color: 'red' }}>{issue}</p>
          ))}
          <button onClick={checkHealth}>Recheck</button>
          <button onClick={attemptRecovery}>Attempt Recovery</button>
        </div>
      )}

      <div>
        <h4>Notifications</h4>
        {notifications.map(notification => (
          <div key={notification.id}>
            {notification.type}: {JSON.stringify(notification.data)}
          </div>
        ))}
        <button onClick={clearNotifications}>Clear All</button>
      </div>
    </div>
  );
}
```

## Service Provider Setup

Wrap your app with the ServiceProvider:

```typescript
import { ServiceProvider, ServiceDebugPanel } from '../services/ServiceProvider';

function App() {
  const handleServiceEvent = (type, data) => {
    console.log('Service event:', type, data);
  };

  const handleInitialized = (services) => {
    console.log('Services initialized:', services);
  };

  return (
    <ServiceProvider
      apiBaseUrl="http://localhost:3001/api"
      cacheConfig={{ maxSize: 200, defaultTtl: 30 * 60 * 1000 }}
      onServiceEvent={handleServiceEvent}
      onInitialized={handleInitialized}
    >
      <YourAppComponents />
      
      {/* Development only */}
      <ServiceDebugPanel visible={process.env.NODE_ENV === 'development'} />
    </ServiceProvider>
  );
}
```

## Service Utilities

Use ServiceUtils for common operations:

```typescript
import { ServiceUtils } from '../services/serviceUtils';

// Create protocol from template
const protocol = await ServiceUtils.createProtocolFromTemplate(
  templateId, 
  { name: 'New Protocol', description: 'From template' }
);

// Duplicate existing protocol
const duplicate = await ServiceUtils.duplicateProtocol(
  sourceId, 
  'Copy of Protocol'
);

// Batch create and add tasks
const tasks = await ServiceUtils.batchCreateAndAddTasks(protocolId, [
  { title: 'Task 1', time: 30, order_index: 1 },
  { title: 'Task 2', time: 45, order_index: 2 },
]);

// Global search across all entities
const results = await ServiceUtils.globalSearch('meditation');

// Get protocol statistics
const stats = await ServiceUtils.getProtocolStats(protocolId);

// Validate protocol before use
const validation = await ServiceUtils.validateProtocol(protocolId);

// Get user statistics
const userStats = await ServiceUtils.getUserStats();
```

## Error Handling

All hooks handle errors consistently:

```typescript
function MyComponent() {
  const { data, loading, error } = useSomeHook();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{/* Render data */}</div>;
}
```

## Event System

Listen to service events globally:

```typescript
import { useServiceEvents } from '../hooks';

function EventListener() {
  useServiceEvents(
    ['logged_in', 'logged_out', 'sync_failed'],
    (type, data) => {
      switch (type) {
        case 'logged_in':
          console.log('User logged in:', data.user);
          break;
        case 'logged_out':
          console.log('User logged out');
          break;
        case 'sync_failed':
          console.error('Sync failed:', data);
          break;
      }
    }
  );

  return null; // This component just listens
}
```

## Migration from Old API

### Key Changes

1. **Sections → Domains**: `useSections()` → `useDomains()`
2. **Subsections → Tasks**: `useSubsections()` → `useTasks()`
3. **Authentication**: Now requires username/email + password
4. **Protocols**: Now contain tasks directly, not sections
5. **New Entities**: Domains are separate categorical entities

### Migration Example

```typescript
// OLD (deprecated)
const { sections } = useSections();
const protocol = await dataProvider.loadProtocol(id);

// NEW
const { domains } = useDomains();
const protocol = await dataProvider.getProtocol(id, true);
```

## Best Practices

1. **Use Filters**: Apply appropriate filters to reduce data transfer
2. **Cache Wisely**: Leverage caching for frequently accessed data
3. **Handle Offline**: Design for offline-first usage
4. **Error Boundaries**: Wrap components in error boundaries
5. **Service Health**: Monitor service health in production
6. **Event Cleanup**: Always clean up event listeners

## TypeScript Types

All types are exported from the hooks index:

```typescript
import type { 
  Protocol, 
  FullProtocol, 
  Task, 
  Domain, 
  Sensor,
  CreateProtocolData,
  TaskFilters 
} from '../hooks';
```

This guide covers the essential usage patterns for the updated Delphi services and hooks architecture.