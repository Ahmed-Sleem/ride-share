import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionIncident,
  isIncidentCategory,
  mayCloseWithoutDecision,
  recommendsPrecautionary,
  severityFor,
} from './incidents.js';

describe('incident domain (CH12 §12.2)', () => {
  it('maps severe categories to severe + precautionary flag', () => {
    for (const c of ['assault', 'harassment', 'dangerous_driving', 'discrimination'] as const) {
      assert.equal(severityFor(c), 'severe');
      assert.equal(recommendsPrecautionary(c), true);
    }
  });

  it('maps SOS to high (not auto-suspend)', () => {
    assert.equal(severityFor('sos'), 'high');
    assert.equal(recommendsPrecautionary('sos'), false);
  });

  it('forbids skipping investigation', () => {
    assert.equal(canTransitionIncident('OPEN', 'DECIDED'), false);
    assert.equal(canTransitionIncident('OPEN', 'INVESTIGATING'), true);
    assert.equal(canTransitionIncident('INVESTIGATING', 'DECIDED'), true);
  });

  it('never allows dismiss without a decision', () => {
    assert.equal(mayCloseWithoutDecision('OPEN', false), false);
    assert.equal(mayCloseWithoutDecision('DECIDED', false), false);
    assert.equal(mayCloseWithoutDecision('DECIDED', true), true);
  });

  it('rejects unknown categories', () => {
    assert.equal(isIncidentCategory('other'), true);
    assert.equal(isIncidentCategory('spam'), false);
  });
});
