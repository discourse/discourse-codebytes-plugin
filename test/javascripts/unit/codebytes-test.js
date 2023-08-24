import { module, test } from "qunit";
import { findCodeByte } from "discourse/plugins/discourse-codebytes-plugin/initializers/code-bytes";

module("Unit | Utility | findCodeByte", function () {
  test("finds empty codebytes at a given index", (assert) => {
    const testString = [
      "test test test",
      "[codebyte language=javascript]",
      "[/codebyte]",
      "[codebyte]",
      "[/codebyte]",
    ];

    assert.deepEqual(findCodeByte(testString, 0), [1, 2]);
    assert.deepEqual(findCodeByte(testString, 1), [3, 4]);
  });

  test("finds single-line codebytes at a given index", (assert) => {
    const testString = [
      "test test test",
      "[codebyte language=javascript]",
      "test",
      "[/codebyte]",
      "[codebyte]",
      "test",
      "[/codebyte]",
    ];

    assert.deepEqual(findCodeByte(testString, 0), [1, 3]);
    assert.deepEqual(findCodeByte(testString, 1), [4, 6]);
  });

  test("finds multi-line codebytes at a given index", (assert) => {
    const testString = [
      "test test test",
      "[codebyte language=javascript]",
      "test",
      "test test test",
      "[/codebyte]",
      "[codebyte]",
      "test",
      "test test test",
      "[/codebyte]",
    ];

    assert.deepEqual(findCodeByte(testString, 0), [1, 4]);
    assert.deepEqual(findCodeByte(testString, 1), [5, 8]);
  });

  test("ignores inline codebytes", (assert) => {
    const testString = [
      "[codebyte language=javascript]test[/codebyte]",
      "[codebyte]test[/codebyte]",
    ];

    assert.deepEqual(findCodeByte(testString, 0), []);
  });

  test("ignores codebytes with leading characters", (assert) => {
    const testString = [
      "test[codebyte lang=javascript]",
      "[/codebyte]",
      "[codebyte language=javascript]",
      "test[/codebyte]",
      "test[codebyte]",
      "[/codebyte]",
      "[codebyte]",
      "test[/codebyte]",
    ];

    assert.deepEqual(findCodeByte(testString, 0), [2, 5]);
    assert.deepEqual(findCodeByte(testString, 1), []);
  });

  test("ignores codebytes with trailing characters", (assert) => {
    const testString = [
      "[codebyte lang=javascript]test",
      "[/codebyte]",
      "[codebyte language=javascript]",
      "[/codebyte]test",
      "[codebyte]test",
      "[/codebyte]",
      "[codebyte]",
      "[/codebyte]test",
    ];

    assert.deepEqual(findCodeByte(testString, 0), [2, 5]);
    assert.deepEqual(findCodeByte(testString, 1), []);
  });

  test("ignores codebytes with an open tag spread across multiple lines", (assert) => {
    const testString = [
      "[codebyte ",
      "language=javascript]",
      "console.log()",
      "[/codebyte]",
    ];

    assert.deepEqual(findCodeByte(testString, 0), []);
  });

  test("ignores un-terminated codebytes", (assert) => {
    let testString = [
      "test test test",
      "[codebyte language=javascript]",
      "test",
      "[codebyte]",
    ];

    assert.deepEqual(findCodeByte(testString, 0), []);
  });

  test("ignores nested codebytes", (assert) => {
    const testString = [
      "test test test",
      "[codebyte language=javascript]",
      "[codebyte]",
      "test",
      "[/codebyte]",
      "[/codebyte]",
      "[codebyte]",
      "test",
      "[/codebyte]",
    ];

    assert.deepEqual(findCodeByte(testString, 1), [6, 8]);
  });
});
