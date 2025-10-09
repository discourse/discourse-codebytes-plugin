import { action } from "@ember/object";
import loadScript from "discourse/lib/load-script";
import { withPluginApi } from "discourse/lib/plugin-api";
import { i18n } from "discourse-i18n";

export const CODEBYTE_OPEN_TAG_REGEX = /^\[codebyte.*]$/;
export const CODEBYTE_OPEN_TAG_WITH_LANG_REGEX =
  /^\[codebyte[ ]+language=([^\s]+?)[ ]*]$/;
export const CODEBYTE_CLOSE_TAG_REGEX = /^\[\/codebyte]$/;

export function findCodeByte(lines = [], index) {
  const startTagLines = [];
  const range = [];
  let matchIndex = -1;

  lines.some((line, lineNumber) => {
    if (line.match(CODEBYTE_OPEN_TAG_REGEX)) {
      startTagLines.push(lineNumber);
    } else if (line.match(CODEBYTE_CLOSE_TAG_REGEX) && startTagLines.length) {
      const start = startTagLines.pop();
      if (startTagLines.length === 0) {
        matchIndex++;
      }
      if (matchIndex === index) {
        range.push(start, lineNumber);
        return true; // break
      }
    }
  });

  return range;
}

function initializeCodeByte(api) {
  api.onToolbarCreate((toolbar) => {
    toolbar.groups.lastObject.lastGroup = false;

    toolbar.groups.addObject({
      group: "codecademy",
      buttons: [],
      lastGroup: true,
    });

    toolbar.addButton({
      id: "codebyte",
      title: "composer.codebyte",
      group: "codecademy",
      icon: "codecademy-logo",
      className: "codecademy-codebyte-discourse-btn",
      action: () => toolbar.context.send("insertCodeByte"),
    });
  });

  api.modifyClass(
    "component:d-editor",
    (Superclass) =>
      class extends Superclass {
        init() {
          super.init(...arguments);

          this.onSaveResponse = (message) => {
            if (message.data.codeByteSaveResponse) {
              const editableCodebyteFrames = this.element?.querySelectorAll(
                ".d-editor-preview .d-codebyte iframe"
              );

              if (!editableCodebyteFrames) {
                return;
              }

              const codebyteWindows = Array.from(editableCodebyteFrames).map(
                (frame) => frame.contentWindow
              );

              const index = codebyteWindows.indexOf(message.source);
              if (index >= 0) {
                this.send(
                  "updateCodeByte",
                  index,
                  message.data.codeByteSaveResponse
                );
              }
            }
          };

          window.addEventListener("message", this.onSaveResponse, false);
        }

        willDestroyElement() {
          super.willDestroyElement(...arguments);
          window.removeEventListener("message", this.onSaveResponse, false);
        }

        @action
        insertCodeByte() {
          let exampleFormat = "[codebyte]\n\n[/codebyte]";
          let startTag = "[codebyte]\n";
          let endTag = "\n[/codebyte]";

          const lineValueSelection = this.textManipulation.getSelected("", {
            lineVal: true,
          });
          const selection = this.textManipulation.getSelected();
          const addBlockInSameline = lineValueSelection.lineVal.length === 0;
          const isTextSelected = selection.value.length > 0;
          const isWholeLineSelected =
            lineValueSelection.lineVal === lineValueSelection.value;
          const isBeginningOfLineSelected =
            lineValueSelection.pre.trim() === "";
          const newLineAfterSelection = selection.post[0] === "\n";

          if (isTextSelected) {
            if (
              !(
                addBlockInSameline ||
                isWholeLineSelected ||
                isBeginningOfLineSelected
              )
            ) {
              startTag = "\n" + startTag;
            }
            if (!newLineAfterSelection) {
              endTag = endTag + "\n";
            }
            this.set(
              "value",
              `${selection.pre}${startTag}${selection.value}${endTag}${selection.post}`
            );
          } else {
            if (!addBlockInSameline) {
              exampleFormat = "\n" + exampleFormat;
            }
            if (!newLineAfterSelection) {
              exampleFormat = exampleFormat + "\n";
            }
            this.textManipulation.insertText(exampleFormat);
          }
        }

        @action
        updateCodeByte(index, { text, language }) {
          const lines = this.get("value").split("\n");
          const [start, end] = findCodeByte(lines, index);

          if (start !== undefined && end !== undefined) {
            const replacementLines = [
              `[codebyte language=${language}]`,
              ...text.split("\n"),
            ];
            lines.splice(start, end - start, ...replacementLines);
          }
          this.set("value", lines.join("\n"));
        }
      }
  );

  function renderCodebyteFrame(
    language = "",
    text = "",
    isPreview = false,
    postUrl = ""
  ) {
    return loadScript(
      "https://cdn.jsdelivr.net/npm/js-base64@3.6.0/base64.min.js"
    ).then(() => {
      const frame = document.createElement("iframe");
      frame.allow = "clipboard-write";

      const params = [];
      params.push(`lang=${language}`);
      // eslint-disable-next-line no-undef
      params.push(`text=${Base64.encodeURI(text)}`);

      params.push(`client-name=forum`);
      params.push(`page=${encodeURIComponent(postUrl)}`);
      if (isPreview) {
        params.push(`mode=compose`);
      }

      frame.src = `https://www.codecademy.com/codebyte-editor?${params.join(
        "&"
      )}`;

      Object.assign(frame.style, {
        display: "block",
        height: "400px",
        width: "100%",
        maxWidth: "712px",
        marginBottom: "24px",
        border: 0,
      });

      return frame;
    });
  }

  api.decorateCookedElement(
    (elem, decoratorHelper) => {
      const isPreview = elem.classList.contains("d-editor-preview");
      const post = decoratorHelper?.getModel();
      const postUrl = post
        ? `${document.location.origin}${post.urlWithNumber}`
        : document.location.href;
      elem.querySelectorAll("div.d-codebyte").forEach(async (div) => {
        const codebyteFrame = await renderCodebyteFrame(
          div.dataset.language,
          div.textContent.trim(),
          isPreview,
          postUrl
        );
        div.innerHTML = "";
        div.appendChild(codebyteFrame);

        if (isPreview) {
          const saveButton = document.createElement("button");
          saveButton.className = "btn-primary";
          saveButton.textContent = "Save to post";
          saveButton.style.marginBottom = "24px";
          saveButton.onclick = () =>
            codebyteFrame.contentWindow.postMessage(
              { codeByteSaveRequest: true },
              "*"
            );
          div.appendChild(saveButton);
        }
      });
    },
    { id: "codebyte-preview" }
  );

  api.composerBeforeSave(() => {
    return new Promise((resolve, reject) => {
      const composerModel = api.container.lookup("service:composer").model;

      let allCodebytesAreValid = true;
      let index = 0;

      let start, end;
      const inputLines = composerModel.reply.split("\n");

      do {
        // eslint-disable-next-line no-unused-vars
        [start, end] = findCodeByte(inputLines, index);
        index++;
        if (
          start !== undefined &&
          !inputLines[start].match(CODEBYTE_OPEN_TAG_WITH_LANG_REGEX)
        ) {
          allCodebytesAreValid = false;
        }
      } while (allCodebytesAreValid && start !== undefined);

      if (!allCodebytesAreValid) {
        const dialog = api.container.lookup("service:dialog");

        dialog.alert({
          title: i18n("codebytes_modal.title"),
          message: i18n("codebytes_modal.content"),
        });
        return reject();
      }

      return resolve();
    });
  });
}

export default {
  name: "code-bytes",

  initialize(container) {
    const siteSettings = container.lookup("service:site-settings");
    if (siteSettings.code_bytes_enabled) {
      withPluginApi(initializeCodeByte);
    }
  },
};
