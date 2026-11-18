class RtmClientMock {
  createInstance() {
    return Promise.resolve();
  }
  release() {
    return Promise.resolve();
  }
  logout() {
    return Promise.resolve();
  }
  loginV2() {
    return Promise.resolve();
  }
  addListener() {}
  removeListener() {}
  joinChannel() {
    return Promise.resolve();
  }
  leaveChannel() {
    return Promise.resolve();
  }
  sendMessage() {
    return Promise.resolve();
  }
  sendChannelMessage() {
    return Promise.resolve();
  }
  getChannelMemberCount() {
    return Promise.resolve();
  }
}

RtmClientMock.getSdkVersion = () => Promise.resolve('shim');

const enums = {
  ConnectionChangeReason: {},
  RtmConnectionState: {},
  RtmMessage: {},
  RtmChannelMember: {},
};

module.exports = RtmClientMock;
module.exports.default = RtmClientMock;
Object.assign(module.exports, enums);
