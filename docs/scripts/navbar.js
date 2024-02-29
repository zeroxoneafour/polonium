fetch("navbar.html").then(function (response) {
  response.text().then(function (text) {
    document.getElementById("navbar").innerHTML =
      text + document.getElementById("navbar").innerHTML;
    document.getElementById("activenav").innerHTML = document.getElementById(
      document.getElementById("pagename").getAttribute("content") + "nav",
    ).innerHTML;
    document
      .getElementById(
        document.getElementById("pagename").getAttribute("content") + "nav",
      )
      .classList.add("active");
  });
});

function Menu(icon) {
  var x = document.getElementById("navbar");
  if (x.className === "navbar") {
    x.className += " responsive";
  } else {
    x.className = "navbar";
  }
}
