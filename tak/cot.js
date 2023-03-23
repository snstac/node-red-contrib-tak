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
  function tak(config) { // ignore 80002
    RED.nodes.createNode(this, config);
    this.attrkey = config.attr || "_attributes";
    this.charkey = config.chr;
    this.property = config.property || "payload";

    let node = this;

    node.on("input", (msg) => {
      node.status({ fill: "green", shape: "dot", text: "Receiving" });
      let newMsg = [];

      let value = RED.util.getMessageProperty(msg, node.property);
      let payloads = handlePayload(value);

      for (let i = 0; i < 3; i++) {
        let pl = payloads[i]
        
        let takFormat = pl.TAKFormat;
        let error = pl.error;
        delete pl.TAKFormat;
        delete pl.error;
        
        newMsg[i] = {
          "payload": pl,
          "_session": msg._session,
          "error": error,
          "TAKFormat": takFormat
        }
      }

      node.send(newMsg)

      node.status({ fill: "blue", shape: "ring", text: "Idle" });
    });
  }
  RED.nodes.registerType("tak", tak);
};

module.exports = makeTAKNode;
