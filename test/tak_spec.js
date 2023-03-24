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

var should = require("should");
var helper = require("node-red-node-test-helper");
const makeTAKNode = require("../tak/cot")
const { encode, decode } = require("varint");
const { cot, proto } = require("@vidterra/tak.js");

const TAK_MAGICBYTE = 191  // 0xBF
const TAK_PROTO_VER = 1
const MAGIC_ROOT = "XXSNSXX"
const MCAST_HEADER = Buffer.from([TAK_MAGICBYTE, TAK_PROTO_VER, TAK_MAGICBYTE]);

helper.init(require.resolve("node-red"));

const testXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><event version="2.0" uid="TEST-UID" type="a-f-G-E-V-C" time="2023-03-22T22:23:43.195Z" start="2023-03-22T22:23:43.195Z" stale="2023-03-22T22:29:58.195Z" how="h-e"><point lat="37.7608736" lon="-122.4999468" hae="1.349" ce="9999999.0" le="9999999.0"/><detail><takv os="29" version="4.8.1.13 (92a3c1fe)[playstore].1679058347-CIV" device="SAMSUNG SM-G960U1" platform="ATAK-CIV"/><contact endpoint="*:-1:stcp" callsign="VPN User" sipAddress="192.168.0.54"/><uid Droid="VPN User"/><__group role="Team Member" name="Cyan"/><status battery="100"/><track course="207.2594673459405" speed="0.0"/><precisionlocation altsrc="DTED0" geopointsrc="USER"/></detail></event>`;

const testJSON = {
  _declaration: {
    _attributes: { version: '1.0', encoding: 'UTF-8', standalone: 'yes' }
  },
  event:  {
    _attributes: {
      version: '2.0',
      uid: 'TEST-UID',
      type: 'a-f-G-E-V-C',
      time: '2023-03-22T22:23:43.195Z',
      start: '2023-03-22T22:23:43.195Z',
      stale: '2023-03-22T22:29:58.195Z',
      how: 'h-e'
    },
    point: {
      _attributes: {
        lat: '37.7608736',
        lon: '-122.4999468',
        hae: '1.349',
        ce: '9999999.0',
        le: '9999999.0'
      }
    },
    detail: {
      takv: {
        _attributes: {
          os: '29',
          version: '4.8.1.13 (92a3c1fe)[playstore].1679058347-CIV',
          device: 'SAMSUNG SM-G960U1',
          platform: 'ATAK-CIV'
        }
      },
      contact: {
        _attributes: {
          endpoint: '*:-1:stcp',
          callsign: 'VPN User',
          sipAddress: '192.168.0.54'
        }
      },
      uid: { _attributes: { Droid: 'VPN User' } },
      __group: { _attributes: { role: 'Team Member', name: 'Cyan' } },
      status: { _attributes: { battery: '100' } },
      track: {
        _attributes: { 
          course: '207.2594673459405', 
          speed: '0.0' 
        }
      },
      precisionlocation: {
        _attributes: {
          altsrc: "DTED0",
          geopointsrc: "USER"
        }
      }
    }
  }
}

const testProtoJSON = {
  "cotEvent": {
    "type": "a-f-G-E-V-C",
    "uid": "TEST-UID",
    "sendTime": "1679523823195",
    "startTime": "1679523823195",
    "staleTime": "1679524198195",
    "how": "h-e",
    "lat": 37.7608736,  // double
    "lon": -122.4999468,  // double
    "hae": "1.349",  // double
    "ce": "9999999.0",  // double
    "le": "9999999.0",  // double
    "detail": { 
      "xmlDetail": "<contact endpoint=\"*:-1:stcp\" callsign=\"VPN User\" sipAddress=\"192.168.0.54\"/><uid Droid=\"VPN User\"/>",
      "group": { "name": "Cyan", "role": "Team Member" },
      "precisionLocation": { "geopointsrc": "USER", "altsrc": "DTED0" },
      "status": { "battery": "100" },  // uint32
      "takv": {
        "device": "SAMSUNG SM-G960U1",
        "platform": "ATAK-CIV",
        "os": "29",
        "version": "4.8.1.13 (92a3c1fe)[playstore].1679058347-CIV"
      },
      "track": { 
        "course": "207.2594673459405",  // double
        "speed": "0.0"  // double
      }
    }
  }
}

const genProtoMesh = () => {
  let asProto
  try {
    asProto = proto.js2proto(testProtoJSON)
  } catch (err) {
    console.error("Error converting JSON to Protobuf:")
    console.error(err);
  }


  if (asProto) {
    multicastPayload = Buffer.concat([MCAST_HEADER, asProto])
    let dataLength = encode(asProto.length)
    let streamHeader = Buffer.from([TAK_MAGICBYTE, dataLength])
    streamPayload = Buffer.concat([streamHeader, asProto])
  }

  return multicastPayload
}

const genProtoStream = () => {
  let asProto;
  // Convert JSON to Protobuf Buffer
  try {
    asProto = proto.js2proto(testProtoJSON)
  } catch (err) {
    console.log(err);
  }

  if (asProto) {
    multicastPayload = Buffer.concat([MCAST_HEADER, asProto])
    let dataLength = encode(asProto.length)
    let streamHeader = Buffer.from([TAK_MAGICBYTE, dataLength])
    streamPayload = Buffer.concat([streamHeader, asProto])
  }

  return streamPayload
}

const formatXml = (xml) => {
  const PADDING = ' '.repeat(2); // set desired indent size here
  const reg = /(>)(<)(\/*)/g;
  let pad = 0;

  xml = xml.replace(reg, '$1\r\n$2$3');

  return xml.split('\r\n').map((node, index) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
          indent = 0;
      } else if (node.match(/^<\/\w/) && pad > 0) {
          pad -= 1;
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
          indent = 1;
      } else {
          indent = 0;
      }

      pad += indent;

      return PADDING.repeat(pad - indent) + node;
  }).join('\r\n');
}

describe("TAK Node", () => {

  before(function (done) {
    helper.startServer(done);
  });

  after(function (done) {
    helper.stopServer(done);
  });

  afterEach(function() {
    helper.unload();
  });

  it("should be loaded", done => {
    const flow = [{ id: "n1", type: "tak", name: "test name" }];
    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      try {
        n1.should.have.property("name", "test name");
        done();
      } catch(err) {
        done(err);
      }
    });
  });

  // XML string
  it("should pass XML string to 3 outputs", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      var countedOutputs = 0;
      var expectedOutputs = 3

      o0.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o1.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o2.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testXML });
    });
  });

  it("should convert XML string into JSON", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");

      o0.on("input", msg => {
        try {
          msg.should.have.property("payload")
          msg.payload.should.have.property("event")
          msg.payload.event.should.have.property("detail")
          msg.payload.event.should.have.property("point")          
          msg.payload.event.point._attributes.should.have.property("lat")          
          msg.payload.event.point._attributes.should.have.property("lon")          
          msg.payload.event.point._attributes.lat.should.equal(testJSON.event.point._attributes.lat)          
          msg.payload.event.point._attributes.lon.should.equal(testJSON.event.point._attributes.lon)          

          msg.should.have.property("error", undefined)
          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testXML });
    });
  });

  it("should convert XML string into Mesh Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      o1.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload
          // console.log("payload:")
          // console.log(payload)

          // console.log(MCAST_HEADER)
          // console.log(payload.slice(0, 3))
          Buffer.compare(payload.slice(0, 3), MCAST_HEADER).should.equal(0)

          let controlVal = Buffer.concat([MCAST_HEADER, Buffer.from([0x0A, 0x00, 0x12, 0x43, 0x0A, 0x0B])])
          // console.log(payload.slice(3, 7))
          // console.log(controlVal.slice(3,7 ))
          Buffer.compare(payload.slice(3, 7), controlVal.slice(3, 7)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testXML });
    });
  });

  it("should convert XML string into Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")

          let payload = msg.payload
          controlVal = Buffer.from([TAK_MAGICBYTE, 0x47, 0x0A, 0x00, 0x12, 0x43, 0x0A, 0x0B])

          // Check Header:
          Buffer.compare(payload.slice(0, 1), Buffer.from([TAK_MAGICBYTE])).should.equal(0)

          // Check Payload:
          Buffer.compare(payload.slice(1, 6), controlVal.slice(1, 6)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testXML });
    });
  });

  it("should convert XML string into valid Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload

          const bufferPl = typeof payload !== Buffer ? Buffer.from(payload, "hex") : payload;
          plLen = decode(bufferPl, offset=1)
          plStart = decode.bytes
          takPl = bufferPl.slice(plStart+1, bufferPl.length)

          let protoJS
          try {
            protoJS = proto.proto2js(takPl)
          } catch (err) {
            done(err);
          }

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testXML });
    });
  });

  // XML buffer
  it("should pass XML buffer to 3 outputs", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      var countedOutputs = 0;
      var expectedOutputs = 3

      o0.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o1.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o2.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: Buffer.from(testXML) });
    });
  });

  it("should convert XML buffer into JSON", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");

      o0.on("input", msg => {
        try {
          msg.should.have.property("payload")
          msg.payload.should.have.property("event")
          msg.payload.event.should.have.property("detail")
          msg.payload.event.should.have.property("point")          
          msg.payload.event.point._attributes.should.have.property("lat")          
          msg.payload.event.point._attributes.should.have.property("lon")          
          msg.payload.event.point._attributes.lat.should.equal(testJSON.event.point._attributes.lat)          
          msg.payload.event.point._attributes.lon.should.equal(testJSON.event.point._attributes.lon)          

          msg.should.have.property("error", undefined)
          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: Buffer.from(testXML) });
    });
  });

  it("should convert XML buffer into Mesh Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      o1.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload
          // console.log("payload:")
          // console.log(payload)

          // console.log(MCAST_HEADER)
          // console.log(payload.slice(0, 3))
          Buffer.compare(payload.slice(0, 3), MCAST_HEADER).should.equal(0)

          let controlVal = Buffer.concat([MCAST_HEADER, Buffer.from([0x0A, 0x00, 0x12, 0x43, 0x0A, 0x0B])])
          // console.log(payload.slice(3, 7))
          // console.log(controlVal.slice(3,7 ))
          Buffer.compare(payload.slice(3, 7), controlVal.slice(3, 7)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: Buffer.from(testXML) });
    });
  });

  it("should convert XML buffer into Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")

          let payload = msg.payload
          controlVal = Buffer.from([TAK_MAGICBYTE, 0x47, 0x0A, 0x00, 0x12, 0x43, 0x0A, 0x0B])

          // Check Header:
          Buffer.compare(payload.slice(0, 1), Buffer.from([TAK_MAGICBYTE])).should.equal(0)

          // Check Payload:
          Buffer.compare(payload.slice(1, 6), controlVal.slice(1, 6)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: Buffer.from(testXML) });
    });
  });

  it("should convert XML buffer into valid Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload

          const bufferPl = typeof payload !== Buffer ? Buffer.from(payload, "hex") : payload;
          plLen = decode(bufferPl, offset=1)
          plStart = decode.bytes
          takPl = bufferPl.slice(plStart+1, bufferPl.length)

          let protoJS
          try {
            protoJS = proto.proto2js(takPl)
          } catch (err) {
            done(err);
          }

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: Buffer.from(testXML) });
    });
  });

  // Mesh in
  it("should pass Mesh Protobuf to 3 outputs", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      var countedOutputs = 0;
      var expectedOutputs = 3

      o0.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o1.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o2.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: genProtoMesh() });
    });
  });

  it("should convert Mesh Protobuf into JSON", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      var countedOutputs = 0;
      var expectedOutputs = 3

      o0.on("input", msg => {
        try {
          msg.should.have.property("payload")
          msg.payload.should.have.property("cotEvent")
          msg.payload.cotEvent.should.have.property("detail")
          msg.payload.cotEvent.should.have.property("lat")          
          msg.payload.cotEvent.should.have.property("lon")          
          msg.payload.cotEvent.lat.should.equal(testProtoJSON.cotEvent.lat)          
          msg.payload.cotEvent.lon.should.equal(testProtoJSON.cotEvent.lon)          

          msg.should.have.property("error", undefined)
          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: genProtoMesh() });
    });
  });

  it("should convert Mesh Protobuf into Mesh Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];

    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      o1.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload
          // console.log(payload)

          controlVal = Buffer.from([0xBF, 0x01, 0xBF, 0x12, 0xD5, 0x02, 0x0A, 0x0B, 0x61, 0x2D, 0x66])

          // Check header:
          Buffer.compare(payload.slice(0, 3), controlVal.slice(0, 3)).should.equal(0)

          // Check payload:
          Buffer.compare(payload.slice(3, 6), controlVal.slice(3, 6)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: genProtoMesh() });
    });
  });

  it("should convert Mesh Protobuf into Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload
          // console.log(payload)

          controlVal = Buffer.from([TAK_MAGICBYTE, 0xD8, 0x02, 0x12, 0xD5, 0x02, 0x0A, 0x0B, 0x61])

          // Check Header:
          Buffer.compare(payload.slice(0, 1), controlVal.slice(0, 1)).should.equal(0)

          // Check Payload:
          Buffer.compare(payload.slice(1, 6), controlVal.slice(1, 6)).should.equal(0)
          done();
        } catch (err) {
          done(err);
        }
      })

      n1.receive({ payload: genProtoMesh() });
    });
  });

  it("should convert Mesh Protobuf into valid Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload

          const bufferPl = typeof payload !== Buffer ? Buffer.from(payload, "hex") : payload;
          plLen = decode(bufferPl, offset=1)
          plStart = decode.bytes
          takPl = bufferPl.slice(plStart+1, bufferPl.length)

          let protoJS
          try {
            protoJS = proto.proto2js(takPl)
          } catch (err) {
            done(err);
          }

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testXML });
    });
  });

  // Stream in
  it("should pass Stream Protobuf to 3 outputs", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      var countedOutputs = 0;
      var expectedOutputs = 3

      o0.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o1.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o2.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: genProtoMesh() });
    });
  });

  it("should convert Stream Protobuf into JSON", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];

    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");

      o0.on("input", msg => {
        try {
          msg.should.have.property("payload")
          msg.payload.should.have.property("cotEvent")
          msg.payload.cotEvent.should.have.property("detail")
          msg.payload.cotEvent.should.have.property("lat")          
          msg.payload.cotEvent.should.have.property("lon")          
          msg.payload.cotEvent.lat.should.equal(testProtoJSON.cotEvent.lat)          
          msg.payload.cotEvent.lon.should.equal(testProtoJSON.cotEvent.lon)          

          msg.should.have.property("error", undefined)
          done();
        } catch (err) {
          done(err);
        }
      })

      n1.receive({ payload: genProtoStream() });
    });
  });

  it("should convert Stream Protobuf into Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];

    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload
          // console.log(payload)

          controlVal = Buffer.from([TAK_MAGICBYTE, 0xD8, 0x02, 0x12, 0xD5, 0x02, 0x0A, 0x0B])

          // Check Header:
          Buffer.compare(payload.slice(0, 1), Buffer.from([TAK_MAGICBYTE])).should.equal(0)

          // Check Payload:
          Buffer.compare(payload.slice(1, 6), controlVal.slice(1, 6)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: genProtoStream() });
    });
  });

  it("should convert Stream Protobuf into Mesh Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];

    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      o1.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload
          // console.log(payload)

          controlVal = Buffer.from([0xBF, 0x01, 0xBF, 0x12, 0xD5, 0x02, 0x0A, 0x0B, 0x61])

          // Check Header:
          Buffer.compare(payload.slice(0, 3), controlVal.slice(0, 3)).should.equal(0)

          // Check Payload:
          Buffer.compare(payload.slice(3, 6), controlVal.slice(3, 6)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }
      })

      n1.receive({ payload: genProtoStream() });
    });
  });

  // Proto JSON in
  it("should pass Proto JSON to 3 outputs", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      var countedOutputs = 0;
      var expectedOutputs = 3

      o0.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o1.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      o2.on("input", msg => {
        countedOutputs++;
        try {
          msg.should.have.property("payload")
          if (countedOutputs === expectedOutputs) {
            done();
          }
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testProtoJSON });
    });
  });

  it("should convert Proto JSON into CoT XML", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];

    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");

      o0.on("input", msg => {
        try {
          // console.log(formatXml(msg.payload))
          msg.should.have.property("payload")
          // console.log(formatXml(testXML))
          msg.should.have.property("payload", testXML)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testProtoJSON });
    });
  });

  it("should convert Proto JSON into Mesh Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o0 = helper.getNode("o0");
      var o1 = helper.getNode("o1");
      var o2 = helper.getNode("o2");

      o1.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload
          // console.log(payload)

          controlVal = Buffer.from([0xBF, 0x01, 0xBF, 0x12, 0xD5, 0x02, 0x0A, 0x0B, 0x61])

          // Check Header:
          Buffer.compare(payload.slice(0, 3), controlVal.slice(0, 3)).should.equal(0)

          // Check Payload:
          Buffer.compare(payload.slice(3, 6), controlVal.slice(3, 6)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testProtoJSON });
    });
  });

  it("should convert Proto JSON into Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload
          // console.log(payload)

          controlVal = Buffer.from([TAK_MAGICBYTE, 0x47, 0x0A, 0x00, 0x12, 0x43, 0x0A, 0x0B])

          // Check Header:
          Buffer.compare(payload.slice(0, 1), Buffer.from([TAK_MAGICBYTE])).should.equal(0)

          // Check Payload:
          Buffer.compare(payload.slice(3, 6), controlVal.slice(3, 6)).should.equal(0)

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testXML });
    });
  });

  it("should convert Proto JSON into valid Stream Protobuf", done => {
    const flow = [
      { 
        id: "n1", 
        type: "tak", 
        name: "test name",
        wires: [["o0"], ["o1"], ["o2"]] 
      }, 
      { id: "o0", type: "helper" },
      { id: "o1", type: "helper" },
      { id: "o2", type: "helper" }
    ];


    helper.load(makeTAKNode, flow, () => {
      var n1 = helper.getNode("n1");
      var o2 = helper.getNode("o2");

      o2.on("input", msg => {
        try {
          msg.should.have.property("payload")
          let payload = msg.payload

          const bufferPl = typeof payload !== Buffer ? Buffer.from(payload, "hex") : payload;
          plLen = decode(bufferPl, offset=1)
          plStart = decode.bytes
          takPl = bufferPl.slice(plStart+1, bufferPl.length)

          let protoJS
          try {
            protoJS = proto.proto2js(takPl)
          } catch (err) {
            done(err);
          }

          done();
        } catch (err) {
          done(err);
        }

      })

      n1.receive({ payload: testXML });
    });
  });

});