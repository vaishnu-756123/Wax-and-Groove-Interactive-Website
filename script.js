/* =========================================================
   Wax & Groove — script.js
   Plain JavaScript, no dependencies. Organized into small,
   independent feature modules that each grab their own DOM
   references and wire up their own listeners. Every module
   is wrapped in an "if the elements exist" guard so this file
   would not throw if a section were ever removed from the page.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initThemeToggle();
  initGenreFilter();
  initWishlist();
  initCart();
  initAccordion();
  initCarousel();
  initNewsletterForm();
  initBackToTop();
  initScrollReveal();
});

/* ---------------------------------------------------------
   Small shared helper: toast notifications
   --------------------------------------------------------- */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

/* ---------------------------------------------------------
   1. Mobile navigation toggle
   --------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');
  if (!toggle || !navList) return;

  toggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  navList.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navList.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------------------------------------------------------
   2. Theme toggle (dark / light)
   Reads/writes a single data-theme attribute on <body> so
   every color in the stylesheet updates via CSS custom
   properties — JS never touches individual element colors.
   --------------------------------------------------------- */
function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
  });
}

/* ---------------------------------------------------------
   3. Genre filter
   Filters the record grid by toggling a class on each card
   based on its data-genre attribute, and keeps the active
   filter button and the live results count in sync.
   --------------------------------------------------------- */
function initGenreFilter() {
  const filterBar = document.querySelector('.filter-bar');
  const cards = Array.from(document.querySelectorAll('.record-card'));
  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  if (!filterBar || cards.length === 0) return;

  filterBar.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;

    filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('is-active'));
    button.classList.add('is-active');

    const genre = button.dataset.genre;
    let visibleCount = 0;

    cards.forEach((card) => {
      const matches = genre === 'all' || card.dataset.genre === genre;
      card.classList.toggle('is-hidden', !matches);
      if (matches) visibleCount++;
    });

    if (resultsCount) {
      resultsCount.textContent = `Showing ${visibleCount} of ${cards.length} records`;
    }
    if (emptyState) {
      emptyState.classList.toggle('is-visible', visibleCount === 0);
      emptyState.hidden = visibleCount !== 0;
    }
  });
}

/* ---------------------------------------------------------
   4. Wishlist heart toggle
   Purely visual + a running count in the header badge —
   demonstrates toggling state on a per-element basis and
   reflecting an aggregate count elsewhere on the page.
   --------------------------------------------------------- */
function initWishlist() {
  const grid = document.getElementById('recordGrid');
  const countBadge = document.getElementById('wishlistCount');
  if (!grid || !countBadge) return;

  let wishlistCount = 0;

  grid.addEventListener('click', (event) => {
    const heart = event.target.closest('.wishlist-heart');
    if (!heart) return;

    const isActive = heart.classList.toggle('is-active');
    heart.setAttribute('aria-pressed', String(isActive));
    wishlistCount += isActive ? 1 : -1;

    countBadge.textContent = wishlistCount;
    countBadge.classList.toggle('is-visible', wishlistCount > 0);

    const title = heart.getAttribute('aria-label').replace('Add ', '').replace(' to wishlist', '');
    showToast(isActive ? `Added "${title}" to wishlist` : `Removed "${title}" from wishlist`);
  });
}

/* ---------------------------------------------------------
   5. Cart: add / remove / change quantity / running total
   Cart state lives in a single in-memory array (a Map keyed
   by record id would also work — an array is used here so
   the render step stays simple to read). The render function
   is the single source of truth for the drawer's markup, so
   every mutation just updates the array and calls render().
   --------------------------------------------------------- */
