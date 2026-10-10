(function () {
  var menu = document.querySelector('.nav-menu');
  var panel = document.getElementById('nav-panel');
  if (menu && panel) {
    menu.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      menu.setAttribute('aria-expanded', String(open));
      menu.textContent = open ? 'Close' : 'Menu';
    });
    panel.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        panel.hidden = true;
        menu.setAttribute('aria-expanded', 'false');
        menu.textContent = 'Menu';
      }
    });
  }

  // The nav signup link stays hidden while the hero form is on screen, so it never competes with it.
  var navSignup = document.querySelector('.nav-signup');
  var heroForm = document.querySelector('[data-hero-form]');
  if (navSignup && heroForm && 'IntersectionObserver' in window) {
    navSignup.hidden = true;
    new IntersectionObserver(function (entries) {
      navSignup.hidden = entries[0].isIntersecting;
    }).observe(heroForm);
  }
})();
