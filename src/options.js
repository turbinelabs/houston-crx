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

/* globals chrome */
let API_KEY_STORAGE_KEY = 'io.turbinelabs.houston-crx.api-key'
let HOST_STORAGE_KEY = 'io.turbinelabs.houston-crx.host'

function saveOptions() {
  const apiKey = document.getElementById('api-key').value
  const host = document.getElementById('app-host').value
  chrome.storage.sync.set(
    {
      [API_KEY_STORAGE_KEY]: apiKey,
      [HOST_STORAGE_KEY]: host,
    },
    () => {
      // Update status to let user know options were saved.
      let status = document.getElementById('status')
      if (chrome.runtime.lastError) {
        status.textContent = 'Uh-oh ' + chrome.runtime.lastError
      } else {
        status.textContent = 'Options saved.'
        // dispatch to the background js to update the menu
        chrome.runtime.sendMessage({ update: true })
      }
    },
  )
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get([API_KEY_STORAGE_KEY, HOST_STORAGE_KEY], items => {
    document.getElementById('api-key').value = items[API_KEY_STORAGE_KEY] || ''
    document.getElementById('app-host').value = items[HOST_STORAGE_KEY] || ''
  })
}
document.addEventListener('DOMContentLoaded', restoreOptions)
document.getElementById('save').addEventListener('click', saveOptions)
