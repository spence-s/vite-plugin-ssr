export { preparePageContextForUserConsumptionClientSide }
export type { PageContextForUserConsumptionClientSide }

import { assert, isObject, objectAssign } from './utils'
import { sortPageContext } from '../shared/sortPageContext'
import type { PageContextExports } from '../shared/getPageFiles'
import type {
  PageContextBuiltInClientWithServerRouting,
  PageContextBuiltInClientWithClientRouting
} from '../shared/types'
import { addIs404ToPageProps } from '../shared/addIs404ToPageProps'
import type { PageConfig } from '../shared/page-configs/PageConfig'
import { getPageContextProxyForUser } from './getPageContextProxyForUser'

type PageContextForUserConsumptionClientSide = PageContextExports & {
  _pageContextRetrievedFromServer: null | Record<string, unknown>
  _comesDirectlyFromServer: boolean
  _pageId: string
  _pageConfigs: PageConfig[]
}

// Release `pageContext` for user consumption.
//
// This adds `assertPassToClient()`.
//
// With Vue support (when `pageContext` is made reactive with Vue).
//
// For Vue + Cient Routing, the `pageContext` needs to be made reactive:
// ```js
// import { reactive } from 'vue'
// // See entire example at `/examples/vue-full/`
// const pageContextReactive = reactive(pageContext)
// ```
function preparePageContextForUserConsumptionClientSide<T extends PageContextForUserConsumptionClientSide>(
  pageContext: T,
  isClientRouting: boolean
): T & { Page: unknown } {
  if (isClientRouting) {
    const pageContextTyped = pageContext as any as PageContextBuiltInClientWithClientRouting
    assert([true, false].includes(pageContextTyped.isHydration))
    assert([true, false, null].includes(pageContextTyped.isBackwardNavigation))
  } else {
    const pageContextTyped = pageContext as any as PageContextBuiltInClientWithServerRouting
    assert(pageContextTyped.isHydration === true)
    assert(pageContextTyped.isBackwardNavigation === null)
  }

  assert('config' in pageContext)
  assert('configEntries' in pageContext)
  // TODO/v1-release: remove
  assert('exports' in pageContext)
  assert('exportsAll' in pageContext)
  assert('pageExports' in pageContext)
  assert(isObject(pageContext.pageExports))

  const Page = pageContext.exports.Page
  objectAssign(pageContext, { Page })

  // For Vue's reactivity
  resolveGetters(pageContext)

  // For prettier `console.log(pageContext)`
  sortPageContext(pageContext)

  assert([true, false].includes(pageContext._comesDirectlyFromServer))
  const pageContextForUserConsumption = getPageContextProxyForUser(pageContext)

  addIs404ToPageProps(pageContext)

  return pageContextForUserConsumption
}

// Remove propery descriptor getters because they break Vue's reactivity.
// E.g. resolve the `pageContext.urlPathname` getter.
function resolveGetters(pageContext: Record<string, unknown>) {
  Object.entries(pageContext).forEach(([key, val]) => {
    delete pageContext[key]
    pageContext[key] = val
  })
}
