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

const xml2js = require('xml2js');

const { cot, proto } = require("@vidterra/tak.js");
const { encode, decode } = require("varint");

const TAK_MAGICBYTE = 191  // 0xBF
const TAK_PROTO_VER = 1
const MAGIC_ROOT = "XXSNSXX"
const MCAST_HEADER = Buffer.from([TAK_MAGICBYTE, TAK_PROTO_VER, TAK_MAGICBYTE]);

// Convert Cursor-On-Target Event 'Types' to NATO symbol identification coding (SIDC) aka 2525.
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

/* TAK Protocol definition, headers & payload.

TAK Protocol is defined here: 
https://github.com/deptofdefense/AndroidTacticalAssaultKit-CIV/blob/master/commoncommo/core/impl/protobuf/protocol.txt

TL;DR: 
  - Multicast Protobuf is: 191 1 191 <payload>
  - Stream Protobuf is: 191 <payload-len-as-varint> <payload>

*/
const decodeCOT = (payload) => {
  const bufferPl =
    typeof payload !== Buffer ? Buffer.from(payload, "hex") : payload;

  let takFormat = "Unknown";
  let error;

  // TAK message header for Multicast & Stream: 191 (0xBF)
  const plMagicByte = bufferPl[0];

  // Header for Multicast: 191 1 191 (0xBF 0x01 0xBF)
  const plTakProtoVersion = bufferPl[1];
  const plMagicByte2 = bufferPl[2];

  if (plMagicByte === TAK_MAGICBYTE) {
    let trimmedBuffer;
    let payloadStart = 3;
    let msgLen = bufferPl.length;

    if (plMagicByte2 === TAK_MAGICBYTE && plMagicByte === plMagicByte2) { // Multicast header
      trimmedBuffer = bufferPl.slice(payloadStart, msgLen);

      if (plTakProtoVersion === TAK_PROTO_VER) {  // Protobuf
        takFormat = "Multicast Protobuf";
        payload = proto.proto2js(trimmedBuffer);
      } else if (takProtoVersion === 0) { // COT XML
        takFormat = "Multicast TAK COT XML";
        payload = cot.xml2js(trimmedBuffer); // try parsing raw XML
      } else {
        takFormat = `Unknown TAK Proto Version: ${plTakProtoVersion}`
        payload = cot.xml2js(trimmedBuffer); // try parsing raw XML
      }
    } else {
      /*
      TAK Stream header explained:

      payload = [191, x, y]
      x: the length of y, encoded as varint.
      y: the actual CoT payload

      To decode this payload, for each position in the Buffer:
      0: Be 191 :deal_with_it_shades:.
      1: Be a varint.
      2: Sometimes I'm 191, sometimes I'm the start of a CoT payload.
      3: If my last neighbor was 191, I'm the start of a CoT payload.
      
      */
      takFormat = "Stream Protobuf";

      const bufferPl = typeof payload !== Buffer ? Buffer.from(payload, "hex") : payload;
      plLen = decode(bufferPl, offset=1)
      plStart = decode.bytes
      takPl = bufferPl.slice(plStart+1, bufferPl.length)

      try {
        payload = proto.proto2js(takPl);
      } catch (err) {
        console.error("proto2js error:", err)
        error = err;
      }
    }
  } else {
    // not TAK message format
    try {
      takFormat = "COT XML";
      payload = cot.xml2js(payload);  // try parsing raw XML
    } catch (err) {
      console.error(err)
      // node.error("Failed to parse message", e);
      error = err;
    }
  }

  if (!payload) {
    payload = {};
  }

  payload.TAKFormat = takFormat;
  payload.error = error;

  return payload;
};

