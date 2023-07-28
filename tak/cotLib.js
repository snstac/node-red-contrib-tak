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

const xml2js = require("xml2js");

const { cot, proto } = require("@vidterra/tak.js");
const { encode, decode } = require("varint");

const TAK_MAGICBYTE = 191; // 0xBF
const TAK_PROTO_VER = 1;
const MAGIC_ROOT = "XXSNSXX";
const MCAST_HEADER = Buffer.from([TAK_MAGICBYTE, TAK_PROTO_VER, TAK_MAGICBYTE]);

/* TAK Error Boundary:
From MITRE's "The Developer’s Guide to Cursor on Target":

  CoT makes information explicit as often as practical. We take heat for this. 
  Most systems don’t know their error tolerances and are offended when we demand them.
  If they can’t put an upper bound on their errors we use 9999999 meters since we are 
  confident that their coordinates are within +/-10,000,000 meters, at least if we’re 
  near the Earth.

Per https://github.com/deptofdefense/AndroidTacticalAssaultKit-CIV/blob/master/commoncommo/core/impl/protobuf/cotevent.proto:

  use 999999 for unknown

YMMV YOLO!
*/
const TAK_BOUND = "999999";

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
  // "TAK Protocol Version 1", Mesh SA & Stream formats:
  let multicastPayload;
  let streamPayload;

  let dataLen = encode(takproto.length);
  // console.log("dataLen:")
  // console.log(dataLen)

  let streamHeader = Buffer.from([TAK_MAGICBYTE].concat(dataLen));
  // console.log("streamHeader:")
  // console.log(streamHeader)

  multicastPayload = Buffer.concat([MCAST_HEADER, takproto]);
  streamPayload = Buffer.concat([streamHeader, takproto]);

  return [{ payload: multicastPayload }, { payload: streamPayload }];
};

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

    if (plMagicByte2 === TAK_MAGICBYTE && plMagicByte === plMagicByte2) {
      // Multicast header
      trimmedBuffer = bufferPl.slice(payloadStart, msgLen);

      if (plTakProtoVersion === TAK_PROTO_VER) {
        // Protobuf
        payload = proto.proto2js(trimmedBuffer);
      } else if (takProtoVersion === 0) {
        // COT XML
        payload = cot.xml2js(trimmedBuffer); // try parsing raw XML
      } else {
        payload = cot.xml2js(trimmedBuffer); // try parsing raw XML
      }
    } else {
      const bufferPl =
        typeof payload !== Buffer ? Buffer.from(payload, "hex") : payload;
      plLen = decode(bufferPl, (offset = 1));
      plStart = decode.bytes;
      takPl = bufferPl.slice(plStart + 1, bufferPl.length);

      try {
        payload = proto.proto2js(takPl);
      } catch (err) {
        error = {
          message: "proto2js error",
          error: err,
        };
      }
    }
  } else {
    // not TAK message format
    try {
      payload = cot.xml2js(payload); // try parsing raw XML
    } catch (err) {
      error = {
        message: "proto2js error",
        error: err,
      };
    }
  }

  if (typeof payload === "undefined" || payload === null) {
    payload = {};
  }

  payload.error = error;

  return payload;
};

const XML_DECLARATION = {
  _declaration: {
    _attributes: { version: "1.0", encoding: "UTF-8", standalone: "yes" },
  },
};

/** Encode CoT from Payload
 *
 * @param {object} payload - Payload to encode.
 */
