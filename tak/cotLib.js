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

const { cot, proto } = require("@vidterra/tak.js");

/*
Converts Cursor-On-Target Event 'Types' to NATO symbol identification coding (SIDC).
*/
let cotType2SIDC = (cotType) => {
  /* Extract the Type and Affiliation. */
  let et = cotType.split("-");
  let affil = et[1];

  /* There is no '.' notation in SIDC, so mark Neutral. */
  if (affil.includes(".")) {
    affil = "n";
  }

  /* Ram the COT Event Type portions into a SIDR Type */
  let SIDC = `s${affil}${et[2]}p${et[3] || "-"}${et[4] || "-"}${
    et[5] || "-"
  }--------`;

  return SIDC;
};

const decodeCOT = (message) => {
  /* Borrowed from @vidterra/tak.js/scripts/parse.js
    MIT License
  
    Copyright (c) 2021 Vidterra
  
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
  
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
  
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
  const bufferMessage =
    typeof message !== Buffer ? Buffer.from(message, "hex") : message;

  let takFormat;
  let payload;
  let error;

  if (bufferMessage[0] === 191) {
    // TAK message format 0xbf
    const trimmedBuffer = bufferMessage.slice(3, bufferMessage.length); // remove tak message header from content
    if (bufferMessage[1] === 0) {
      // is COT XML
      takFormat = "TAK COT XML";
      payload = cot.xml2js(trimmedBuffer); // try parsing raw XML
    } else if (bufferMessage[1] === 1) {
      // is Protobuf
      takFormat = "Protobuf";
      payload = proto.proto2js(trimmedBuffer);
    }
  } else {
    // not TAK message format
    try {
      takFormat = "COT XML";
      payload = cot.xml2js(message); // try parsing raw XML
    } catch (e) {
      console.error("Failed to parse message", e);
      error = e;
    }
  }

  if (!payload) {
    payload = {};
  }

  payload.TAKFormat = takFormat;
  payload.error = error;

  return payload;
};

/*
Serializses (encodes) CoT Javascript Object as CoT XML.
*/
const encodeCOT = (message) => {
  if (!message._declaration) {
    message = {
      _declaration: { _attributes: { version: "1.0", encoding: "UTF-8" } },
      ...message,
    };
  }
  return cot.js2xml(message);
};

/*
Parses Cursor-On-Target plain-text XML or Protobuf into Node.js JSON.
*/
const handlePayload = (payload) => {
  let newPayload;

  const plType = typeof payload;
  if (plType === "object") {
    if (typeof payload[0] === "number") {
      newPayload = decodeCOT(payload);
    } else {
      newPayload = encodeCOT(payload);
    }
  } else {
    newPayload = decodeCOT(payload);
  }

  return newPayload;
};

module.exports = { handlePayload, cotType2SIDC };
