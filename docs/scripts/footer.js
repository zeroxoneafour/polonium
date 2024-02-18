fetch("footer.html").then(function (response) {
  response.text().then(function (text) {
    document.getElementById("footer").innerHTML = text;
  });
});
