// Main data provider hooks
export {
  useProtocol,
  useProtocols,
  useTasks,
  useTask,
  useDomains,
  useSensors,
  useDataProviderStatus,
  useCache,
  useAuth,
} from "./useDataProvider";

// Protocol task management hooks
export {
  useProtocolTasks,
  useProtocolTaskRelationships,
  useProtocolTemplates,
} from "./useProtocolTasks";

// Re-export types that hooks consumers might need
export type {
  Protocol,
  FullProtocol,
  Task,
  TaskWithRelations,
  Domain,
  Sensor,
  User,
  ProtocolTask,
  CreateProtocolData,
  UpdateProtocolData,
  CreateTaskData,
  UpdateTaskData,
  CreateDomainData,
  UpdateDomainData,
  CreateSensorData,
  UpdateSensorData,
  RegisterData,
  LoginData,
  ChangePasswordData,
  DataProviderStatus,
  Notification,
  NotificationType,
  TaskFilters,
  SensorFilters,
  DomainFilters,
  ProtocolFilters,
} from "../services/types";
