import { Input, Button, Space, type InputRef, type TableColumnType } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

/** Propiedades de filtro que se esparcen en una columna de `Table` (no dependen del tipo de fila). */
export type PropsFiltroColumna = Pick<
  TableColumnType<object>,
  'filterDropdown' | 'filterIcon' | 'filterDropdownProps' | 'filters'
>

/** Elementos de `filters` de una columna (`{ text, value }`). */
export type FiltrosColumna = NonNullable<TableColumnType<object>['filters']>

/** Filtro de texto libre (desplegable con `Input`, «Search» y «Reset»). */
const obtenerPropsBusquedaInput = (): PropsFiltroColumna => {
  let searchInput: InputRef | null = null
  return {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 4 }}>
        <Input
          ref={node => {
            searchInput = node
          }}
          value={selectedKeys[0] === undefined ? undefined : String(selectedKeys[0])}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ width: 188, marginBottom: 4, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button onClick={() => clearFilters?.()} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    filterDropdownProps: {
      onOpenChange: abierto => {
        if (abierto) {
          setTimeout(() => searchInput?.select(), 100)
        }
      },
    },
  }
}

const obtenerPropsBusquedaFecha = (): PropsFiltroColumna => ({})

const obtenerPropsBusquedaCheck = (filters: FiltrosColumna): PropsFiltroColumna => ({
  filters,
})

export { obtenerPropsBusquedaInput, obtenerPropsBusquedaFecha, obtenerPropsBusquedaCheck }
