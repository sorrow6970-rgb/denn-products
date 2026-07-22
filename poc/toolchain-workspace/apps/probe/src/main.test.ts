import assert from "node:assert/strict";
import { test } from "node:test";
import { addPoints, describe } from "@probe/shared-probe";

test("addPoints crosses the app -> shared workspace boundary", () => {
  assert.deepEqual(addPoints({ x: 1, y: 2 }, { x: 3, y: 4 }), { x: 4, y: 6 });
});

test("describe formats a shared point", () => {
  assert.equal(describe({ x: 4, y: 6 }), "point(4, 6)");
});
