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

const { cot, proto } = require("@vidterra/tak.js");
const { encode, decode } = require("varint");

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


/*
TAK Protocol is defined here: 
https://github.com/deptofdefense/AndroidTacticalAssaultKit-CIV/blob/master/commoncommo/core/impl/protobuf/protocol.txt

TL;DR: 
  - Multicast Protobuf is: 191 1 191 <payload>
  - Stream Protobuf is: 191 <payload-len-as-varint> <payload>

*/
const decodeCOT = (message) => {
  const bufferMessage =
    typeof message !== Buffer ? Buffer.from(message, "hex") : message;

  let takFormat;
  let payload;
  let error;

  // TAK message format for Multicast & Stream: 0xbf
  const magicByte = bufferMessage[0];

  // Format for Multicast:
  const takProtoVersion = bufferMessage[1];
  const magicByte2 = bufferMessage[2];

  // console.log(`magicByte=${magicByte} takProtoVersion=${takProtoVersion} magicByte2=${magicByte2}`)

  if (magicByte === 191) { // 0xbf
    let trimmedBuffer;
    let payloadStart = 3;
    let msgLen = bufferMessage.length;

    if (magicByte === magicByte2) { // Multicast header
      trimmedBuffer = bufferMessage.slice(payloadStart, msgLen);

      if (takProtoVersion === 0) { // COT XML
        takFormat = "Multicast TAK COT XML";
        payload = cot.xml2js(trimmedBuffer); // try parsing raw XML
      } else if (takProtoVersion === 1) { // Protobuf
        takFormat = "Multicast Protobuf";
        payload = proto.proto2js(trimmedBuffer);
      }
    } else { // Stream header
      msgLen = decode(bufferMessage);
      payloadStart = decode.bytes;

      try {
        trimmedBuffer = bufferMessage.slice(payloadStart, msgLen);
      } catch (e) {
        node.error("Failed to decode message", e)
        error = e;
      }

      takFormat = "Stream Protobuf";
      payload = proto.proto2js(trimmedBuffer);
    }
  } else {

    // not TAK message format
    try {
      takFormat = "COT XML";
      payload = cot.xml2js(message); // try parsing raw XML
    } catch (e) {
      node.error("Failed to parse message", e);
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
const encodeCOT = (payload) => {
  if (!payload._declaration) {
    payload = {
      _declaration: { _attributes: { version: "1.0", encoding: "UTF-8" } },
      ...payload,
    };
  }

  // Plain XML
  const xmlPayload = cot.js2xml(payload);
  let protojs = proto.cotjs2protojs(payload);

  // "TAK Protocol Version 1", Multicast & Stream formats:
  let multicastPayload = null;
  let streamPayload = null;

  let protoCOT = proto.js2proto(protojs)
  if (protoCOT !== undefined) {
    multicastPayload = Buffer.concat([Buffer.from([0xBF, 0x01, 0xBF]), protoCOT])

    let dataLength = encode(protoCOT.length)
    streamPayload = Buffer.concat([Buffer.from([0xBF, dataLength]), protoCOT])
  }

  return [xmlPayload, multicastPayload, streamPayload]
};

/*
Parses Cursor on Target plain-text XML or Protobuf into Node.js JSON.
*/
const handlePayload = (payload) => {
  let newPayload;

  const plType = typeof payload;
  if (plType === "object") {
    if (typeof payload[0] === "number") {
      newPayload = [decodeCOT(payload), null, null];
    } else {
      newPayload = encodeCOT(payload);
    }
  } else {
    newPayload = [decodeCOT(payload), null, null];
  }

  return newPayload;
};

module.exports = { handlePayload, cotType2SIDC };
