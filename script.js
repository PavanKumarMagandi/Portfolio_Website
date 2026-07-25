// Reveal elements as they enter the viewport
document.addEventListener("DOMContentLoaded", () => {
  const revealEls = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // slight stagger for elements revealing together
          setTimeout(() => {
            entry.target.classList.add("is-visible");
          }, index * 30);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
  );

  revealEls.forEach((el) => observer.observe(el));

  // Safety net: after full load (images included), force-reveal anything
  // already sitting in the viewport that the observer missed, so nothing
  // is left half-invisible.
  window.addEventListener("load", () => {
    setTimeout(() => {
      revealEls.forEach((el) => {
        if (el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (inView) el.classList.add("is-visible");
      });
    }, 150);
  });

  // --- Scroll progress bar ---
  const scrollProgress = document.getElementById("scrollProgress");
  if (scrollProgress) {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      scrollProgress.style.width = `${pct}%`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  // --- KPI count-up animation ---
  const kpiCounts = document.querySelectorAll(".kpi-count");
  if (kpiCounts.length && "IntersectionObserver" in window) {
    const animateCount = (el) => {
      const target = parseInt(el.dataset.target, 10) || 0;
      const suffix = el.dataset.suffix || "";
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const kpiObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            kpiObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    kpiCounts.forEach((el) => kpiObserver.observe(el));
  }

  // --- Cursor-tracked spotlight glow on cards ---
  const spotlightEls = document.querySelectorAll(".project, .timeline-item");
  spotlightEls.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${mx}%`);
      el.style.setProperty("--my", `${my}%`);
    });
  });

  // --- 3D hover tilt for every box / card / image across the site ---
  const supportsHover = window.matchMedia("(hover: hover)").matches;

  if (supportsHover) {
    const TILT_SELECTOR = [
      ".tilt-3d",              // explicitly marked elements
      ".eyebrow",               // badge chips (hero + section heads + contact)
      ".hero-photo-ring",       // profile photo
      ".kpi-strip",             // KPI highlight strip
      ".quick-item",            // about "quick facts" pills
      ".capability-point",      // about capability cards
      ".capability-major",      // about summary card
      ".fact",                  // project stat facts
      ".pill",                  // every skill / meta pill chip
      ".badge-flagship",        // "FLAGSHIP PROJECT" ribbon
      ".bq-block",              // business question / insight / decision block
      // ".project" intentionally excluded — tilting the full project
      // card made the body text hard to read; inner elements
      // (images, pills, facts, badges) still tilt individually.
      ".showcase-frame",        // dashboard screenshot thumbnails (images)
      ".skill-group",           // toolkit skill cards
      ".timeline-item",         // experience / education timeline cards
      ".cert-card",             // certification cards
      ".contact-inner",         // contact card (whole box)
      ".contact-chip-ring",     // contact photo
      ".nav-mark img"           // nav logo image
    ].join(", ");

    const tiltEls = Array.from(document.querySelectorAll(TILT_SELECTOR));
    tiltEls.forEach((el) => el.classList.add("tilt-3d"));

    const BASE_TILT = 12; // degrees, for small elements
    const MIN_TILT = 3;   // degrees, for very large elements
    const REFERENCE_SIZE = 220; // px

    tiltEls.forEach((el) => {
      el.addEventListener("mouseenter", (e) => {
        e.stopPropagation();
        el.classList.add("is-tilting");
      });

      el.addEventListener("mousemove", (e) => {
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;

        // Scale tilt intensity down for larger boxes so big cards
        // don't swing wildly, while small chips/images stay lively.
        const size = Math.max(rect.width, rect.height);
        const maxTilt = Math.min(BASE_TILT, Math.max(MIN_TILT, (REFERENCE_SIZE / size) * BASE_TILT));
        const lift = 1 + Math.min(0.035, (maxTilt / BASE_TILT) * 0.035);

        const rotateY = px * maxTilt * 2;
        const rotateX = -py * maxTilt * 2;
        el.style.transform =
          `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${lift.toFixed(3)}, ${lift.toFixed(3)}, ${lift.toFixed(3)})`;
      });

      el.addEventListener("mouseleave", (e) => {
        e.stopPropagation();
        el.classList.remove("is-tilting");
        el.style.transform = "";
      });
    });
  }

  // --- Active nav link on scroll ---
  const navAnchorLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const sectionsForNav = navAnchorLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (navAnchorLinks.length && sectionsForNav.length && "IntersectionObserver" in window) {
    const setActiveLink = (id) => {
      navAnchorLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
      });
    };

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveLink(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sectionsForNav.forEach((section) => navObserver.observe(section));
  }

  // --- Mobile nav toggle ---
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("is-open");
        navToggle.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // --- Showcase collapse / expand toggles ---
  const showcaseToggles = document.querySelectorAll(".showcase-toggle");
  showcaseToggles.forEach((btn) => {
    const targetId = btn.getAttribute("aria-controls");
    const target = document.getElementById(targetId);
    const label = btn.querySelector(".showcase-toggle-label");
    if (!target || !label) return;

    btn.addEventListener("click", () => {
      const isExpanded = btn.getAttribute("aria-expanded") === "true";
      const nextExpanded = !isExpanded;
      btn.setAttribute("aria-expanded", String(nextExpanded));
      target.classList.toggle("is-collapsed", !nextExpanded);
      label.textContent = nextExpanded
        ? "Hide dashboard screenshots"
        : "Show dashboard screenshots";
    });
  });

  // --- Dashboard screenshot lightbox ---
  const galleryButtons = Array.from(document.querySelectorAll(".showcase-frame"));
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxDesc = document.getElementById("lightboxDesc");
  const closeBtn = document.getElementById("lightboxClose");
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");

  if (galleryButtons.length && lightbox) {
    let currentIndex = 0;

    const openLightbox = (index) => {
      currentIndex = index;
      const btn = galleryButtons[currentIndex];
      lightboxImg.src = btn.dataset.full;
      lightboxImg.alt = btn.querySelector("img").alt;
      lightboxCaption.textContent = btn.dataset.title || "";
      if (lightboxDesc) lightboxDesc.textContent = btn.dataset.desc || "";
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    const showNext = () => openLightbox((currentIndex + 1) % galleryButtons.length);
    const showPrev = () => openLightbox((currentIndex - 1 + galleryButtons.length) % galleryButtons.length);

    galleryButtons.forEach((btn, index) => {
      btn.addEventListener("click", () => openLightbox(index));
    });

    closeBtn.addEventListener("click", closeLightbox);
    nextBtn.addEventListener("click", showNext);
    prevBtn.addEventListener("click", showPrev);

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    });
  }
});
