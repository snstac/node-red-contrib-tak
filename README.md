# node-red-contrib-tak

![ATAK Screenshot](https://github.com/ampledata/node-red-contrib-tak/raw/main/docs/nr_atak_screenshot.png)

[Node-RED](https://www.nodered.org) Nodes for connecting to [TAK Products](https://tak.gov), including ATAK, WinTAK, iTAK & TAK Server. Other systems that speak Cursor on Target (CoT) or the TAK Protocols are also supported, including COPERS. Supports decoding & encoding CoT messages as JSON, plain XML, and both TAK Protocol Version 1 Streaming & TAK Protocol Version 1 Mesh.

These Node-RED Nodes allow the creation of a Tactical ETL: A tool for transforming real-time situational 
awareness data.

![TAK Node][https://github.com/ampledata/node-red-contrib-tak/raw/main/docs/tak_node.png]

The TAK Node allows TAK data in any format to be decoded and encoded as any other format. 

For example, the node can decode incoming stream data, and re-encode the data as plain XML, or 
the reverse.


.... TK TK TK ...
 [Node-RED Worldmap "RedMap"](https://github.com/dceejay/RedMap) JSON.

![TAK2Worldmap in a Node-RED Flow](https://github.com/ampledata/node-red-contrib-tak/raw/main/docs/flow.png)

## Tutorial Videos

* [Node-RED: JSON to Cursor on Target](https://www.youtube.com/watch?v=5i-y3Nc01Hs)
* [Node-RED TAK on Windows](https://www.youtube.com/watch?v=1mHphHhX4lk)
* [ACT Emergency Services Agency incidents into ATAK using Node-RED](https://www.youtube.com/watch?v=1xDQmRZAtFo)

## Install

Run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
cd ~/.node-red
npm install node-red-contrib-tak
```


# Author

Greg Albrecht <oss@undef.net> https://github.com/ampledata


# Copyright

node-red-contrib-tak is Copyright 2023 Greg Albrecht


# Licenses

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.