## 4.1.1

- Fixes #2: TAK2WM broken in 4.1.0

## 4.1.0

- Moved documentation to ReadTheDocs: [node-red-contrib-tak](https://node-red-contrib-tak.readthedocs.io)
- Updated GitHub repo URLs to snstac.
- Formatting & style cleanup with prettier.
- Improved error handling for weird payloads.
- Added missing Elements (le, hae, lat, lon) for Protobuf definitions.

## 4.0.0

- Updated to support TAK Protocol Version 1 Mesh & Stream Protobuf.
- Changed TAK Node to have 3 outputs: 1-JSON or XML, 2-Mesh, 3-Stream.
- Added unit tests!
- Updated README with node descriptions & GUI install instructions.

## 3.0.0

Updated protobuf support to include encoding & decoding (input & output).

## 2.2.0

- Added protobuf output support via additional second node output.

## 2.1.1

- Fixed conditional in wintak protobuf logic.

## 2.1.0

- Several bug fixes for input CoT parsing. You should now be able to pipe the TAK
  Node directly into the TAK2WM node.

- Automatic addition of ?xml header to incoming CoT (if missing).

- Added two examples in the examples/ dir.

- Added documentation to TAK and TAK2WM Nodes.
