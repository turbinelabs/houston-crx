/** @prettier */
/* eslint camelcase: ["error", {properties: "never"}]*/
/*
 * Copyright 2018 Turbine Labs, Inc.
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

let houston = require('../src/houston.js')
let assert = require('assert')

let clusterKey = 'ck1'
let versionKey = 'version'
let instanceVersion = '1.0'
let secondInstanceVersion = '1.1'
let cookieName = 'service-version'
let emptySharedRules = {}
let emptyCluster = {}
let populatedCluster = {
  cluster_key: clusterKey,
  instances: [
    {
      metadata: [
        {
          key: versionKey,
          value: instanceVersion,
        },
      ],
    },
  ],
}
let biggerCluster = {
  cluster_key: clusterKey,
  instances: [
    {
      metadata: [
        {
          key: versionKey,
          value: instanceVersion,
        },
      ],
    },
    {
      metadata: [
        {
          key: versionKey,
          value: instanceVersion,
        },
      ],
    },
    {
      metadata: [
        {
          key: versionKey,
          value: secondInstanceVersion,
        },
      ],
    },
  ],
}
let versionedSharedRules = {
  rules: [
    {
      matches: [
        {
          kind: 'cookie',
          from: {
            key: cookieName,
          },
          to: {
            key: 'version',
          },
        },
      ],
      constraints: {
        light: [
          {
            cluster_key: clusterKey,
            metadata: [],
          },
        ],
      },
    },
  ],
}

let noOverridesSharedRules = {
  default: {
    light: [
      {
        cluster_key: clusterKey,
      },
    ],
  },
}

describe('getCookieNameFromSharedRules', () => {
  it('return null with empty shared rules', done => {
    let gotCookieName = houston.getCookieNameFromSharedRules(
      emptySharedRules,
      emptyCluster,
    )
    assert(gotCookieName === null)
    done()
  })
  it('return null with empty cluster', done => {
    let gotCookieName = houston.getCookieNameFromSharedRules(
      emptySharedRules,
      emptyCluster,
    )
    assert(gotCookieName === null)
    done()
  })
  it('return a cookie name with matching rule', done => {
    let gotCookieName = houston.getCookieNameFromSharedRules(
      versionedSharedRules,
      populatedCluster,
    )
    assert(gotCookieName === cookieName)
    done()
  })
  it('return null with a no overrides cluster', done => {
    let gotCookieName = houston.getCookieNameFromSharedRules(
      noOverridesSharedRules,
      populatedCluster,
    )
    assert(gotCookieName === null)
    done()
  })
})

describe('getInstanceVersionsFromCluster', () => {
  it('return empty Set with empty cluster', done => {
    let gotCluster = houston.getInstanceVersionsFromCluster(emptyCluster)
    assert(gotCluster !== null)
    assert(
      Object.prototype.toString.call(gotCluster) ===
        Object.prototype.toString.call(new Set()),
    )
    assert(gotCluster.size === 0)
    done()
  })
  it('return populated set with populated cluster', done => {
    let gotCluster = houston.getInstanceVersionsFromCluster(populatedCluster)
    assert(gotCluster !== null)
    assert(
      Object.prototype.toString.call(gotCluster) ===
        Object.prototype.toString.call(new Set()),
    )
    assert(gotCluster.size === 1)
    assert(gotCluster.has(instanceVersion))
    done()
  })
  it('handle multiple instance versions correctly', done => {
    let gotCluster = houston.getInstanceVersionsFromCluster(biggerCluster)
    assert(gotCluster !== null)
    assert(
      Object.prototype.toString.call(gotCluster) ===
        Object.prototype.toString.call(new Set()),
    )
    assert(gotCluster.size === 2)
    assert(gotCluster.has(instanceVersion))
    assert(gotCluster.has(secondInstanceVersion))
    done()
  })
})