const encodeCOT = (payload) => {
  // console.log("encodeCOT payload:")
  // console.log(payload)
  delete payload.error;

  let takproto;
  let xmlPayload;
  let protojson;

  if (typeof payload.cotEvent !== "undefined" && payload.cotEvent !== null) {
    // console.log("cotEvent")

    protojson = payload;

    let cotJS = proto.protojs2cotjs(protojson);
    // console.log("cotJS")
    // console.log(cotJS)

    // FIXME in tak.js:
    if (protojson.cotEvent.detail.track) {
      cotJS.event.detail.track = {
        _attributes: {
          course: protojson.cotEvent.detail.track.course,
          speed: protojson.cotEvent.detail.track.speed,
        },
      };
    }

    // FIXME in tak.js:
    if (protojson.cotEvent.detail.precisionLocation) {
      cotJS.event.detail.precisionlocation = {
        _attributes: {
          altsrc: protojson.cotEvent.detail.precisionLocation.altsrc,
          geopointsrc: protojson.cotEvent.detail.precisionLocation.geopointsrc,
        },
      };
    }

    payload = cotJS;
  }

  if (!payload._declaration) {
    payload = { ...XML_DECLARATION, ...payload };
  }

  // Plain XML
  xmlPayload = cot.js2xml(payload);
  const jsonPayload = cot.xml2js(xmlPayload);
  const protojs = cotjs2protojs(jsonPayload);

  takproto = proto.js2proto(protojs);
  // console.log("takproto")
  // console.log(takproto)

  takbuffers = takproto2buffers(takproto);
  // console.log("takbuffers")
  // console.log(takbuffers)

  const newMsg = [{ payload: xmlPayload }, ...takbuffers];
  // console.log(newMsg)
  return newMsg;
};

// Convert XML text to JavaScript Object using `xml-js.xml2js()`
const convertXML = (payload) => {
  let error;
  let cotjson;

  try {
    cotjson = cot.xml2js(payload);
  } catch (err) {
    error = {
      message: "Attempted to decode payload as XML.",
      exception: err,
    };
  }

  if (typeof cotjson === "undefined" || cotjson === null) {
    error = { message: "Nothing returned from XML decoder." };
  }

  if (typeof cotjson.event === "undefined" || cotjson.event === null) {
    error = { message: "No Event Element returned from XML decoder." };
  }

  if (
    typeof cotjson.event.point === "undefined" ||
    cotjson.event.point === null
  ) {
    error = { message: "No Point Element returned from XML decoder." };
  }

  cotjson.error = error;
  return cotjson;
};

const cotjs2protojs = (cotjs) => {
  if (typeof cotjs.event === "undefined" || cotjs.event === null) {
    return;
  }

  const protojs = {
    takControl: {},
    cotEvent: {
      type: cotjs.event._attributes.type,
      uid: cotjs.event._attributes.uid,
      sendTime: new Date(cotjs.event._attributes.time).getTime().toString(),
      startTime: new Date(cotjs.event._attributes.start).getTime().toString(),
      staleTime: new Date(cotjs.event._attributes.stale).getTime().toString(),
      how: cotjs.event._attributes.how,
      ce: parseFloat(cotjs.event.point._attributes.ce || TAK_BOUND),
      le: parseFloat(cotjs.event.point._attributes.le || TAK_BOUND),
      hae: parseFloat(cotjs.event.point._attributes.hae || TAK_BOUND),
      lat: parseFloat(cotjs.event.point._attributes.lat),
      lon: parseFloat(cotjs.event.point._attributes.lon),
    },
  };

  return protojs;
};

// Convert CoTJSON (Cursor on Target serialized as JSON) into Protobuf JSON (...)
const convertCoTJSON = (payload) => {
  let error;
  let protojson;

  if (
    typeof payload.event.point === "undefined" ||
    payload.event.point === null
  ) {
    error = { message: "Invalid CoT: Missing Point Element." };
  } else {
    try {
      protojson = cotjs2protojs(payload);
    } catch (err) {
      error = {
        message: "Attempted converting CoTJSON to Protobuf JSON.",
        exception: err,
      };
    }
  }

  if (typeof protojson === "undefined" || protojson === null) {
    protojson = {};
  }

  protojson.error = error;
  return protojson;
};

