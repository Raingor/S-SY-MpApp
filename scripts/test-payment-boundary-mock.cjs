// Mock-only: every request is intercepted locally; no real order or wx.requestPayment.
const assert = require('node:assert/strict');
const responses = [
  { simulation: true, order: { id: 'fixture-pending', status: 'pending' }, payment: null },
  { simulation: true, order: { id: 'fixture-misconfigured', status: 'pending' }, payment: { timeStamp: '1' } },
  { simulation: false, order: { id: 'fixture-no-payment', status: 'pending' } }
];
let requestCount = 0;
global.getApp = () => ({ globalData: { apiBase: 'https://fixture.invalid', auth: { accessToken: '' } } });
global.wx = {
  getStorageSync: () => '',
  request({ url, method, success }) {
    assert.match(url, /^https:\/\/fixture\.invalid\/api\/miniprogram\/orders$/);
    assert.equal(method, 'POST');
    requestCount++;
    success({ statusCode: 201, data: responses.shift() });
  }
};
const paid = require('../utils/paid-content');
let simulationResult;
paid.createOrder('attraction', 'fixture-attraction', (ok, data) => {
  assert.equal(ok, false);
  simulationResult = data;
});
assert.equal(simulationResult.pendingSimulation, true);
let misconfiguredSimulation;
paid.createOrder('attraction', 'fixture-attraction', (ok, data) => {
  assert.equal(ok, false);
  misconfiguredSimulation = data;
});
assert.equal(misconfiguredSimulation.pendingSimulation, true);
let missingPaymentResult;
paid.createOrder('membership', '', (ok, data) => {
  assert.equal(ok, false);
  missingPaymentResult = data;
});
assert.equal(missingPaymentResult.payment, undefined);
assert.equal(requestCount, 3);
assert.equal(typeof wx.requestPayment, 'undefined');
console.log('PASS: mock orders missing payment or falsely marking simulation with payment never invoke wx.requestPayment; no real request/order/charge');
