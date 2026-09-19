import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Home } from './Home'

/**
 * Só a porta de entrada é pré-gerada. As telas de dentro dependem de sessão: gerar
 * HTML delas no build entregaria a estranhos o desenho de páginas que eles não podem
 * abrir, sem ganho nenhum.
 *
 * O cliente não hidrata este HTML — ele o substitui ao montar. O ganho é aparecer
 * antes de o JavaScript carregar, não economizar renderização.
 */
export function render(): string {
  return renderToStaticMarkup(
    <StaticRouter location="/">
      <Home />
    </StaticRouter>,
  )
}
