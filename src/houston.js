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

function getCookieNameFromSharedRules(sharedRules, cluster) {
  let cookieName = null
  // if this sharedRules doesn't have any overrides, it definitely
  // doesn't have a cookie version override
  if (!sharedRules.rules || sharedRules.rules.length === 0) {
    return null
  }
  sharedRules.rules.forEach(r => {
    // step 1: find a rule with a light constraint that routes to our cluster
    r.constraints.light.forEach(l => {
      if (l.cluster_key === cluster.cluster_key) {
        // step 2: the rule should have no bound constraints
        if (l.metadata.length === 0) {
          r.matches.forEach(match => {
            // step 3: it should have a match of type cookie, on key version
            if (match.kind === 'cookie' && match.to.key === 'version') {
              // if ALL this applies, we have a version routing cookie
              cookieName = match.from.key
            }
          })
        }
      }
    })
  })
  return cookieName
}

function getInstanceVersionsFromCluster(cluster) {
  let versions = new Set()
  if (cluster.instances) {
    cluster.instances.forEach(i => {
      i.metadata.filter(m => m.key === 'version').forEach(m => {
        versions.add(m.value)
      })
    })
  }
  return versions
}

if (typeof module !== 'undefined') {
  module.exports = {
    getCookieNameFromSharedRules: getCookieNameFromSharedRules,
    getInstanceVersionsFromCluster: getInstanceVersionsFromCluster,
  }
}
