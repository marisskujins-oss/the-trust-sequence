(function () {
  var ENDPOINT = 'https://poster.thetrustsequence.com/subscribe';

  document.querySelectorAll('form[data-signup]').forEach(function (form) {
    var email = form.querySelector('input[name="email"]');
    var name = form.querySelector('input[name="name"]');
    var button = form.querySelector('button[type="submit"]');
    var error = form.querySelector('.form-error');
    var card = form.closest('.signup-card');
    var success = card.nextElementSibling;
    var label = button.innerHTML;

    function fail(message) {
      email.classList.add('invalid');
      if (error) { error.textContent = message; error.hidden = false; }
    }

    email.addEventListener('input', function () {
      email.classList.remove('invalid');
      if (error) error.hidden = true;
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = email.value.trim();
      if (!value || value.indexOf('@') < 1) {
        fail('Please enter a valid email address.');
        email.focus();
        return;
      }

      button.disabled = true;
      button.textContent = 'Sending...';

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name ? name.value.trim() : '', email: value })
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          card.hidden = true;
          success.classList.add('show');
        })
        .catch(function () {
          button.disabled = false;
          button.innerHTML = label;
          fail('Something went wrong. Please try again.');
        });
    });
  });
})();
