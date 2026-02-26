(function () {
  document.querySelectorAll("pre:has(code)").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.className = "book-copy-btn";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");

    btn.addEventListener("click", function () {
      var code = pre.querySelector("code");
      if (!code) return;

      navigator.clipboard.writeText(code.textContent).then(function () {
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 2000);
      });
    });

    pre.style.position = "relative";
    pre.appendChild(btn);
  });
})();
