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

const { cot } = require("@vidterra/tak.js");
const { handlePayload, cotType2SIDC } = require("./cotLib");

const makeTAK2WMNode = (RED) => {
  function tak2wm(config) {
    RED.nodes.createNode(this, config);
    let node = this;

    node.on("input", (msg) => {
      if (msg.payload === undefined) {
        return;
      }

      let pl = handlePayload(msg.payload)[0];

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

      if (pl.cotEvent === undefined) {
        event = pl.event;

        detail = event.detail;
        if (detail) {
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
        }

        cotType = event._attributes.type;
        uid = event._attributes.uid;
        point = event.point._attributes;

        lastUpdate = new Date(event._attributes.time).toLocaleString();
      } else {

        event = pl.cotEvent;

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
      if (
        takv &&
        takv.platform &&
        takv.platform.toLowerCase().includes("wintak")
      ) {
        let xmlDetail = cot.xml2js(detail.xmlDetail);

        if (xmlDetail._attributes) {
          contact = xmlDetail._attributes;
        } else if (xmlDetail.contact) {
          contact = xmlDetail.contact._attributes;
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
      let remarks;
      if (detail) {
        remarks = detail.remarks;
      }
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
        if (
          track.course &&
          track.course.toString() !== invalid &&
          track.course !== 0.0 &&
          track.course !== 0
        ) {
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
      };

      msg.payload = payload;
      node.send(msg);
    });
  }
  RED.nodes.registerType("tak2wm", tak2wm);
};

module.exports = makeTAK2WMNode;
