import React from 'react'

const CSS = `
  /* モバイルChromeでドキュメントリストペインがスクロールできない問題の修正 */
  [data-testid="pane-content"] {
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
`

export function MobileScrollFix(props) {
  const {renderDefault} = props
  React.useEffect(() => {
    const style = document.createElement('style')
    style.id = 'mobile-scroll-fix'
    style.textContent = CSS
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById('mobile-scroll-fix')
      if (el) el.remove()
    }
  }, [])

  return renderDefault(props)
}
