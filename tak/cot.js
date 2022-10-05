#!/usr/bin/env node
/*
TAK Node-RED Nodes.

Author:: Greg Albrecht W2GMD <oss@undef.net>
Copyright:: Copyright 2022 Greg Albrecht
License:: Apache License, Version 2.0
Source:: https://github.com/ampledata/node-red-contrib-aprs

Copyright 2022 Greg Albrecht

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
      msg.payload = handlePayload(msg.payload);
      node.send(msg);
    });
  }
  RED.nodes.registerType("tak", tak);
};

module.exports = makeTAKNode;
