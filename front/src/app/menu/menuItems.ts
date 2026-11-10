import type { ComponentType } from 'react'
import {
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  BankOutlined,
  BookOutlined,
  ExportOutlined,
  PlusOutlined,
  PrinterOutlined,
  ProjectOutlined,
  TruckOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons'

/**
 * Menú lateral (antes `services/menu/index.js`, con iconos de fuente icomoon). Cada entrada declara el `role`
 * (código de rol del API) que la muestra; `ADMINISTRADOR` ve todo. Las categorías son títulos de grupo.
 * Los roles del menú no siempre coinciden con los del `ACL` de la página: ver `docs/front/inventario-rutas.md` (F23).
 */
export interface EntradaMenu {
  key?: string
  title: string
  role: string
  url?: string
  icon?: ComponentType
  category?: boolean
  children?: EntradaMenu[]
}

export const menuItems: EntradaMenu[] = [
  {
    category: true,
    title: 'Catálogos',
    role: 'V-CATALOGOS-TITULO',
  },
  {
    title: 'Catálogos',
    key: 'catalogos',
    icon: BookOutlined,
    role: 'V-CATALOGO-MENU',
    children: [
      {
        key: 'Catalogo-General',
        title: 'Búsqueda General',
        url: '/catalogo/general',
        role: 'V-CATALOGO-GENERAL',
      },
      {
        key: 'Catalogo-Codigos',
        title: 'Búsqueda por Códigos',
        url: '/catalogo/por-codigos',
        role: 'V-CATALOGO-CODIGOS',
      },
      {
        key: 'Catalogo-Bajas',
        title: 'Búsqueda Bajas',
        url: '/catalogo/bajas',
        role: 'V-CATALOGO-BAJAS',
      },
      {
        key: 'Catalogo-Proyecto',
        title: 'Búsqueda por Proyecto',
        url: '/catalogo/por-proyecto',
        role: 'V-CATALOGO-PROYECTO',
      },
      {
        key: 'Catalogo-Validaciones',
        title: 'Búsqueda Validaciones',
        url: '/catalogo/validaciones',
        role: 'V-CATALOGO-VALIDACIONES',
      },
      {
        key: 'Catalogo-Inventario',
        title: 'Búsqueda Inventario',
        url: '/catalogo/inventario',
        role: 'V-CATALOGO-INVENTARIO',
      },
    ],
  },
  {
    category: true,
    title: 'Operaciones',
    role: 'V-OPERACIONES-TITULO',
  },
  {
    title: 'Préstamos',
    key: 'operaciones-Prestamos',
    role: 'V-OPERACION-PRESTAMO',
    icon: ArrowRightOutlined,
    children: [
      {
        key: 'operaciones-Prestamos-Nuevo',
        title: 'Salida',
        url: '/prestamos/nuevo',
        role: 'V-OPERACION-PRESTAMONUEVO',
      },
      {
        key: 'operaciones-Prestamos-ListadoPorProyecto',
        title: 'Por Proyecto',
        url: '/prestamos/por-proyecto',
        role: 'V-OPERACION-PRESTAMOPORPROYECTO',
      },
      {
        key: 'operaciones-Prestamos-ListadoPorGrupo',
        title: 'Por Listado',
        url: '/prestamos/por-grupo',
        role: 'V-OPERACION-PRESTAMOPORGRUPO',
      },
      {
        key: 'operaciones-prestamos-activos',
        title: 'Préstamos Activos',
        url: '/prestamos/activos',
        role: 'V-OPERACION-PRESTAMOSACTIVOS',
      },
    ],
  },
  {
    title: 'Devoluciones',
    key: 'operaciones-devoluciones',
    role: 'V-OPERACION-DEVOLUCION',
    icon: ArrowLeftOutlined,
    children: [
      {
        key: 'operaciones-devoluciones-Nuevo',
        title: 'Devolución',
        url: '/devoluciones/nuevo',
        role: 'V-OPERACION-DEVOLUCIONNUEVO',
      },
      {
        key: 'operaciones-devoluciones-NuevoExterna',
        title: 'Devolución Externa',
        url: '/devoluciones/nuevo-externa',
        role: 'V-OPERACION-DEVOLUCIONNUEVOEXTERNA',
      },
      {
        key: 'operaciones-Devoluciones-ListadoPorProyecto',
        title: 'Por Proyecto',
        url: '/devoluciones/por-proyecto',
        role: 'V-OPERACION-DEVOLUCIONPORPROYECTO',
      },
      {
        key: 'operaciones-Devoluciones-ListadoPorGrupo',
        title: 'por Listado',
        url: '/devoluciones/por-grupo',
        role: 'V-OPERACION-DEVOLUCIONPORGRUPO',
      },
    ],
  },
  {
    title: 'Bajas',
    key: 'operaciones-Bajas',
    role: 'V-OPERACION-BAJA',
    icon: ArrowDownOutlined,
    children: [
      {
        key: 'operaciones-Bajas-ConProyecto',
        title: 'con Proyecto',
        role: 'V-OPERACION-BAJACONPROYECTO',
        children: [
          {
            key: 'operaciones-Bajas-ConProyecto-Nuevo',
            title: 'Baja',
            url: '/bajas/nuevo',
            role: 'V-OPERACION-BAJACONPROYECTO-NUEVO',
          },
          {
            key: 'operaciones-Bajas-ConProyecto-ListadoPorProyecto',
            title: 'Por Proyecto',
            url: '/bajas/por-proyecto',
            role: 'V-OPERACION-BAJACONPROYECTO-LISTADOPORPROYECTO',
          },
          {
            key: 'operaciones-Bajas-ConProyecto-ListadoPorGrupo',
            title: 'Por Listado',
            url: '/bajas/por-grupo',
            role: 'V-OPERACION-BAJACONPROYECTO-LISTADOPORGRUPO',
          },
        ],
      },
      {
        key: 'operaciones-Bajas-SinProyecto',
        title: 'Sin Proyecto',
        role: 'V-OPERACION-BAJASINRPOYECTO',
        children: [
          {
            key: 'operaciones-Bajas-SinProyecto-Nuevo',
            title: 'Baja Sin Proyecto',
            url: '/bajas/sin-proyecto/nuevo',
            role: 'V-OPERACION-BAJASINRPOYECTO-NUEVO',
          },
          {
            key: 'operaciones-Bajas-SinProyecto-ListadoPorGrupo',
            title: 'Por Listado',
            url: '/bajas/sin-proyecto/por-grupo',
            role: 'V-OPERACION-BAJASINRPOYECTO-LISTADOPORPROYECTO',
          },
        ],
      },
    ],
  },
  {
    title: 'Compras / Facturas',
    key: 'operaciones-Compras',
    role: 'V-OPERACION-COMPRA',
    icon: PlusOutlined,
    children: [
      {
        key: 'operaciones-Compras-Nuevo',
        title: 'Nueva Factura',
        url: '/compras/nuevo',
        role: 'V-OPERACION-COMPRANUEVO',
      },
      {
        key: 'operaciones-Compras-ListadoPorProyecto',
        title: 'Compras Por Proyecto',
        url: '/compras/por-proyecto',
        role: 'V-OPERACION-COMPRAPORPROYECTO',
      },
      {
        key: 'operaciones-Compras-ListadoPorFacturas',
        title: 'Listado de facturas',
        url: '/compras/por-factura',
        role: 'V-OPERACION-COMPRAPORGRUPO',
      },
    ],
  },
  {
    title: 'Altas',
    key: 'operaciones-Altas',
    role: 'V-OPERACION-ALTA',
    icon: ArrowUpOutlined,
    children: [
      {
        key: 'operaciones-Altas-Nuevo',
        title: 'Alta',
        url: '/altas/nuevo',
        role: 'V-OPERACION-ALTANUEVO',
      },
      {
        key: 'operaciones-Altas-ListadoPorGrupo',
        title: 'por Listado',
        url: '/altas/por-grupo',
        role: 'V-OPERACION-ALTAPORGRUPO',
      },
    ],
  },
  {
    title: 'Rentas Externas',
    key: 'operaciones-RentasExternas',
    role: 'V-OPERACION-RENTAEXTERNA',
    icon: ExportOutlined,
    children: [
      {
        key: 'operaciones-RentasExternas-Nuevo',
        title: 'Salida Externa',
        url: '/renta-externa/nuevo',
        role: 'V-OPERACION-RENTAEXTERNANUEVO',
      },
      {
        key: 'operaciones-RentasExternas-ListadoPorGrupo',
        title: 'Por Listado',
        url: '/renta-externa/por-grupo',
        role: 'V-OPERACION-RENTAEXTERNAPORGRUPO',
      },
      {
        key: 'operaciones-RentasExternas-ListadoPorProyecto',
        title: 'Por Proyecto',
        url: '/renta-externa/por-proyecto',
        role: 'V-OPERACION-RENTAEXTERNAPORPROYECTO',
      },
      {
        key: 'operaciones-RentasExternas-RentasExternas',
        title: 'Rentas Activas',
        url: '/renta-externa/activos',
        role: 'V-OPERACION-RENTAEXTERNAACTIVA',
      },
    ],
  },
  {
    title: 'Previos',
    key: 'operaciones-Previos',
    role: 'V-OPERACION-PREVIO',
    icon: UnorderedListOutlined,
    children: [
      {
        key: 'operaciones-Previos-Nuevo',
        title: 'Nuevo Previo',
        url: '/previo/nuevo',
        role: 'V-OPERACION-PREVIONUEVO',
      },
      {
        key: 'operaciones-Previos-ListadoPorGrupo',
        title: 'por Listado',
        url: '/previo/por-grupo',
        role: 'V-OPERACION-PREVIOPORGRUPO',
      },
    ],
  },
  {
    category: true,
    title: 'Reportes',
    role: 'V-REPORTES-TITULO',
  },
  {
    title: 'Reportes',
    key: 'reportes',
    icon: PrinterOutlined,
    role: 'V-REPORTES-MENU',
    children: [
      {
        key: 'reportes-porUsuario',
        title: 'Por Usuario',
        url: '/reportes/por-usuario',
        role: 'V-REPORTES-GENERAL',
      },
      {
        key: 'reportes-deCierre',
        title: 'Cierre de Proyecto',
        url: '/reportes/de-cierre',
        role: 'V-REPORTES-GENERAL',
      },
    ],
  },

  {
    category: true,
    title: 'Administración',
    role: 'V-ADMINISTRACION-TITULO',
  },
  {
    title: 'Usuarios',
    key: 'usuarios',
    icon: UserOutlined,
    role: 'V-ADMINISTRACION-USUARIOS',
    children: [
      {
        key: 'usuarios-nuevo',
        title: 'Nuevo',
        role: 'V-ADMINISTRACION-USUARIOSNUEVO',
        url: '/usuarios/nuevo',
      },
      {
        key: 'usuarios-listado',
        title: 'Listado',
        url: '/usuarios/listado',
        role: 'V-ADMINISTRACION-USUARIOSLISTADO',
      },
      {
        key: 'usuarios-CambiarPassword',
        title: 'Cambiar Passwords',
        url: '/usuarios/cambiar-password',
        role: 'V-ADMINISTRACION-USUARIOSCAMBIARPASSWORD',
      },
    ],
  },
  {
    title: 'Areas',
    key: 'areas',
    icon: AppstoreOutlined,
    role: 'V-ADMINISTRACION-AREAS',
    children: [
      {
        key: 'areasNuevo',
        title: 'Nueva',
        url: '/areas/nuevo',
        role: 'V-ADMINISTRACION-AREASNUEVO',
      },
      {
        key: 'areaslistado',
        title: 'Listado',
        url: '/areas/listado',
        role: 'V-ADMINISTRACION-AREASLISTADO',
      },
    ],
  },
  {
    title: 'Proyectos',
    key: 'proyectos',
    icon: ProjectOutlined,
    role: 'V-ADMINISTRACION-PROYECTOS',
    children: [
      {
        key: 'proyectosNuevo',
        title: 'Nuevo',
        url: '/proyectos/nuevo',
        role: 'V-ADMINISTRACION-PROYECTOSNUEVO',
      },
      {
        key: 'proyectoslistado',
        title: 'Listado',
        url: '/proyectos/listado',
        role: 'V-ADMINISTRACION-PROYECTOSLISTADO',
      },
    ],
  },
  {
    title: 'Almacenes',
    key: 'bodegas',
    icon: BankOutlined,
    role: 'V-ADMINISTRACION-BODEGAS',
    children: [
      {
        key: 'bodegasNuevo',
        title: 'Nuevo',
        url: '/bodegas/nuevo',
        role: 'V-ADMINISTRACION-BODEGASNUEVO',
      },
      {
        key: 'bodegaslistado',
        title: 'Listado',
        url: '/bodegas/listado',
        role: 'V-ADMINISTRACION-BODEGASLISTADO',
      },
    ],
  },
  {
    title: 'Proveedores',
    key: 'proveedores',
    icon: TruckOutlined,
    role: 'V-ADMINISTRACION-PROVEEDORES',
    children: [
      {
        key: 'proveedoresNuevo',
        title: 'Nuevo',
        url: '/proveedores/nuevo',
        role: 'V-ADMINISTRACION-PROVEEDORESNUEVO',
      },
      {
        key: 'proveedoreslistado',
        title: 'Listado',
        url: '/proveedores/listado',
        role: 'V-ADMINISTRACION-PROVEEDORESLISTADO',
      },
    ],
  },
]
