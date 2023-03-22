#!/usr/bin/env node
/* TAK Node-RED Nodes.

Copyright:: Copyright 2023 Greg Albrecht
Source:: https://github.com/ampledata/node-red-contrib-tak

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/* jslint node: true */
/* jslint white: true */

const { handlePayload } = require("./cotLib");

const makeTAKNode = (RED) => {
  function tak(config) {
    RED.nodes.createNode(this, config);
    let node = this;

    node.on("input", (msg) => {
      node.status({fill:"green", shape:"dot", text:"RX"});

      let payloads = handlePayload(msg.payload);

      let msg0 = {
        "payload": payloads[0],
        "_session": msg._session
      }
      let msg1 = {
        "payload": payloads[1],
        "_session": msg._session
      }
      let msg2 = {
        "payload": payloads[2],
        "_session": msg._session
      }
      let newMsgs = [msg0, msg1, msg2]

      node.send(newMsgs)

      node.status({fill:"blue", shape:"ring", text:"Idle"});

    });
  }
  RED.nodes.registerType("tak", tak);
};

module.exports = makeTAKNode;