// Parses Cursor on Target plain-text XML or Protobuf into JSON.
/*
handlePayload - Serialize any input into Cursor on Target JSON.
Can handle XML or Protobuf formats.
- TAK Protocol, version 0
- TAK Protocol, version 1 - Mesh SA
- TAK Protocol, version 1 - Stream
*/
const handlePayload = (payload) => {
  let combo = {
    //          XML        MESH       STREAM
    payload: [undefined, undefined, undefined],
    error: undefined,
  };

  let plType = typeof payload;

  if (typeof cot === "undefined" || cot === null) {
    combo.error = { message: "Attempted to parse empty payload." };
    return combo;
  }

  /* 
  CoT-JSON? 
  Protobuf Buffer?
  */
  if (plType === "object") {
    // Probably Protobuf
    if (Buffer.isBuffer(payload) && payload[0] === TAK_MAGICBYTE) {
      // console.log("handlePayload object[0]: number")

      let protojson = decodeCOT(payload);
      // console.log("protojson:")
      // console.log(protojson)
      combo.payload = [{ payload: protojson }];

      let takproto;
      try {
        takproto = proto.js2proto(protojson);
      } catch (err) {
        combo.error = {
          message: "Error converting Proto JSON to Proto Buffer.",
          exception: err,
        };
        return combo;
      }
      // console.log("takproto:")
      // console.log(takproto)

      let takbuffers;
      try {
        takbuffers = takproto2buffers(takproto);
      } catch (err) {
        combo.error = {
          message: "Error converting takproto to buffers.",
          exception: err,
        };
        return combo;
      }
      // console.log("takbuffers:")
      // console.log(takbuffers)

      combo.payload.push(...takbuffers);
    } else if (Buffer.isBuffer(payload)) {
      // console.log("Buffer but not Proto")
      plType = "string";
      payload = payload.toString();
    } else {
      // console.log("handlePayload object: other")
      try {
        combo.payload = encodeCOT(payload);
      } catch (err) {
        combo.error = {
          message: "Could not encode TAK payload.",
          exception: err,
        };
        return combo;
      }
    }
  }

  // Maybe it's raw XML CoT
  if (plType === "string") {
    // console.log("handlePayload string")

    let cotjson = convertXML(payload);
    // console.log("cotjson: ")
    // console.log(cotjson)

    combo.payload = [{ payload: cotjson }];
    if (typeof cotjson.event === "undefined" && cotjson.event === null) {
      return combo;
    }

    if (
      typeof cotjson.event.point === "undefined" &&
      cotjson.event.point === null
    ) {
      return combo;
    }

    let protojson = convertCoTJSON(cotjson);
    if (protojson.error) {
      combo.error = protojson.error;
      return combo;
    }
    // console.log("protojson: ")
    // console.log(protojson)

    /* Shove remaining <detail> sub-Elements into xmlDetail.
    See: https://github.com/deptofdefense/AndroidTacticalAssaultKit-CIV/blob/master/commoncommo/core/impl/protobuf/detail.proto
    */
    let options = {
      attrkey: "_attributes",
      charkey: "_",
      explicitRoot: 0,
      renderOpts: { pretty: false },
      headless: true,
      rootName: MAGIC_ROOT,
    };

    const detail = cotjson.event.detail;
    if (typeof detail !== "undefined" && detail !== null) {
      let xmlDetail;
      try {
        xmlDetail = new xml2js.Builder(options).buildObject(detail);
        protojson.cotEvent.xmlDetail = xmlDetail
          .replace(`<${options.rootName}>`, "")
          .replace(`</${options.rootName}>`, "");
      } catch (err) {
        combo.error = {
          message: "Attempted to convert Detail Element.",
          exception: err,
        };
      }
    }

    let takproto;
    try {
      takproto = proto.js2proto(protojson);
    } catch (err) {
      combo.error = {
        message: "Error converting Protobuf JSON to Protobuf Buffer.",
        exception: err,
      };
    }
    // console.log("takproto:")
    // console.log(takproto)

    let takbuffers;
    try {
      takbuffers = takproto2buffers(takproto);
    } catch (err) {
      combo.error = {
        message: "Error converting takproto to buffers.",
        exception: err,
      };
      return combo;
    }
    // console.log("takbuffers:")
    // console.log(takbuffers)

    combo.payload.push(...takbuffers);
  }

  // console.log("combo:")
  // console.log(`plType=${plType}`)
  // console.log(combo)
  return combo;
};

module.exports = { handlePayload, cotType2SIDC };
