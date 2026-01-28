
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  OPERATOR = 'OPERATOR',
  RONDA = 'RONDA',
  OUTROS = 'OUTROS'
}

export type PermissionKey = 
  | 'VIEW_DASHBOARD'
  | 'CREATE_INCIDENT'
  | 'VIEW_ALL_INCIDENTS' // Ver histórico completo (não apenas os seus) ou menu Histórico
  | 'EDIT_INCIDENT'
  | 'DELETE_INCIDENT'
  | 'APPROVE_INCIDENT'
  | 'MANAGE_ASSETS'      // Veículos, Coletes, Rádios, Equipamentos
  | 'DELETE_ASSETS'
  | 'MANAGE_LOANS'       // Criar e Visualizar Cautelas
  | 'RETURN_LOANS'       // Realizar Devolução
  | 'MANAGE_USERS'       // Criar/Editar Usuários
  | 'DELETE_USERS'
  | 'MANAGE_BUILDINGS'   // Gerenciar Prédios
  | 'MANAGE_SECTORS'     // Gerenciar Setores
  | 'MANAGE_ALTERATION_TYPES' // Gerenciar Tipos de Alteração
  | 'ACCESS_TOOLS'       // Logs, Backup, Config Visual, Permissões
  | 'EXPORT_REPORTS';

export interface SystemPermissionMap {
  [key: string]: UserRole[];
}

export interface UserPermissionOverrides {
  [userId: string]: {
    [key in PermissionKey]?: boolean;
  };
}

// Novo Tipo para Visibilidade do Menu
export interface MenuVisibilityMap {
  [role: string]: string[]; // Array de MenuIDs visíveis
}

export interface Sector {
  id: string;
  name: string;
}

export interface AlterationType {
  id: string;
  name: string;
  order?: number;
}

export interface User {
  id: string;
  name: string;
  cpf: string;
  matricula: string;
  userCode?: string; // Novo campo: Código de 1 a 99
  role: UserRole;
  status?: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  email?: string;
  passwordHash?: string;
}

export interface Building {
  id: string;
  buildingNumber: string;
  name: string;
  address: string;
  sectorId: string;
  hasKey: boolean;
  hasAlarm: boolean;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  latitude?: string; // Coordenada Latitude
  longitude?: string; // Coordenada Longitude
}

export interface Incident {
  id: string;
  raCode: string;
  buildingId: string;
  userId: string;
  operatorName: string;
  vigilants: string;
  date: string;
  startTime: string;
  endTime: string;
  timestamp: string;
  created_at?: string; // Data real de criação no banco
  alterationType: string;
  description: string;
  aiAnalysis?: string;
  severity?: 'Baixa' | 'Média' | 'Alta';
  photoUrl?: string;
  photos?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string; 
  approvedAt?: string;
  isEdited?: boolean;
  lastEditedAt?: string;
  isLocal?: boolean; // Flag para indicar que o dado só existe localmente
}

export interface Vehicle {
  id: string;
  model: string;         // Modelo
  plate: string;         // Placa
  prefix: string;        // Prefixo
  fleetNumber: string;   // Numero de Frota
  fuelType: string;      // Combustível
  department: string;    // Secretaria
  currentKm?: number;    // Quilometragem Atual
}

export interface Vest {
  id: string;
  number: string;        // Número
  size: string;          // Tamanho
}

export interface Radio {
  id: string;
  number: string;        // Número
  brand: string;         // Marca
  serialNumber: string;  // Numero de Serie
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  quantity: number;
}

export interface LoanRecord {
  id: string;
  batchId?: string; // ID do lote para agrupar itens
  operatorId: string; // Quem entregou
  receiverId: string; // Quem recebeu
  receiverName: string;
  assetType: 'VEHICLE' | 'VEST' | 'RADIO' | 'EQUIPMENT';
  assetId: string;
  assetDescription: string; // Snapshot do nome/modelo para histórico
  checkoutTime: string;
  returnTime?: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';
  isLocal?: boolean; // Flag para indicar que o dado só existe localmente
  
  // Metadados específicos (JSON no banco)
  meta?: {
    kmStart?: number;
    kmEnd?: number;
    fuelRefill?: boolean;
    fuelLiters?: number;
    fuelType?: string;
    fuelKm?: number;
    notes?: string;
  };
}

export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE_INCIDENT' | 'UPDATE_INCIDENT' | 'APPROVE_INCIDENT' | 'DELETE_RESOURCE' | 'USER_REGISTER' | 'CREATE_ASSET' | 'UPDATE_ASSET' | 'DELETE_ASSET' | 'LOAN_CREATE' | 'LOAN_CONFIRM' | 'LOAN_RETURN' | 'UPDATE_PERMISSIONS' | 'MANAGE_SETTINGS';
  details: string;
  timestamp: string;
}

export type ViewState = 
  | 'DASHBOARD' 
  | 'BUILDINGS' | 'BUILDING_FORM' 
  | 'USERS' | 'USER_FORM' 
  | 'SECTORS' | 'SECTOR_FORM' 
  | 'ALTERATION_TYPES' | 'ALTERATION_TYPE_FORM' 
  | 'NEW_RECORD' | 'HISTORY' | 'INCIDENT_DETAIL' | 'PENDING_APPROVALS' 
  | 'CHARTS' | 'LOGS' | 'TOOLS' | 'DATABASE_TOOLS' | 'PERMISSIONS_TOOLS' | 'LAYOUT_MANAGER' | 'PROFILE'
  | 'VEHICLES' | 'VEHICLE_FORM'
  | 'VESTS' | 'VEST_FORM'
  | 'RADIOS' | 'RADIO_FORM'
  | 'EQUIPMENTS' | 'EQUIPMENT_FORM'
  | 'LOANS'
  | 'LOAN_HISTORY'
  | 'IMPORT_EXPORT';
