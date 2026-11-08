import type { ReactNode } from 'react'
import { Flex, Layout, theme } from 'antd'
import Logo from './Logo'
import PieDePagina from './PieDePagina'

/** Layout de autenticación y páginas de error públicas: barra con logo, contenido centrado y pie. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { token } = theme.useToken()
  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Layout.Header
        style={{ background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 0 }}
      >
        <Logo />
      </Layout.Header>
      <Layout.Content>
        <Flex vertical align="center" style={{ padding: '7vh 16px 0' }}>
          <div style={{ width: '100%', maxWidth: 512 }}>{children}</div>
        </Flex>
      </Layout.Content>
      <Layout.Footer style={{ background: 'transparent', padding: '48px 16px' }}>
        <PieDePagina centrado />
      </Layout.Footer>
    </Layout>
  )
}
