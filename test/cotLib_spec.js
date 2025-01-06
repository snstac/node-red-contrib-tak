const { expect } = require('chai');

const { encodeCOT } = require('../tak/cotLib');

describe('encodeCOT', () => {
  it('should encode a valid CoT payload', () => {
    const payload = {
      cotEvent: {
        type: 'a-f-G-U-C',
        uid: 'test-uid',
        time: '2023-10-01T00:00:00Z',
        start: '2023-10-01T00:00:00Z',
        stale: '2023-10-01T01:00:00Z',
        how: 'm-g',
        point: {
          lat: 34.0522,
          lon: -118.2437,
          hae: 100,
          ce: 10,
          le: 10
        },
        detail: {
          track: {
            course: 90,
            speed: 10
          },
          precisionLocation: {
            altsrc: 'GPS',
            geopointsrc: 'GPS'
          }
        }
      }
    };

    const result = encodeCOT(payload);
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(3);
    expect(result[0].payload).to.be.a('string');
    expect(result[1].payload).to.be.instanceOf(Buffer);
    expect(result[2].payload).to.be.instanceOf(Buffer);
  });

  it('should handle payload without cotEvent', () => {
    const payload = {};

    const result = encodeCOT(payload);
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(3);
    expect(result[0].payload).to.be.a('string');
    expect(result[1].payload).to.be.instanceOf(Buffer);
    expect(result[2].payload).to.be.instanceOf(Buffer);
  });

  it('should handle payload with missing details', () => {
    const payload = {
      cotEvent: {
        type: 'a-f-G-U-C',
        uid: 'test-uid',
        time: '2023-10-01T00:00:00Z',
        start: '2023-10-01T00:00:00Z',
        stale: '2023-10-01T01:00:00Z',
        how: 'm-g',
        point: {
          lat: 34.0522,
          lon: -118.2437,
          hae: 100,
          ce: 10,
          le: 10
        }
      }
    };

    const result = encodeCOT(payload);
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(3);
    expect(result[0].payload).to.be.a('string');
    expect(result[1].payload).to.be.instanceOf(Buffer);
    expect(result[2].payload).to.be.instanceOf(Buffer);
  });
});