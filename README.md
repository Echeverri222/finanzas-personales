# 💰 Finanzas Personales

Una aplicación web moderna para la gestión de finanzas personales, construida con Next.js y Supabase.

## 🚀 Características

- **📊 Dashboard Interactivo**: Visualización de ingresos, gastos y ahorros con gráficos dinámicos
- **💳 Gestión de Movimientos**: Registro y seguimiento de transacciones financieras
- **🎯 Metas Financieras**: Establecimiento y monitoreo de objetivos de ahorro
- **📈 Análisis de Inversiones**: Seguimiento de acciones y análisis de mercado
- **🔐 Autenticación Segura**: Login con Google y autenticación por email
- **📱 Diseño Responsivo**: Optimizado para dispositivos móviles y desktop

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Gráficos**: Recharts
- **Autenticación**: Supabase Auth
- **APIs**: Financial Modeling Prep (para datos de acciones)

## 📋 Prerequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- API Key de Financial Modeling Prep (opcional)

## ⚙️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd finanzas-personales
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear archivo `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   NEXT_PUBLIC_FMP_API_KEY=tu_fmp_api_key
   ```

4. **Configurar base de datos**
   
   Ejecutar las siguientes tablas en Supabase:
   ```sql
   -- Tabla de usuarios
   CREATE TABLE usuarios (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     nombre TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de tipos de movimiento
   CREATE TABLE tipo_movimiento (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     usuario_id UUID REFERENCES usuarios(id),
     nombre TEXT NOT NULL,
     meta DECIMAL DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de movimientos
   CREATE TABLE movimientos (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     usuario_id UUID REFERENCES usuarios(id),
     id_tipo_movimiento UUID REFERENCES tipo_movimiento(id),
     nombre TEXT NOT NULL,
     importe DECIMAL NOT NULL,
     fecha DATE NOT NULL,
     descripcion TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de metas
   CREATE TABLE metas (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     usuario_id UUID REFERENCES usuarios(id),
     nombre TEXT NOT NULL,
     monto_objetivo DECIMAL NOT NULL,
     monto_actual DECIMAL DEFAULT 0,
     fecha_objetivo DATE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

## 🚀 Uso

### Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Producción
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## 📁 Estructura del Proyecto

```
finanzas-personales/
├── components/          # Componentes reutilizables
│   ├── Auth.jsx        # Componente de autenticación
│   ├── dashboard/      # Componentes del dashboard
│   ├── ui/            # Componentes de UI (Button, Card, etc.)
│   └── ...
├── contexts/          # Contextos de React
│   ├── AuthContext.js # Contexto de autenticación
│   └── UserContext.js # Contexto de usuario
├── hooks/            # Custom hooks
│   ├── useMovimientos.js
│   ├── useMetas.js
│   └── useStockData.js
├── lib/              # Utilidades y configuración
│   ├── supabaseClient.js
│   └── constants.js
├── pages/            # Páginas de Next.js
│   ├── dashboard.js  # Dashboard principal
│   ├── movimientos/  # Gestión de movimientos
│   ├── metas.js      # Gestión de metas
│   └── ...
└── styles/           # Estilos globales
```

## 🔧 Funcionalidades Principales

### Dashboard
- Resumen financiero con gráficos interactivos
- Filtros por año, mes y categoría
- Evolución mensual de ingresos y gastos
- Distribución de gastos por categoría

### Movimientos
- Registro de ingresos, gastos y ahorros
- Categorización personalizable
- Filtros y búsqueda avanzada
- Historial completo de transacciones

### Metas
- Establecimiento de objetivos financieros
- Seguimiento de progreso
- Alertas de cumplimiento

### Análisis de Inversiones
- Seguimiento de acciones
- Gráficos de rendimiento
- Datos en tiempo real (con API key)

## 🚨 Estado Actual

⚠️ **IMPORTANTE**: Esta aplicación está en desarrollo. Algunas funcionalidades pueden usar datos de prueba.

### ✅ Completado
- Autenticación con Supabase
- Dashboard con gráficos
- Gestión básica de movimientos
- Interfaz responsiva

### 🔄 En Desarrollo
- Integración completa con base de datos
- API de acciones en tiempo real
- Optimizaciones de rendimiento

### 📋 Pendiente
- Tests automatizados
- Documentación de API
- Optimizaciones de SEO

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Si tienes preguntas o necesitas ayuda, por favor:
- Abre un issue en GitHub
- Revisa la documentación de [Supabase](https://supabase.com/docs)
- Consulta la documentación de [Next.js](https://nextjs.org/docs)

---

**Desarrollado con ❤️ para ayudarte a gestionar mejor tus finanzas personales.**
