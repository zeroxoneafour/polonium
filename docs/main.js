function include(file) {
  var script = document.createElement('script');
  script.src = file;
  script.type = 'text/javascript';
  script.defer = true; 
  document.getElementsByTagName('head').item(0).appendChild(script);
}

include("./scripts/themeToggle.js");
include("./scripts/header.js");
include("./scripts/footer.js");
include("./scripts/navbar.js");
include("https://cdn.jsdelivr.net/npm/marked/marked.min.js");
include("https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js");