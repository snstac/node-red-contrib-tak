#!/usr/bin/env node
/*
TAK Node-RED Nodes.

Author:: Greg Albrecht W2GMD <oss@undef.net>
Copyright:: Copyright 2022 Greg Albrecht
License:: Apache License, Version 2.0
Source:: https://github.com/ampledata/node-red-contrib-tak

Copyright 2022 Greg Albrecht

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/* jslint node: true */
/* jslint white: true */

const {cot, proto} = require("@vidterra/tak.js");

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
    let SIDC = `s${affil}${et[2]}p${et[3] || "-" }${et[4] || "-" }${et[5] || "-" }--------`;

    return SIDC;
};

/*
Parses Cursor-On-Target plain-text XML or Protobuf into Node.js JSON.
*/
let parseTAK = (message) => {
    /* START: @vidterra/tak.js/scripts/parse.js
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
    const bufferMessage = typeof message !== Buffer ? Buffer.from(message, "hex") : message;

    let takFormat;
    let payload;

    if (bufferMessage[0] === 191) { // TAK message format 0xbf
        const trimmedBuffer = bufferMessage.slice(3, bufferMessage.length); // remove tak message header from content
        if (bufferMessage[1] === 0) { // is COT XML
            takFormat = "TAK COT XML";
            payload = cot.xml2js(trimmedBuffer); // try parsing raw XML
        } else if (bufferMessage[1] === 1) { // is Protobuf
            takFormat = "Protobuf";
            payload = proto.proto2js(trimmedBuffer);
        }
    } else { // not TAK message format
        try {
            takFormat = "COT XML";
            payload = cot.xml2js(message); // try parsing raw XML
        } catch (e) {
          console.error("Failed to parse message", e);
        }
    }

    payload.TAKFormat = takFormat;
    return payload;
    // END: @vidterra/tak.js/scripts/parse.js
};

module.exports = function(RED) {
    "use strict";

    // This has to be a func def, not a () => def.
    function tak (config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.on("input", (msg) => {
            msg.payload = parseTAK(msg.payload);
            node.send(msg);
        });
    }
    RED.nodes.registerType("tak", tak);

    function tak2wm (config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.on("input", (msg) => {            
            if (msg.payload === undefined) {
                return;
            }

            let pl = parseTAK(msg.payload);
            if (pl === undefined) {
                return;
            }

            let event;
            let detail;
            let cotType;
            let uid;
            let point;
            let contact;
            let status;
            let group;
            let track;
            let takv;
            let lastUpdate;

            let TAKFormat = pl.TAKFormat;

            if (TAKFormat === "COT XML" || TAKFormat === "TAK COT XML") {
                event = pl.event;
                if (event === undefined) {
                    return;
                }

                detail = event.detail;
                if (detail === undefined) {
                    return;
                }

                cotType = event._attributes.type;
                uid = event._attributes.uid;
                point = event.point._attributes;

                contact = detail.contact;
                if (contact) {
                    contact = contact._attributes;
                }

                status = detail.status;
                if (status) {
                    status = status._attributes;
                }

                group = detail.__group;
                if (group) {
                    group = group._attributes;
                }

                track = detail.track;
                if (track) {
                    track = track._attributes;
                }

                takv = detail.takv;
                if (takv) {
                    takv = takv._attributes;
                }

                lastUpdate = new Date(event._attributes.time).toLocaleString();
            } else if (TAKFormat === "Protobuf") {
                event = pl.cotEvent;
                if (event === undefined) {
                    return;
                }

                detail = event.detail;
                if (detail === undefined) {
                    return;
                }
            
                cotType = event.type;
                uid = event.uid;
                point = event;
                contact = detail.contact;
                status = detail.status;
                group = detail.group;
                lastUpdate = new Date(event.sendTime).toLocaleString();
                track = detail.track;
                takv = detail.takv;
            }

            let icon;
            let invalid = "9999999.0";
            let sidc = cotType2SIDC(cotType);

            /* Bug?
            The "TAK Protocol Version 1" Contact Protobuf message[1] contains 
            two items::
        
                message Contact {
                    string endpoint = 1;
                    string callsign = 2;
                }
            
            WinTAK sends an additional Contact item:: 
                
                string emailAddress

            This causes our parser, @vidterra/tak.js, to pass WinTAK Contact 
            messages as opaque XML. That's OK, because we can parse it directly, see below.

            It is unclear how other implementations of "TAK Protocol Version 1"
            handle the inclusion of this extra Contact item from WinTAK.
            
            This is probably a bug in WinTAK for now, but should be added to future
            revisions of "TAK Protocol Version 1".

            1. Contact Protobuf message: https://github.com/deptofdefense/AndroidTacticalAssaultKit-CIV/blob/master/commoncommo/core/impl/protobuf/contact.proto
            */
            if (takv && takv.platform.toLowerCase().includes("wintak")) {
                let xmlDetail = cot.xml2js(detail.xmlDetail);
                if (xmlDetail) {
                    contact = xmlDetail._attributes;
                    if (contact === undefined) {
                        contact = xmlDetail.contact._attributes;
                    }
                }
            }

            /* 
            Points on the Worldmap can only have one uniquite identifier, which is also
            that Points display name. If possible, use a Callsign, otherwise use UID.
            */
            let callsign;
            if (contact) {
                callsign = contact.callsign;
            } else {
                callsign = uid;
            }

            let battery;
            if (status) {
                battery = status.battery;
            }

            let iconColor;
            if (group) {
                iconColor = group.name.toLowerCase();
            }

            if (callsign.includes("SFPD") || uid.includes("SFPD")) {
                icon = ":cop:";
            }

            if (callsign.includes("PulsePoint") || uid.includes("PulsePoint")) {
                icon = ":rotating_light:";
            }

            let tooltip;
            let remarks = detail.remarks;
            if (remarks) {
                remarks = remarks._text;
                tooltip = remarks;
            }

            let speed;
            let course;
            if (track) {
                if (track.speed && track.speed.toString() !== invalid) {
                    speed = track.speed;
                }
                if (track.course && track.course.toString() !== invalid && track.course !== 0.0 && track.course !== 0) {
                    course = track.course;
                }
            }

            /* 
            If COT Point CE is set and is not invalid, use that as Worldmap Point Accuracy. 
            */
            let accuracy;
            let ce = point.ce;
            if (ce.toString() !== invalid) {
                accuracy = ce;
            }

            /* Serialize as a Worldmap compatible Payload. */
            let payload = {
                name: iconColor ? uid : callsign,
                callsign: iconColor ? callsign : undefined,
                label: iconColor ? callsign : undefined,
                hae: point.hae !== invalid ? point.hae : undefined,
                lat: parseFloat(point.lat),
                lon: parseFloat(point.lon),
                cotType: cotType,
                lastUpdate: lastUpdate,
                icon: icon,
                tooltip: tooltip,
                track: parseFloat(course),
                speed: parseFloat(speed),
                accuracy: parseFloat(accuracy),
                layer: cotType,
                groupName: group ? group.name : undefined,
                groupRole: group ? group.role : undefined,
                SIDC: iconColor ? undefined : sidc,
                iconColor: iconColor,
                battery: battery ? `${battery}%` : undefined,
                TAKFormat: TAKFormat
            };

            msg.payload = payload;
            node.send(msg);
        });
    }
    RED.nodes.registerType("tak2wm", tak2wm);
};