// Serializses (encodes) CoT Javascript Object as CoT XML.
const encodeCOT = (payload) => {
  let protoCOT
  let xmlPayload
  if (payload.cotEvent) {
    protoCOT = proto.js2proto(payload.cotEvent)

    let cotJS = proto.protojs2cotjs(payload)

    // FIXME in tak.js:
		if (payload.cotEvent.detail.track) {
			cotJS.event.detail.track = {
				"_attributes": {
					"course": payload.cotEvent.detail.track.course,
					"speed": payload.cotEvent.detail.track.speed,
				}
			}
		}

    // FIXME in tak.js:
		if (payload.cotEvent.detail.precisionLocation) {
			cotJS.event.detail.precisionlocation = {
				"_attributes": {
					"altsrc": payload.cotEvent.detail.precisionLocation.altsrc,
					"geopointsrc": payload.cotEvent.detail.precisionLocation.geopointsrc,
				}
			}
		}

    if (!cotJS._declaration) {
      cotJS = {
        _declaration: { _attributes: { version: "1.0", encoding: "UTF-8", standalone: "yes" } },
        ...cotJS,
      }
    }
    // console.log("CotJS")
    // console.log(cotJS)
    xmlPayload = cot.js2xml(cotJS);
    // console.log("XML PAYLOAD:")
    // console.log(xmlPayload)

  } else {
    if (!payload._declaration) {
      payload = {
        _declaration: { _attributes: { version: "1.0", encoding: "UTF-8", standalone: "yes" } },
        ...payload,
      }
    }

    delete payload.TAKFormat
    delete payload.error

    // Plain XML
    xmlPayload = cot.js2xml(payload);
    const jsonPayload = cot.xml2js(xmlPayload);
    const protojs = proto.cotjs2protojs(jsonPayload);
    
    protoCOT = proto.js2proto(protojs)
  }

  // "TAK Protocol Version 1", Multicast & Stream formats:
  let multicastPayload = null;
  let streamPayload = null;

  try {
    if (protoCOT) {
      multicastPayload = Buffer.concat([MCAST_HEADER, protoCOT])

      let dataLength = encode(protoCOT.length)
      streamPayload = Buffer.concat([Buffer.from([TAK_MAGICBYTE, dataLength]), protoCOT])
    }
  } catch (err) {
    console.log("Error converting to Protobuf:")
    console.log(err)
  }

  let newMsg = [xmlPayload, multicastPayload, streamPayload]
  // console.log(newMsg)
  return newMsg
};

// Parses Cursor on Target plain-text XML or Protobuf into JSON.
const handlePayload = (payload) => {
  let newPayload = [undefined, undefined, undefined];
  const plType = typeof payload;
  if (plType === "object") {  // JSON CoT? Protobuf Buffer?
    // console.log("handlePayload object")
    if (typeof payload[0] === "number") {  // Probably Protobuf
      // console.log("handlePayload number")

      let decoded
      try {
        decoded = decodeCOT(payload)
      } catch (err) {
        console.log(err)
      }

      if (!decoded) {
        console.log("can't decode")
        return newPayload
      }

      let protoCOT = proto.js2proto(decoded)

      let multicastPayload = null;
      let streamPayload = null;
    
      if (protoCOT !== undefined) {
        multicastPayload = Buffer.concat([MCAST_HEADER, protoCOT])
        let dataLength = encode(protoCOT.length)
        streamPayload = Buffer.concat([Buffer.from([TAK_MAGICBYTE, dataLength]), protoCOT])
      }

      newPayload = [decoded, multicastPayload, streamPayload];
    } else {
      // console.log("handlePayload other")
      newPayload = encodeCOT(payload);
    }
  } else if (plType === "string") {  // Maybe it's raw XML CoT
    // console.log("handlePayload string")

    let decoded = decodeCOT(payload)

    let xmlDetail
    let asProtoJS
    let asProto
    let encoded

    let options = {};
    options.attrkey = "_attributes"
    options.charkey = "_";
    options.explicitRoot = 0;
    options.renderOpts = { "pretty": false }
    options.headless = true;
    options.rootName = MAGIC_ROOT

    try {
      asProtoJS = proto.cotjs2protojs(decoded)
    } catch (err) {
      console.log("Error handling string payload:")
      console.log(err);
    }

    /* Shove remaining <detail> sub-Elements into xmlDetail.
    See: https://github.com/deptofdefense/AndroidTacticalAssaultKit-CIV/blob/master/commoncommo/core/impl/protobuf/detail.proto
    */
    if (decoded && asProtoJS) {
      try {
        xmlDetail = new xml2js.Builder(options).buildObject(decoded.event.detail)
        asProtoJS.cotEvent.xmlDetail = xmlDetail.replace(`<${options.rootName}>`, '').replace(`</${options.rootName}>`, '')
      } catch (err) {
        console.log(err);
      }
    }

    // Convert to 'TAK Protocol Version 1'
    let multicastPayload = null;
    let streamPayload = null;

    // Convert JSON to Protobuf Buffer
    if (asProtoJS) {
      try {
        asProto = proto.js2proto(asProtoJS)
      } catch (err) {
        console.log(err);
      }
    }

    if (asProto) {
      multicastPayload = Buffer.concat([MCAST_HEADER, asProto])
      let dataLength = encode(asProto.length)
      let streamHeader = Buffer.from([TAK_MAGICBYTE, dataLength])
      streamPayload = Buffer.concat([streamHeader, asProto])
    }

    newPayload = [decoded, multicastPayload, streamPayload]
  }

  return newPayload;
};

module.exports = { handlePayload, cotType2SIDC };
