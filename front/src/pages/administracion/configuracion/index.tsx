import { useState } from 'react'
import { Tabs } from 'antd'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Tarjeta from 'components/ui/Tarjeta'
import TabCorreo from './componentes/TabCorreo'
import TabMarca from './componentes/TabMarca'
import TabRegional from './componentes/TabRegional'
import TabReportes from './componentes/TabReportes'
import ExportarImportar from './componentes/ExportarImportar'

export const ROLES_CONFIGURACION = ['ADMINISTRADOR', 'CONFIGURACION-EDITAR']

/** Configuración del cliente (plan 03, fase 4): marca, correo, reportes y regional, sin redesplegar. */
export default function Configuracion() {
  // Tras importar se vuelven a montar las pestañas para que lean la configuración nueva
  const [generacion, setGeneracion] = useState(0)
  return (
    <ACL roles={ROLES_CONFIGURACION} redirect>
      <Titulo texto="Configuración" />
      <Tarjeta
        title="Configuración del sistema"
        extra={<ExportarImportar alImportar={() => setGeneracion(g => g + 1)} />}
      >
        <Tabs
          key={generacion}
          destroyOnHidden={false}
          items={[
            { key: 'marca', label: 'Marca', children: <TabMarca /> },
            { key: 'correo', label: 'Correo', children: <TabCorreo /> },
            { key: 'reportes', label: 'Reportes', children: <TabReportes /> },
            { key: 'regional', label: 'Regional', children: <TabRegional /> },
          ]}
        />
      </Tarjeta>
    </ACL>
  )
}
