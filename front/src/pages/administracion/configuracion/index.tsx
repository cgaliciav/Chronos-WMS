import { Tabs } from 'antd'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Tarjeta from 'components/ui/Tarjeta'
import TabCorreo from './componentes/TabCorreo'
import TabMarca from './componentes/TabMarca'
import TabRegional from './componentes/TabRegional'
import TabReportes from './componentes/TabReportes'

export const ROLES_CONFIGURACION = ['ADMINISTRADOR', 'CONFIGURACION-EDITAR']

/** Configuración del cliente (plan 03, fase 4): marca, correo, reportes y regional, sin redesplegar. */
export default function Configuracion() {
  return (
    <ACL roles={ROLES_CONFIGURACION} redirect>
      <Titulo texto="Configuración" />
      <Tarjeta title="Configuración del sistema">
        <Tabs
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
