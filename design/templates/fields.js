// Fill [data-field] elements from the query string: carousel.html?title=...&body=...
(function () {
  var params = new URLSearchParams(location.search);
  document.querySelectorAll('[data-field]').forEach(function (el) {
    if (params.has(el.dataset.field)) el.textContent = params.get(el.dataset.field);
  });
})();
