# node-red-contrib-tak

![ATAK EUD in Worldmap](https://github.com/ampledata/node-red-contrib-tak/raw/main/docs/atak.png)

[Node-RED](https://www.nodered.org) Nodes for connecting to [TAK Products](https://tak.gov), including ATAK, WinTAK,
iTAK, and other software that speaks Cursor-On-Target, as both XML and Protobuf. Includes nodes for parsing TAK messages,
and serializing TAK messages as [Node-RED Worldmap](https://github.com/dceejay/RedMap) JSON.

![TAK2Worldmap in a Node-RED Flow](https://github.com/ampledata/node-red-contrib-tak/raw/main/docs/flow.png)

New in version 2.0: Supports decoding & encoding CoT.

## Install

Run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
cd ~/.node-red
npm install node-red-contrib-tak
```

# Author

Greg Albrecht W2GMD <oss@undef.net>

# Copyright

node-red-contrib-tak is Copyright 2022 Greg Albrecht

@vidterra/tak.js is Copyright 2021 Vidterra

# License

node-red-contrib-tak is licensed under the Apache License, Version 2.0:

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

@vidterra/tak.js is licensed under the MIT License:

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
