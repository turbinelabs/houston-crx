[//]: # ( Copyright 2017 Turbine Labs, Inc.                                   )
[//]: # ( you may not use this file except in compliance with the License.    )
[//]: # ( You may obtain a copy of the License at                             )
[//]: # (                                                                     )
[//]: # (     http://www.apache.org/licenses/LICENSE-2.0                      )
[//]: # (                                                                     )
[//]: # ( Unless required by applicable law or agreed to in writing, software )
[//]: # ( distributed under the License is distributed on an "AS IS" BASIS,   )
[//]: # ( WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or     )
[//]: # ( implied. See the License for the specific language governing        )
[//]: # ( permissions and limitations under the License.                      )

# Houston Chrome Extension

[![Apache 2.0](https://img.shields.io/hexpm/l/plug.svg)](LICENSE)

Easily set version routing cookies for your Houston-fronted application

## Requirements

## Install

* Clone this repo
* In Chrome, open a tab to chrome://extensions
* Check the Developer Mode checkbox
* Click the Load Unpacked extension... button
* Select `<repo base directory>/src`

## Getting Started

* In the settings for 'Houston Chrome Extension', click 'Options'
* Add your Turbine access token, as obtained from `tbnctl`, and click 'Save'
* Set the Host field to the host you wish to set cookies for (e.g. https://www.example.com)
* Close the options
* In another tab, navigate to the host you wish to set cookies for
* Right click anywhere on the page
* Look for the Houston context menu
* Set a cookie
* Refresh the page
* Profit!

### Requesting a Service Version

Houston sets browser cookies that can be used
by [Houston, by Turbine Labs](https://www.turbinelabs.io) to route
traffic to a specific application version.

To set up cookie version routing, you'll need to create a release
group with a request-specific override that

* has a Match Property of type "Cookie"
* has "Match all values" selected for the Match Property
* has a Destination constraint key of "version" whose constraint value
  is bound to the cookie name

By right clicking on a page and selecting the "Houston"
menu entry you can navigate to a zone, see clusters with
cookie routing rules configured, and see available versions within
that cluster. Selecting a version sets a cookie on the domain you
configured in options. When you refresh the page your requests will be
routed to that version of your backing service.

### Refreshing Available Versions

The Houston Chrome Extension will not automatically update the list of
available versions. You can refresh the list by right clicking on the
page, selecting the "Houston" menu item and then clicking "Refresh".

### Clearing Version Cookies

To return to the default service instance you can navigate to a
cluster in the plugin menu and select "<none>". If you wish to remove
all version overrides, right click the page, select the "Houston" menu
item and click "Clear All Version Cookies"

## Versioning

Please see [Versioning of Turbine Labs Open Source Projects](http://github.com/turbinelabs/developer/blob/master/README.md#versioning).

## Pull Requests

Patches accepted! Please see
[Contributing to Turbine Labs Open Source Projects](http://github.com/turbinelabs/developer/blob/master/README.md#contributing).

## Code of Conduct

All Turbine Labs open-sourced projects are released with a
[Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in our
projects you agree to abide by its terms, which will be carefully enforced.
