const test = require('node:test');
const assert = require('node:assert/strict');
const requireAuth = require('../src/app/middleware/requireAuth');

test('requireAuth allows request when session has user id', () => {
  const req = {
    session: {
      user: { _id: 'abc123' },
    },
  };
  let redirectedTo = null;
  let nextCalled = 0;
  const res = {
    redirect(path) {
      redirectedTo = path;
    },
  };

  requireAuth(req, res, () => {
    nextCalled += 1;
  });

  assert.equal(nextCalled, 1);
  assert.equal(redirectedTo, null);
});

test('requireAuth redirects to /login when session is missing user', () => {
  const req = { session: {} };
  let redirectedTo = null;
  let nextCalled = 0;
  const res = {
    redirect(path) {
      redirectedTo = path;
    },
  };

  requireAuth(req, res, () => {
    nextCalled += 1;
  });

  assert.equal(nextCalled, 0);
  assert.equal(redirectedTo, '/login');
});
