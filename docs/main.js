function include(file) {
  var script = document.createElement("script");
  script.src = file;
  script.type = "text/javascript";
  script.defer = true;
  document.getElementsByTagName("head").item(0).appendChild(script);
}

include("./scripts/themeToggle.js");
include("./scripts/header.js");
include("./scripts/footer.js");
include("./scripts/navbar.js");
include("https://cdn.jsdelivr.net/npm/marked/marked.min.js");
include("https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js");

function getFirstDescendantByClass(parent, className) {
  var descendants = parent.getElementsByClassName(className);
  if (descendants.length) return descendants[0];
  return null;
}

function getFirstDescendantByTag(parent, tagName) {
  var descendants = parent.getElementsByTagName(tagName);
  if (descendants.length) return descendants[0];
  return null;
}

function copyToClipboardFromId(textElementId, trigerElement = null) {
  navigator.clipboard.writeText(
    document.getElementById(textElementId).innerHTML,
  );
  trigerElement.innerHTML = "done";
  setTimeout(() => {
    trigerElement.innerHTML = "content_copy";
  }, 1000);
}

function addCopyButton(element, textElementId) {
  if (getFirstDescendantByClass(element, "button") != null) return;
  var button = document.createElement("button");
  button.classList.add("pre-copy-button");
  button.classList.add("material-symbols-rounded");
  button.setAttribute(
    "onclick",
    'copyToClipboardFromId("' + textElementId + '", this);',
  );
  button.innerHTML = "content_copy";
  element.appendChild(button);
}

function markdownParse(url, id) {
  fetch(url).then(function (response) {
    response.text().then(function (text) {
      var parsedMarkdown = document.createElement("div");
      parsedMarkdown.innerHTML = marked.parse(text);
      var preElements = parsedMarkdown.querySelectorAll("pre");

      for (i = 0; i < preElements.length; i++) {
        var e = preElements[i];
        var preContainer = document.createElement("div");

        var textElement = getFirstDescendantByTag(e, "code");
        if (textElement == null) textElement = e;
        textElement.setAttribute("id", id + "-pre-" + i);

        pre = document.createElement("pre");
        pre.innerHTML = e.innerHTML;
        preContainer.appendChild(pre);
        preContainer.classList.add("pre-container");

        addCopyButton(preContainer, id + "-pre-" + i);
        e.replaceWith(preContainer);
      }

      document.getElementById(id).innerHTML = parsedMarkdown.innerHTML;
    });
  });
}
