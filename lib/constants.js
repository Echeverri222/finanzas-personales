// UI Constants for consistent styling and behavior

// Semantic type of a category, mirroring the Postgres enum public.tipo_categoria
// (see supabase/migrations/*_add_tipo_to_tipo_movimiento.sql).
//
// Read tipo_movimiento.tipo, never the category NAME. Names are user-editable
// free text: renaming a category used to silently reclassify every historical
// movimiento, and the same name means different things to different users
// ('Inversiones' is lending for one user, brokerage deposits for another).
export const TIPO = {
  INGRESO: 'ingreso',
  GASTO: 'gasto',
  AHORRO: 'ahorro',
  INVERSION: 'inversion',
  PRESTAMO: 'prestamo',
};

// Chart dimensions
export const CHART_DIMENSIONS = {
  PIE_OUTER_RADIUS: '70%',
  PIE_INNER_RADIUS: '45%',
  PIE_OUTER_RADIUS_MOBILE: '65%',
  PIE_INNER_RADIUS_MOBILE: '40%',
  CHART_HEIGHT_MOBILE: 'h-60',
  CHART_HEIGHT_DESKTOP: 'md:h-80',
  CHART_MARGIN: { top: 5, right: 20, left: 20, bottom: 5 }
};

// Colors for charts and categories
export const COLORS = {
  'Ingresos': '#10B981',
  'Alimentacion': '#60A5FA', 
  'Transporte': '#34D399',
  'Compras': '#F87171',
  'Gastos fijos': '#FBBF24',
  'Ahorro': '#6366F1',
  'Salidas': '#34D399',
  'Otros': '#A78BFA',
  // Status colors
  'SUCCESS': '#10B981',
  'WARNING': '#FBBF24', 
  'ERROR': '#EF4444',
  'INFO': '#3B82F6'
};

// Progress thresholds
export const PROGRESS_THRESHOLDS = {
  HIGH: 100, // Completed
  MEDIUM: 70, // Good progress
  LOW: 0     // Just started
};

// Animation durations (in ms)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  CHART_TRANSITION: 'all duration-300'
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px', 
  LG: '1024px',
  XL: '1280px'
};

// Common spacing values
export const SPACING = {
  SIDEBAR_WIDTH: 'w-64',
  SIDEBAR_WIDTH_COLLAPSED: 'w-16',
  MOBILE_HEADER_HEIGHT: 'h-16',
  CARD_PADDING: 'p-4',
  CARD_MARGIN: 'space-y-4 md:space-y-6'
};

// Form validation
export const VALIDATION = {
  MIN_GOAL_AMOUNT: 1,
  MAX_GOAL_AMOUNT: 1000000,
  MIN_MOVEMENT_AMOUNT: 0.01,
  MAX_MOVEMENT_DESCRIPTION: 255
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'es-ES', // For toLocaleDateString
  INPUT: 'YYYY-MM-DD', // For HTML date inputs
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ' // For database storage
};

// Currency formatting.
// Default only -- the source of truth is usuarios.currency (default 'COP').
// Amounts are Colombian pesos; formatting them as en-US/USD rendered
// COP $29.000 as "$29,000" on every screen.
// COP has no practical subunit in daily use, so 0 fraction digits is correct.
export const CURRENCY = {
  LOCALE: 'es-CO',
  CURRENCY: 'COP',
  MIN_FRACTION_DIGITS: 0,
  MAX_FRACTION_DIGITS: 0
};

// Loading and error states
export const STATES = {
  LOADING: 'loading',
  SUCCESS: 'success', 
  ERROR: 'error',
  IDLE: 'idle'
};

// Common messages
export const MESSAGES = {
  LOADING: 'Cargando...',
  ERROR_GENERIC: 'Ha ocurrido un error inesperado',
  ERROR_NETWORK: 'Error de conexión. Verifica tu internet.',
  ERROR_AUTH: 'Error de autenticación. Inicia sesión nuevamente.',
  SUCCESS_SAVE: 'Guardado exitosamente',
  SUCCESS_DELETE: 'Eliminado exitosamente',
  CONFIRM_DELETE: '¿Estás seguro de que quieres eliminar este elemento?'
};

// API endpoints and keys
export const API = {
  SUPABASE_RETRY_ATTEMPTS: 3,
  SUPABASE_RETRY_DELAY: 1000, // ms
  CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  STALE_TIME: 2 * 60 * 1000  // 2 minutes
};
