// App probe consumes the shared package ONLY through its package name
// (@probe/shared-probe via workspace:*), never a relative ../../packages/.../src path.
import { addPoints, describe } from "@probe/shared-probe";

const sum = addPoints({ x: 1, y: 2 }, { x: 3, y: 4 });
console.log(describe(sum));
