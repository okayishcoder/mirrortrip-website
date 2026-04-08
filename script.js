(function () {
  var navToggle = document.querySelector('.nav-toggle');
  var siteNav = document.querySelector('.site-nav');
  var currentYear = document.getElementById('current-year');
  var page = document.body.getAttribute('data-page');

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  if (siteNav && page) {
    Array.prototype.forEach.call(siteNav.querySelectorAll('a'), function (link) {
      var href = link.getAttribute('href');
      if (
        (page === 'home' && href === 'index.html') ||
        (page === 'privacy' && href === 'privacy.html') ||
        (page === 'terms' && href === 'terms.html') ||
        (page === 'support' && href === 'support.html') ||
        (page === 'delete' && href === 'delete-account.html')
      ) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      siteNav.classList.toggle('is-open', !expanded);
    });

    Array.prototype.forEach.call(siteNav.querySelectorAll('a'), function (link) {
      link.addEventListener('click', function () {
        navToggle.setAttribute('aria-expanded', 'false');
        siteNav.classList.remove('is-open');
      });
    });
  }
})();



