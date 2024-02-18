themeitem = document.createElement("div");
themebutton = document.createElement("button");
themeIcon = document.createElement("div");

themeitem.classList.add("navitem");
themebutton.classList.add("navbutton");
themebutton.classList.add("change-theme");
themeIcon.classList.add("material-symbols-rounded");

themebutton.setAttribute("onclick", "themeToggle()");
themebutton.setAttribute(
  "onkeydown",
  "if(event.key === 'Enter'){themeToggle()}",
);

themeIcon.setAttribute("id", "theme-icon");
themeIcon.innerHTML = "dark_mode";

themebutton.appendChild(themeIcon);
themeitem.appendChild(themebutton);
inject();

function inject() {
  try {
    document.getElementById("navright").appendChild(themeitem);
  } catch (err) {
    setTimeout(() => {
      inject();
    }, 200);
  }
}

function lightTheme() {
  try {
    document.documentElement.setAttribute("theme", "light");
    document.getElementById("theme-icon").textContent = "dark_mode";
  } catch (err) {
    setTimeout(() => {
      lightTheme();
    }, 200);
  }
}

function darkTheme() {
  try {
    document.documentElement.setAttribute("theme", "dark");
    document.getElementById("theme-icon").textContent = "light_mode";
  } catch (err) {
    setTimeout(() => {
      darkTheme();
    }, 200);
  }
}

(function () {
  let onPageLoad = localStorage.getItem("theme") || "";
  if (onPageLoad === "") {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      localStorage.setItem("theme", "light_mode");
      lightTheme();
    } else {
      localStorage.setItem("theme", "dark_mode");
      darkTheme();
    }
  }

  if (onPageLoad === "light_mode") {
    lightTheme();
  }
  if (onPageLoad === "dark_mode") {
    darkTheme();
  }
})();

function themeToggle() {
  let theme = localStorage.getItem("theme");
  if (theme && theme === "dark_mode") {
    localStorage.setItem("theme", "light_mode");
    lightTheme();
  } else if (theme && theme === "light_mode") {
    localStorage.setItem("theme", "dark_mode");
    darkTheme();
  }
}
