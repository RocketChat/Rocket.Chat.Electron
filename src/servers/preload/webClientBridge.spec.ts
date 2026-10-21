import {
  getWebClientBridgeVersion,
  setWebClientBridgeVersion,
} from './webClientBridge';

describe('servers/preload webClientBridge', () => {
  it('reports no contract before the web client announces one', () => {
    expect(getWebClientBridgeVersion()).toBe(0);
  });

  it('stores the version the web client announces', () => {
    setWebClientBridgeVersion(1);
    expect(getWebClientBridgeVersion()).toBe(1);
  });

  it('ignores a version that is not an integer', () => {
    setWebClientBridgeVersion(1);
    setWebClientBridgeVersion('2');
    setWebClientBridgeVersion(1.5);
    expect(getWebClientBridgeVersion()).toBe(1);
  });
});
