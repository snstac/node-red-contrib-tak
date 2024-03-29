## TAK Node

| ![TAK Node](nodes/tak_node.png) |
| :-- |
| The TAK Node allows TAK data in any format to be encoded, decoded and transformed between any TAK format. |

| ![TAK Node Input](nodes/tak_node-input.png) |
| :-- |
| TAK Node input accepts CoT as a JavaScript Object (JSON), String or Buffer. |

| ![TAK Node Output 1 (CoT XML or JSON)](nodes/tak_node-output1.png) |
| :-- |
| TAK Node Output 1 returns either CoT as JSON or String, depending on Input. |

| ![TAK Node Output 2 (Multicast Protobuf)](nodes/tak_node-output2.png) |
| :-- |
| TAK Node Output 2 returns CoT as a TAK Protocol Version 1 Mesh encoded Protobuf Buffer. |

| ![TAK Node Output 3 (Stream Protobuf)](nodes/tak_node-output3.png) |
| :-- |
| TAK Node Output 3 returns CoT as a TAK Protocol Version 1 Stream encoded Protobuf Buffer. |

## TAK2WorldMap Node

| ![TAK2WorldMap Node](nodes/tak2wm_node.png) |
| :-- |
| The TAK2WorldMap Node accepts Cot in any format and outputs Node-RED WorldMap ([RedMap](https://github.com/dceejay/RedMap)) JSON, ready for use by the Worldmap Node. |