function initCart() {
  const grid = document.getElementById('recordGrid');
  const cartBtn = document.getElementById('cartBtn');
  const cartClose = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartItemsEl = document.getElementById('cartItems');
  const cartEmptyMsg = document.getElementById('cartEmptyMsg');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartCountBadge = document.getElementById('cartCount');
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (!grid || !cartDrawer) return;

  /** @type {{id:string, title:string, artist:string, price:number, art:string, qty:number}[]} */
  let cart = [];

  function formatRupees(amount) {
    return '\u20B9' + amount.toLocaleString('en-IN');
  }

  function render() {
    // Item count across all lines (not just number of distinct records)
    const totalQty = cart.reduce((sum, line) => sum + line.qty, 0);
    cartCountBadge.textContent = totalQty;
    cartCountBadge.classList.toggle('is-visible', totalQty > 0);

    if (cart.length === 0) {
      cartItemsEl.innerHTML = '';
      cartItemsEl.appendChild(cartEmptyMsg);
      cartTotalEl.textContent = formatRupees(0);
      return;
    }

    cartItemsEl.innerHTML = cart.map((line) => `
      <div class="cart-line" data-id="${line.id}">
        <div class="cart-line-art" style="background:${line.art}">${line.title.slice(0, 3).toUpperCase()}</div>
        <div class="cart-line-info">
          <h4>${line.title}</h4>
          <p>${line.artist}</p>
          <div class="cart-line-actions">
            <div class="qty-controls">
              <button class="qty-btn" data-action="dec" aria-label="Decrease quantity">&minus;</button>
              <span class="qty-value">${line.qty}</span>
              <button class="qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
            </div>
            <button class="remove-line" data-action="remove">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    const total = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
    cartTotalEl.textContent = formatRupees(total);
  }

  function addToCart(card) {
    const id = card.dataset.id;
    const existing = cart.find((line) => line.id === id);
    if (existing) {
      existing.qty += 1;
    } else {
      // Each card sets --art-a / --art-b inline for its gradient swatch;
      // read those two custom properties back out to reuse the same
      // colors for the matching line item in the cart drawer.
      const artEl = card.querySelector('.record-art');
      const artA = artEl.style.getPropertyValue('--art-a').trim() || '#7B5CD6';
      const artB = artEl.style.getPropertyValue('--art-b').trim() || '#5B44A0';
      cart.push({
        id,
        title: card.dataset.title,
        artist: card.dataset.artist,
        price: Number(card.dataset.price),
        art: `radial-gradient(circle at 35% 30%, ${artA}, ${artB} 70%)`,
        qty: 1,
      });
    }
    render();
    openDrawer();

    // Brief visual confirmation on the button itself
    const addBtn = card.querySelector('.add-to-cart');
    if (addBtn) {
      const original = addBtn.textContent;
      addBtn.textContent = 'Added ✓';
      addBtn.classList.add('is-added');
      setTimeout(() => {
        addBtn.textContent = original;
        addBtn.classList.remove('is-added');
      }, 1200);
    }
  }

  function openDrawer() {
    cartDrawer.classList.add('is-open');
    cartOverlay.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    cartBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    cartDrawer.classList.remove('is-open');
    cartOverlay.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartBtn.setAttribute('aria-expanded', 'false');
  }

  // Add-to-cart clicks (event delegation — cards are static here,
  // but this pattern also works if the grid were re-rendered later)
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.add-to-cart');
    if (!button) return;
    addToCart(button.closest('.record-card'));
  });

  // Quantity +/- and remove, inside the drawer
  cartItemsEl.addEventListener('click', (event) => {
    const line = event.target.closest('.cart-line');
    if (!line) return;
    const id = line.dataset.id;
    const action = event.target.dataset.action;

    if (action === 'remove') {
      cart = cart.filter((item) => item.id !== id);
    } else if (action === 'inc') {
      const item = cart.find((i) => i.id === id);
      if (item) item.qty += 1;
    } else if (action === 'dec') {
      const item = cart.find((i) => i.id === id);
      if (item) {
        item.qty -= 1;
        if (item.qty <= 0) cart = cart.filter((i) => i.id !== id);
      }
    } else {
      return;
    }
    render();
  });

  cartBtn.addEventListener('click', openDrawer);
  cartClose.addEventListener('click', closeDrawer);
  cartOverlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cartDrawer.classList.contains('is-open')) closeDrawer();
  });

  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    showToast('This is a demo — checkout is not wired up to a real store yet.');
  });

  render();
}

/* ---------------------------------------------------------
   6. FAQ accordion
   Each trigger toggles its own panel via aria-expanded and a
   max-height transition; panels are independent (more than
   one can be open at once), which suits a short FAQ list.
   --------------------------------------------------------- */
function initAccordion() {
  const accordion = document.getElementById('accordion');
  if (!accordion) return;

  accordion.addEventListener('click', (event) => {
    const trigger = event.target.closest('.accordion-trigger');
    if (!trigger) return;

    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';

    trigger.setAttribute('aria-expanded', String(!isOpen));
    panel.hidden = isOpen; // toggle hidden first so max-height transition has a starting state

    if (!isOpen) {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    } else {
      panel.style.maxHeight = '0px';
    }
  });
}

/* ---------------------------------------------------------
   7. Testimonial carousel
   Slide index drives both the visible slide (via .is-active)
   and the dot indicators. Auto-advances every 6s and pauses
   on hover/focus so it doesn't fight a reader mid-quote.
   --------------------------------------------------------- */
function initCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsWrap = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('prevSlide');
  const nextBtn = document.getElementById('nextSlide');
  const carousel = document.getElementById('carousel');
  if (!track || !dotsWrap) return;

  const slides = Array.from(track.children);
  let index = 0;
  let autoplayTimer = null;

  // Build dot indicators
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to review ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function render() {
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    render();
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(next, 6000);
  }
  function stopAutoplay() {
    clearInterval(autoplayTimer);
  }

  prevBtn.addEventListener('click', () => { prev(); startAutoplay(); });
  nextBtn.addEventListener('click', () => { next(); startAutoplay(); });
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', startAutoplay);

  render();
  startAutoplay();
}

/* ---------------------------------------------------------
   8. Newsletter form validation
   Prevents the default submit, validates the email with the
   input's own built-in constraint API (no regex reinvented),
   and shows an inline success/error message without a page
   reload.
   --------------------------------------------------------- */
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  const emailInput = document.getElementById('emailInput');
  const message = document.getElementById('formMessage');
  if (!form || !emailInput || !message) return;

  emailInput.addEventListener('blur', () => {
    emailInput.dataset.touched = 'true';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    emailInput.dataset.touched = 'true';

    if (!emailInput.checkValidity()) {
      message.textContent = 'That doesn\'t look like a valid email — check the format and try again.';
      message.className = 'form-message is-error';
      emailInput.focus();
      return;
    }

    message.textContent = `You're in — confirmation on the way to ${emailInput.value}.`;
    message.className = 'form-message is-success';
    form.reset();
    emailInput.dataset.touched = 'false';
  });
}

/* ---------------------------------------------------------
   9. Back-to-top button
   Shown once the user has scrolled past one viewport height;
   uses a scroll listener throttled with requestAnimationFrame
   so it doesn't run the visibility check on every scroll event.
   --------------------------------------------------------- */
function initBackToTop() {
  const button = document.getElementById('backToTop');
  if (!button) return;

  let ticking = false;

  function updateVisibility() {
    const shouldShow = window.scrollY > window.innerHeight * 0.6;
    button.hidden = false; // keep it in the DOM/accessibility tree once scrolling starts
    button.classList.toggle('is-visible', shouldShow);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateVisibility);
      ticking = true;
    }
  });

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------------------------------------------------------
   10. Scroll-reveal animation
   Uses IntersectionObserver (rather than a scroll listener)
   to add an "in-view" class the first time each element
   enters the viewport, then stops observing it — a one-shot
   reveal rather than a repeating effect.
   --------------------------------------------------------- */
function initScrollReveal() {
  const targets = document.querySelectorAll('.section-title, .record-card, .accordion-item, .newsletter-form');
  if (targets.length === 0 || !('IntersectionObserver' in window)) return;

  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  targets.forEach((el) => observer.observe(el));
}
