/** @prettier */
/*
 * Copyright 2017 Turbine Labs, Inc.
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/* globals chrome getCookieNameFromSharedRules getInstanceVersionsFromCluster */
let HOST_URL = new URL('https://app.turbinelabs.io')
const API_BASE = 'https://api.turbinelabs.io/v1.0'
const API_KEY_STORAGE_KEY = 'io.turbinelabs.houston-crx.api-key'
const HOST_STORAGE_KEY = 'io.turbinelabs.houston-crx.host'
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
const AUTH_HEADER = 'Authorization'
let API_KEY

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.update) {
    update()
  }
})

function getApiKeyAndHost() {
  return new Promise(resolve => {
    chrome.storage.sync.get([API_KEY_STORAGE_KEY, HOST_STORAGE_KEY], val => {
      resolve(val)
    })
  })
}

// map cluster names to cookie names and current cookie values
let cookieNameMap = new Map()

// map of zone/cluster names we've processed
let clusterSeenInZone = new Set()

// generate a menu click handler that closes over the cookie's name and value
function setHandler(cookieName, cookieValue) {
  return (info, tab) => {
    const newCookie = {
      url: HOST_URL.href,
      domain: HOST_URL.domain,
      path: '',
      name: cookieName,
      value: cookieValue,
      expirationDate: Date.now() / 1000 + 7 * 24 * 60 * 60 * 60,
    }
    chrome.cookies.set(newCookie, cookie => {
      if (cookie == null) {
        console.error('error setting cookie', chrome.runtime.lastError)
      } else {
        // update cookieNameMap
        getAll()
        // update the menu item as checked
        chrome.contextMenus.update(info.menuItemId, { checked: true })
      }
    })
  }
}

function removeHandler(menuId, cookieName) {
  return (info, tab) => {
    chrome.cookies.remove(
      {
        url: HOST_URL.href,
        name: cookieName,
      },
      details => {
        if (details) {
          chrome.contextMenus.update(menuId, { checked: true })
        } else {
          console.error(`error removing cookie: ${chrome.runtime.lastError}`)
        }
      },
    )
  }
}

function removeAll() {
  cookieNameMap.forEach((v, k, m) => {
    if (v.removeCookie) {
      v.removeCookie()
    }
  })
}

// promisify getting a cookie, resolves with `null` or the cookie's value
function getCookie(cookieName) {
  return new Promise(resolve => {
    chrome.cookies.get(
      {
        url: HOST_URL.href,
        name: cookieName,
      },
      cookie => {
        resolve(cookie && cookie.value)
      },
    )
  })
}

function apiCall(endpoint) {
  let apiHeaders = {
    Accept: 'application/json',
  }
  // handle old (bare) API keys
  if (UUID_REGEX.exec(API_KEY)) {
    apiHeaders[AUTH_HEADER] = API_KEY
  } else {
    // newer base64 encoded keys get a Token prefix
    apiHeaders[AUTH_HEADER] = `Token ${ API_KEY }`
  }
  return fetch(`${API_BASE}${endpoint}`, {
    headers: apiHeaders,
  })
    .then(res => res.json())
    .then(json => json.result)
}

// gets all the cookies and updates cookieNameMap
function getAll() {
  return Object.keys(cookieNameMap).map(k => {
    return getCookie(cookieNameMap.get(k).name).then(
      c => (cookieNameMap.get(k).currentValue = c),
    )
  })
}

function openOptions() {
  chrome.runtime.openOptionsPage()
}

function update() {
  getApiKeyAndHost()
    .then(val => {
      if (val[HOST_STORAGE_KEY]) {
        HOST_URL = new URL(val[HOST_STORAGE_KEY])
      }
      if (val[API_KEY_STORAGE_KEY]) {
        API_KEY = val[API_KEY_STORAGE_KEY]
        return API_KEY
      }
      console.error('no api key...')
      chrome.contextMenus.removeAll()
      chrome.contextMenus.create({
        title: 'Please set your API KEY in settings...',
        onclick: openOptions,
      })
      throw new Error('no Turbine API key set')
    })
    .then(() => {
      return Promise.all([
        apiCall('/zone'),
        apiCall('/cluster'),
        apiCall('/shared_rules'),
        ...getAll(),
      ])
    })
    .then(([zones, clusters, sharedRules]) => {
      cookieNameMap = new Map()
      chrome.contextMenus.removeAll()
      chrome.contextMenus.create({
        title: 'Clear All Version Cookies',
        contexts: ['page'],
        onclick: removeAll,
      })
      chrome.contextMenus.create({
        title: 'Refresh',
        contexts: ['page'],
        onclick: update,
      })
      chrome.contextMenus.create({ type: 'separator' })

      zones.sort((a, b) =>
        a.name.localeCompare(b.name)
      ).forEach(z => {
        // create a menu for each zone...
        const zoneMenuId = chrome.contextMenus.create({
          title: z.name,
          contexts: ['page'],
        })

        // get only the clusters for the current zone...
        clusters.filter(c =>
          c.zone_key === z.zone_key
        ).sort((a, b) =>
          a.name.localeCompare(b.name)
        ).forEach(c => {
          sharedRules.forEach(s => {
            let cookieName = getCookieNameFromSharedRules(s, c)
            if (cookieName !== null) {
              // if we've already encountered this name/cookie in this zone from
              // another shared rule, skip it.
              let zoneAndClusterName = `${z.name}-${c.name}-${cookieName}`
              if (clusterSeenInZone.has(zoneAndClusterName)) {
                return
              }
              clusterSeenInZone.add(zoneAndClusterName, true)

              // cache the current value of the cookie, so that if it's set
              // from some other sharedRules, it is checked here.
              if (!cookieNameMap.get(c.name)) {
                cookieNameMap.set(c.name, {
                  name: cookieName,
                  currentValue: '',
                })
              } else {
                cookieName = cookieNameMap.get(c.name).name
              }

              const currentValue =
                cookieNameMap.get(c.name) &&
                cookieNameMap.get(c.name).currentValue

              const clusterMenuId = chrome.contextMenus.create({
                title: `${c.name}: ${cookieName}`,
                parentId: zoneMenuId,
              })
              let checked = !currentValue
              // for each cluster with a cookie, add a `<none>` menu item that unsets it
              // note we set the menu id here so we can force these all to checked from 'clear all'
              let noneId = `${clusterMenuId}-${cookieName}-none-id`
              cookieNameMap.get(c.name).removeCookie = removeHandler(
                noneId,
                cookieName,
              )
              chrome.contextMenus.create({
                id: noneId,
                type: 'radio',
                checked: checked,
                title: '<none>',
                parentId: clusterMenuId,
                onclick: removeHandler(noneId, cookieName),
              })

              // for each instance in the cluster, find metadata with key: `version`
              // and add the key to the menu with a click handler
              getInstanceVersionsFromCluster(c).forEach(v => {
                const versionChecked = v === currentValue
                chrome.contextMenus.create({
                  type: 'radio',
                  checked: versionChecked,
                  title: v,
                  parentId: clusterMenuId,
                  onclick: setHandler(cookieName, v),
                })
              })
            }
          })
        })
      })
    })
    .catch(err => {
      console.error('error', err)
    })
}

update()
