import { useState } from 'react'
import { Popconfirm, Tag, Tooltip, type TableColumnsType } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import { obtenerPropsBusquedaInput } from 'pages/componentes/filtrosTablas'
import TablaListados from 'pages/operaciones/componentes/tablaListados'
import type { Grupo } from 'types/api'
import { Link } from 'react-router'

const PrestamosListado = () => {
  const [conteoRefresh, setConteoRefresh] = useState(0)

  const eliminarListado = (id: number) => {
    GrupoPeticiones.quitar({ grupoId: id })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({
            title: 'Grupo eliminado correctamente',
          })
          setConteoRefresh(conteoRefresh + 1)
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
  }

  const columns: TableColumnsType<Grupo> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'grupo.nombre',
      sorter: true,
      ...obtenerPropsBusquedaInput(),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'grupo.fecha',
      sorter: true,
      render: (fecha: string) => {
        return dayjs(fecha).format('D-MMM-YY HH:mm:ss')
      },
    },
    {
      title: 'Proyecto',
      dataIndex: ['grupoDetalle', 'proyecto', 'nombre'],
      key: 'proyecto.nombre',
      sorter: true,
      ...obtenerPropsBusquedaInput(),
    },
    {
      title: '# movimientos',
      dataIndex: 'movimientosTotales',
    },
    {
      title: 'Acciones',
      dataIndex: 'id',
      render: (id: number, record) => (
        <span>
          <Tooltip title="Ver listado">
            <Tag color="blue">
              <Link to={`/prestamos/operacion?uid=${id}`}>
                <EditOutlined />
              </Link>
            </Tag>
          </Tooltip>
          {/* `list-by-group-antd` añade `fecha` y `movimientosTotales` al grupo. */}
          {'movimientosTotales' in record && record.movimientosTotales === 0 ? (
            <Popconfirm
              title="¿Estas seguro que quieres eliminar el listado?"
              onConfirm={() => eliminarListado(id)}
              onCancel={() => {}}
              okText="Sí"
              cancelText="No"
            >
              <Tooltip title="Eliminar listado">
                <Tag color="red">
                  <a href="#">
                    <DeleteOutlined />
                  </a>
                </Tag>
              </Tooltip>
            </Popconfirm>
          ) : null}
        </span>
      ),
      width: '15%',
    },
  ]

  return (
    <ACL roles={['V-OPERACION-PRESTAMOPORGRUPO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Listado Préstamos" />
      <Encabezado>Listados Préstamos</Encabezado>
      <Tarjeta>
        <TablaListados
          columns={columns}
          fnPeticion={GrupoPeticiones.listadoPorGrupo}
          movimientoTipoId={3}
          titulo="Préstamos"
          conteoRefresh={conteoRefresh}
        />
      </Tarjeta>
    </ACL>
  )
}

export default PrestamosListado
