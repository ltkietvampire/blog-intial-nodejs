const test = require('node:test');
const assert = require('node:assert/strict');
const flashMessage = require('../src/app/middleware/flashMessage');

test('flashMessage exposes and consumes existing session flash', () => {
  const req = {
    session: {
      flash: {
        success: ['Saved'],
        error: ['Invalid data'],
      },
    },
  };
  const res = { locals: {} };
  let nextCalled = 0;

  flashMessage(req, res, () => {
    nextCalled += 1;
  });

  assert.equal(nextCalled, 1);
  assert.deepEqual(res.locals.flash.success, ['Saved']);
  assert.deepEqual(res.locals.flash.error, ['Invalid data']);
  assert.equal(req.session.flash, undefined);
});

test('flashMessage stores new success and error messages via req.flash', () => {
  const req = { session: {} };
  const res = { locals: {} };

  flashMessage(req, res, () => {});
  req.flash('success', 'Created item');
  req.flash('error', 'Validation failed');

  assert.deepEqual(req.session.flash.success, ['Created item']);
  assert.deepEqual(req.session.flash.error, ['Validation failed']);
});
