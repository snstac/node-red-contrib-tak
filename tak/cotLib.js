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

 
/** Convert Proto in JSON format to Buffer.
 *
 * @param {object} protojson - Protobuf as JSON to convert.
 */
const takproto2buffers = (takproto) => {
  // "TAK Protocol Version 1", Multicast & Stream formats:
  let multicastPayload;
  let streamPayload

  let dataLen = encode(takproto.length)
  // console.log("dataLen:")
  // console.log(dataLen)

  let streamHeader = Buffer.from([TAK_MAGICBYTE].concat(dataLen))
  // console.log("streamHeader:")
  // console.log(streamHeader)

  multicastPayload = Buffer.concat([MCAST_HEADER, takproto])
  streamPayload = Buffer.concat([streamHeader, takproto])

  return [multicastPayload, streamPayload]
}


/* TAK Protocol definition, headers & payload.

TAK Protocol is defined here: 
https://github.com/deptofdefense/AndroidTacticalAssaultKit-CIV/blob/master/commoncommo/core/impl/protobuf/protocol.txt

TL;DR: 
  - Multicast Protobuf is: 191 1 191 <payload>
  - Stream Protobuf is: 191 <payload-len-as-varint> <payload>

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


/** Decode CoT from Payload
 *
 * @param {object} payload - Payload to decode.
 */
const decodeCOT = (payload) => {
  // console.log("payload:")
  // console.log(payload)
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


/** Encode CoT from Payload
 *
 * @param {object} payload - Payload to encode.
 */
const encodeCOT = (payload) => {
  // console.log("encodeCOT payload:")
  // console.log(payload)

  let takproto
  let xmlPayload
  let protojson

  if (payload.cotEvent) {
    // console.log("cotEvent")

    protojson = payload

    let cotJS = proto.protojs2cotjs(protojson)
    // console.log("cotJS")
    // console.log(cotJS)
  
    // FIXME in tak.js:
		if (protojson.cotEvent.detail.track) {
			cotJS.event.detail.track = {
				"_attributes": {
					"course": protojson.cotEvent.detail.track.course,
					"speed": protojson.cotEvent.detail.track.speed,
				}
			}
		}

    // FIXME in tak.js:
		if (protojson.cotEvent.detail.precisionLocation) {
			cotJS.event.detail.precisionlocation = {
				"_attributes": {
					"altsrc": protojson.cotEvent.detail.precisionLocation.altsrc,
					"geopointsrc": protojson.cotEvent.detail.precisionLocation.geopointsrc,
				}
			}
		}

    if (!cotJS._declaration) {
      cotJS = {
        _declaration: { _attributes: { version: "1.0", encoding: "UTF-8", standalone: "yes" } },
        ...cotJS,
      }
    }
    // console.log("cotJS:")
    // console.log(cotJS)

    xmlPayload = cot.js2xml(cotJS);
    // console.log("xmlPayload:")
    // console.log(xmlPayload)

    takproto = proto.js2proto(protojson)
    // console.log("takproto")
    // console.log(takproto)

  } else {
    // console.log("encodeCOT else")
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
    
    takproto = proto.js2proto(protojs)
  }
  // console.log("takproto")
  // console.log(takproto)

  takbuffers = takproto2buffers(takproto)
  // console.log("takbuffers")
  // console.log(takbuffers)
  
  let newMsg = [xmlPayload].concat(takbuffers)
  // console.log("newMsg:")
  // console.log(newMsg)

  return newMsg
};


// Parses Cursor on Target plain-text XML or Protobuf into JSON.
const handlePayload = (payload) => {
  let newPayload = [undefined, undefined, undefined];
  let plType = typeof payload;

  if (plType === "object") {  // JSON CoT? Protobuf Buffer?
    // console.log("handlePayload object")

    if (Buffer.isBuffer(payload) && payload[0] === TAK_MAGICBYTE) {  // Probably Protobuf
      // console.log("handlePayload object[0]: number")

      let protojson
      try {
        protojson = decodeCOT(payload)
      } catch (err) {
        console.error("Error decoding payload:")
        console.error(err)
        return newPayload
      }
      // console.log("protojson:")
      // console.log(protojson)

      let takproto
      try {
        takproto = proto.js2proto(protojson)
      } catch (err) {
        console.error("Error converting Proto JSON to Proto Buffer:")
        console.error(err)
        return newPayload
      }
      // console.log("takproto:")
      // console.log(takproto)

      let takbuffers
      try {
        takbuffers = takproto2buffers(takproto)
      } catch (err) {
        console.error("Error converting takproto to buffers:")
        console.error(err)
        return newPayload
      }
      // console.log("takbuffers:")
      // console.log(takbuffers)
      
      newPayload = [protojson].concat(takbuffers)
      // console.log("newPayload:")
      // console.log(newPayload)

    } else if (Buffer.isBuffer(payload)) {
      // console.log("Buffer but not Proto")
      plType = "string"
      payload = payload.toString()
    } else {
      // console.log("handlePayload object: other")
      try {
        newPayload = encodeCOT(payload);
      } catch (err) {
        console.error("'handlePayload other' could not encode TAK payload")
        console.error(err)
      }
    }
  }
  
  if (plType === "string") {  // Maybe it's raw XML CoT
    // console.log("handlePayload string")

    let cotjson
    try {
      cotjson = cot.xml2js(payload);
    } catch (err) {
      console.error("Error decoding payload:")
      console.error(err)
      return newPayload
    }
    // console.log("cotjson:")
    // console.log(cotjson)

    /* Shove remaining <detail> sub-Elements into xmlDetail.
    See: https://github.com/deptofdefense/AndroidTacticalAssaultKit-CIV/blob/master/commoncommo/core/impl/protobuf/detail.proto
    */
    let options = {
      attrkey: "_attributes",
      charkey: "_",
      explicitRoot: 0,
      renderOpts: { "pretty": false },
      headless: true,
      rootName: MAGIC_ROOT
    }

    let protojson
    try {
      protojson = proto.cotjs2protojs(cotjson)
    } catch (err) {
      console.error("Error decoding payload:")
      console.error(err)
      return newPayload
    }
    // console.log("protojson:")
    // console.log(protojson)

    let xmlDetail
    try {
      xmlDetail = new xml2js.Builder(options).buildObject(cotjson.event.detail)
      protojson.cotEvent.xmlDetail = xmlDetail.replace(`<${options.rootName}>`, '').replace(`</${options.rootName}>`, '')
    } catch (err) {
      console.error("Error converting detail to xmlDetail:")
      console.error(err);
    }

    let takproto
    try {
      takproto = proto.js2proto(protojson)
    } catch (err) {
      console.error("Error converting Proto JSON to Proto Buffer:")
      console.error(err)
      return newPayload
    }
    // console.log("takproto:")
    // console.log(takproto)

    let takbuffers
    try {
      takbuffers = takproto2buffers(takproto)
    } catch (err) {
      console.error("Error converting takproto to buffers:")
      console.error(err)
      return newPayload
    }
    // console.log("takbuffers:")
    // console.log(takbuffers)
    
    newPayload = [cotjson].concat(takbuffers)
  }

  // console.log("newPayload:")
  // console.log(newPayload)
  return newPayload;
};

module.exports = { handlePayload, cotType2SIDC };
