#!/usr/bin/env node
/* TAK Node-RED Nodes.

Copyright 2023 Sensors & Signals LLC

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
    // ignore 80002
    RED.nodes.createNode(this, config);
    this.attrkey = config.attr || "_attributes";
    this.charkey = config.chr;
    this.property = config.property || "payload";

    let node = this;

    node.on("input", (msg) => {
      node.status({ fill: "green", shape: "dot", text: "Receiving" });
      let newMsg = [];

      let value = RED.util.getMessageProperty(msg, node.property);
      let payload = handlePayload(value);

      if (payload === undefined || payload === null) {
        node.error({ message: "Undefined or null payload." });
        return;
      }

      let error = payload.error;

      if (typeof error !== "undefined" && error !== null) {
        node.error(error);
      } else {
        let payloads = payload.payload;
        let plsType = typeof payloads;

        let plSize = 3;
        if (plsType === "object" && payloads.length === plSize) {
          for (let i = 0; i < plSize; i++) {
            let pl = payloads[i];

            if (pl !== undefined && pl !== null) {
              node.status({
                fill: "blue",
                shape: "dot",
                text: `Proc: ${i + 1} of ${plSize}`,
              });
              let takFormat = pl.TAKFormat;
              let plErr = pl.error || error;
              let plPl = pl.payload;
              delete pl.TAKFormat;
              delete pl.error;
              delete pl.payload;

              newMsg[i] = {
                payload: plPl,
                _session: msg._session,
                error: plErr,
                TAKFormat: takFormat,
              };
            } else {
              node.error({ message: `Empty payload ${i + 1} of ${plSize}.` });
            }
          }
        } else {
          node.error({
            message: `Not a valid payload: type=${plsType} len=${payloads.length}`,
          });
        }
      }
      node.send(newMsg);
      // node.status({ fill: "blue", shape: "ring", text: "Idle" });
    });
  }
  RED.nodes.registerType("tak", tak);
};

module.exports = makeTAKNode;
