export { getPrefetchConfig }
export type { PrefetchStaticAssets }

import { assert, assertUsage, assertInfo, assertWarning, isPlainObject } from '../utils'

type PageContextPrefetch = {
  exports: Record<string, unknown>
  _isProduction: boolean
  urlOriginal: string
}

type PrefetchStaticAssets =
  | false
  | {
      when: 'HOVER' | 'VIEWPORT'
    }
type PrefetchConfig = {
  prefetchPageContext: false
  prefetchStaticAssets: PrefetchStaticAssets
}

function getPrefetchConfig(pageContext: PageContextPrefetch, linkTag: HTMLElement): PrefetchConfig {
  const prefetchStaticAssets = getStaticAssetsConfig(pageContext, linkTag)
  return {
    prefetchPageContext: false, // https://github.com/brillout/vite-plugin-ssr/issues/246
    prefetchStaticAssets
  }
}
function getStaticAssetsConfig(pageContext: PageContextPrefetch, linkTag: HTMLElement): PrefetchStaticAssets {
  let prefetchStaticAssets = ((): false | { when: 'HOVER' | 'VIEWPORT' } => {
    let prefetchAttribute = getPrefetchAttribute(linkTag)
    if (prefetchAttribute !== null) return prefetchAttribute

    if ('prefetchLinks' in pageContext.exports) {
      assertUsage(false, '`export { prefetchLinks }` is deprecated, use `export { prefetchStaticAssets }` instead.')
    }

    if ('prefetchStaticAssets' in pageContext.exports) {
      const { prefetchStaticAssets } = pageContext.exports
      if (prefetchStaticAssets === false) {
        return false
      }
      const wrongUsageMsg =
        "`prefetchStaticAssets` should be either `false`, `{ when: 'VIEWPORT' }`, or `{ when: 'HOVER' }`"
      assertUsage(isPlainObject(prefetchStaticAssets), wrongUsageMsg)
      const keys = Object.keys(prefetchStaticAssets)
      assertUsage(keys.length === 1 && keys[0] === 'when', wrongUsageMsg)
      const { when } = prefetchStaticAssets
      if (when === 'HOVER' || when === 'VIEWPORT') {
        return { when }
      }
      assertUsage(false, wrongUsageMsg)
    }

    return { when: 'HOVER' }
  })()

  if (prefetchStaticAssets && prefetchStaticAssets.when === 'VIEWPORT' && !pageContext._isProduction) {
    assertInfo(false, 'Viewport prefetching is disabled in development', { onlyOnce: true })
    prefetchStaticAssets = { when: 'HOVER' }
  }

  return prefetchStaticAssets
}

function getPrefetchAttribute(linkTag: HTMLElement): PrefetchStaticAssets | null {
  const attr = linkTag.getAttribute('data-prefetch-static-assets')
  const attrOld = linkTag.getAttribute('data-prefetch')

  if (attr === null && attrOld === null) {
    return null
  }

  const deprecationNotice = 'The attribute data-prefetch is outdated, use data-prefetch-static-assets instead.'

  if (attr) {
    assertUsage(attrOld === null, deprecationNotice)
    if (attr === 'hover') {
      return { when: 'HOVER' }
    }
    if (attr === 'viewport') {
      return { when: 'VIEWPORT' }
    }
    if (attr === 'false') {
      return false
    }
    assertUsage(
      false,
      `data-prefetch-static-assets has value "${attr}" but it should instead be "false", "hover", or "viewport"`
    )
  }

  if (attrOld) {
    assert(!attr)
    assertWarning(false, deprecationNotice, {
      showStackTrace: false,
      onlyOnce: true
    })
    if (attrOld === 'true') {
      return { when: 'VIEWPORT' }
    }
    if (attrOld === 'false') {
      return { when: 'HOVER' }
    }
    assertUsage(false, `data-prefetch has value "${attrOld}" but it should instead be "true" or "false"`)
  }

  assert(false)
}
