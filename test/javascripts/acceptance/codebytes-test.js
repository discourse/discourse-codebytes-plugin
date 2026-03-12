import {
  click,
  currentURL,
  fillIn,
  triggerEvent,
  visit,
} from "@ember/test-helpers";
import { test } from "qunit";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";

acceptance("CodeBytes", function (needs) {
  needs.user();
  needs.settings({
    code_bytes_enabled: true,
    allow_uncategorized_topics: true,
  });

  test("inserts a codebyte when the Create a Codebyte composer toolbar button is clicked", async function (assert) {
    await visit("/");
    await click("#create-topic");

    await click(".d-editor button.codecademy-codebyte-discourse-btn");
    assert
      .dom(".d-editor-input")
      .hasValue(
        "[codebyte]\n\n[/codebyte]\n",
        "inserts a blank codebyte when no text is selected"
      );

    await fillIn(".d-editor-input", 'print("Hello, world!")');
    const textarea = document.querySelector(".d-editor-input");
    textarea.selectionStart = 0;
    textarea.selectionEnd = textarea.value.length;
    await click(".d-editor button.codecademy-codebyte-discourse-btn");
    assert
      .dom(".d-editor-input")
      .hasValue(
        '[codebyte]\nprint("Hello, world!")\n[/codebyte]\n',
        "wraps selected text in a [codebyte] tag"
      );
  });

  test("renders an iframe in the preview area", async function (assert) {
    await visit("/");
    await click("#create-topic");

    await fillIn(".d-editor-input", "[codebyte]\n\n[/codebyte]");

    assert
      .dom(".d-editor-preview .d-codebyte iframe")
      .hasAttribute(
        "src",
        /^https:\/\/www\.codecademy\.com\/codebyte-editor/,
        "renders an iframe pointing to the codebyte editor on codecademy.com"
      );
  });

  test("updates the markdown when the iframe sends a save response message", async function (assert) {
    await visit("/");
    await click("#create-topic");

    await fillIn(".d-editor-input", "[codebyte]\n\n[/codebyte]");

    await triggerEvent(window, "message", {
      data: {
        codeByteSaveResponse: {
          language: "python",
          text: "new value single line",
        },
      },
      source: document.querySelector(".d-codebyte iframe").contentWindow,
    });
    assert
      .dom(".d-editor-input")
      .hasValue(
        "[codebyte language=python]\nnew value single line\n[/codebyte]",
        "updates the language and text for a newly inserted codebyte"
      );

    await triggerEvent(window, "message", {
      data: {
        codeByteSaveResponse: {
          language: "python",
          text: "new value\nmulti line",
        },
      },
      source: document.querySelector(".d-codebyte iframe").contentWindow,
    });
    assert
      .dom(".d-editor-input")
      .hasValue(
        "[codebyte language=python]\nnew value\nmulti line\n[/codebyte]",
        "updates the text for a codebyte that has one line of text"
      );

    await triggerEvent(window, "message", {
      data: {
        codeByteSaveResponse: {
          language: "python",
          text: "line1\nline2\nline3",
        },
      },
      source: document.querySelector(".d-codebyte iframe").contentWindow,
    });
    assert
      .dom(".d-editor-input")
      .hasValue(
        "[codebyte language=python]\nline1\nline2\nline3\n[/codebyte]",
        "updates the text for a codebyte that has many lines of text"
      );
  });

  test("prevents saving if a codebyte is missing the language attribute", async function (assert) {
    await visit("/");
    await click("#create-topic");

    await fillIn("#reply-title", "This is a special topic title");

    await fillIn(".d-editor-input", "[codebyte]\n\n[/codebyte]");
    await click("#reply-control button.create");
    assert
      .dom(".dialog-body")
      .exists("shows a dialog to prevent save for newly created codebyte");

    await click(".dialog-footer .btn-primary");
    assert.dom(".dialog-body").doesNotExist("the dialog has been closed");

    await fillIn(
      ".d-editor-input",
      "[codebyte language=python]\nprint(hello)\n[/codebyte]\nfiller text\n[codebyte]\n\n[/codebyte]\n"
    );
    await click("#reply-control button.create");
    assert
      .dom(".dialog-body")
      .exists(
        "shows a dialog to prevent save when there is one valid and one invalid codebyte"
      );
    await click(".dialog-footer .btn-primary");

    await fillIn("#reply-title", "CodeBytes Test Post");
    await fillIn(
      ".d-editor-input",
      "[codebyte language=python]\nprint(hello)\n[/codebyte]"
    );
    await click("#reply-control button.create");
    assert
      .dom(".dialog-body")
      .doesNotExist("the dialog is not shown if the codebyte is valid");

    assert.strictEqual(
      currentURL(),
      "/t/internationalization-localization/280",
      "successfully creates the post if the codebyte is valid"
    );
  });
});
