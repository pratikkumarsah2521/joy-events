const modalStates = new WeakMap();
let mobileMenuState = null;

export function initNavigation() {
    initActiveNavigation();

    const menu = document.querySelector("[data-mobile-menu]");
    const openButton = document.querySelector("[data-menu-toggle]");
    const closeButton = document.querySelector("[data-menu-close]");

    if (!menu || !openButton || !closeButton) return;

    function openMenu() {
        if (!menu.hidden) return;

        const previousInertState = [...document.body.children]
            .filter((element) => element !== menu)
            .map((element) => ({ element, wasInert: element.inert }));
        mobileMenuState = {
            previousOverflow: document.body.style.overflow,
            previousInertState,
        };

        menu.hidden = false;
        openButton.setAttribute("aria-expanded", "true");
        openButton.setAttribute("aria-label", "Close menu");
        document.body.style.overflow = "hidden";
        previousInertState.forEach(({ element }) => {
            element.inert = true;
        });
        closeButton.focus();
    }

    function closeMenu({ restoreFocus = true } = {}) {
        if (menu.hidden) return;

        const state = mobileMenuState;
        menu.hidden = true;
        openButton.setAttribute("aria-expanded", "false");
        openButton.setAttribute("aria-label", "Open menu");
        document.body.style.overflow = state?.previousOverflow ?? "";
        state?.previousInertState.forEach(({ element, wasInert }) => {
            element.inert = wasInert;
        });
        mobileMenuState = null;

        if (restoreFocus) openButton.focus();
    }

    openButton.addEventListener("click", openMenu);
    closeButton.addEventListener("click", () => closeMenu());

    menu.addEventListener("click", (event) => {
        if (event.target === menu) closeMenu();
    });

    menu.querySelectorAll("[data-menu-link]").forEach((link) => {
        link.addEventListener("click", () => closeMenu({ restoreFocus: false }));
    });

    menu.addEventListener("keydown", (event) => {
        if (event.key !== "Tab") return;

        const focusable = [...menu.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )].filter((element) => element.getClientRects().length > 0);
        if (focusable.length === 0) {
            event.preventDefault();
            closeButton.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !menu.hidden) closeMenu();
    });
}

export function initCustomCursor() {
    const cursor = document.querySelector("[data-custom-cursor]");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!cursor || !finePointer.matches || navigator.maxTouchPoints > 0 || reducedMotion.matches) return;

    const page = document.documentElement;
    const interactiveSelector = "a, button, input, select, textarea, summary, [role='button']";

    function hideCursor() {
        page.classList.remove("has-custom-cursor");
        cursor.classList.remove("is-interactive");
    }

    function updateCursor(event) {
        if (event.pointerType && event.pointerType !== "mouse") return;

        cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
        const target = event.target instanceof Element ? event.target.closest(interactiveSelector) : null;
        cursor.classList.toggle("is-interactive", Boolean(target));
        page.classList.add("has-custom-cursor");
    }

    document.addEventListener("pointermove", updateCursor, { passive: true });
    document.addEventListener("pointerover", updateCursor, { passive: true });
    document.addEventListener("pointerdown", updateCursor, { passive: true });
    document.addEventListener("mousemove", updateCursor, { passive: true });
    document.addEventListener("mouseover", updateCursor, { passive: true });

    page.addEventListener("pointerleave", hideCursor);
    page.addEventListener("mouseleave", hideCursor);
    window.addEventListener("blur", hideCursor);
    finePointer.addEventListener("change", (event) => {
        if (!event.matches) hideCursor();
    });
    reducedMotion.addEventListener("change", (event) => {
        if (event.matches) hideCursor();
    });
}

function initActiveNavigation() {
    const navigation = document.querySelector(".primary-nav");
    const header = document.querySelector(".site-header");
    const navigationLinks = [...document.querySelectorAll(
        ".primary-nav .nav-link[href^='#'], [data-menu-link][href^='#']",
    )];
    if (!navigation || !header || navigationLinks.length === 0 || !("IntersectionObserver" in window)) return;

    const sectionLinks = navigationLinks.map((link) => {
        const sectionId = link.getAttribute("href")?.slice(1);
        const section = sectionId ? document.getElementById(sectionId) : null;
        return [sectionId, section];
    }).filter(([sectionId, section]) => sectionId && section);
    const sections = [...new Map(sectionLinks)].map(([id, section]) => ({ id, section }));
    if (sections.length === 0) return;

    const intersectingSections = new Set();
    let activeSectionId = null;
    let pendingTargetId = null;
    let observer = null;
    let resizeFrame = 0;

    function updateIndicator(sectionId) {
        const activeLink = navigation.querySelector(`.nav-link[href="#${sectionId}"]`);
        if (!activeLink) return;

        const navigationBounds = navigation.getBoundingClientRect();
        const linkBounds = activeLink.getBoundingClientRect();
        navigation.style.setProperty("--nav-indicator-left", `${linkBounds.left - navigationBounds.left}px`);
        navigation.style.setProperty("--nav-indicator-width", `${linkBounds.width}px`);
    }

    function setActiveSection(sectionId) {
        if (!sections.some(({ id }) => id === sectionId)) return;

        activeSectionId = sectionId;
        for (const link of navigationLinks) {
            const isActive = link.getAttribute("href") === `#${sectionId}`;
            link.classList.toggle("is-active", isActive);
            if (isActive) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        }

        navigation.classList.add("has-active-indicator");
        updateIndicator(sectionId);
    }

    function getSectionInActivationBand() {
        const headerBottom = header.getBoundingClientRect().bottom;
        const scrollPaddingTop = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
        const activationLine = Math.max(headerBottom + 12, (scrollPaddingTop || headerBottom) + 4);
        const candidates = sections
            .map((item) => {
                const bounds = item.section.getBoundingClientRect();
                const containsLine = bounds.top <= activationLine && bounds.bottom > activationLine;
                const distance = containsLine
                    ? 0
                    : Math.min(Math.abs(bounds.top - activationLine), Math.abs(bounds.bottom - activationLine));
                return { ...item, distance, isIntersecting: intersectingSections.has(item.id) };
            });

        const visibleCandidates = candidates.filter(({ isIntersecting }) => isIntersecting);
        const candidatesToConsider = visibleCandidates.length > 0 ? visibleCandidates : candidates;

        return candidatesToConsider.sort((left, right) => left.distance - right.distance)[0] || null;
    }

    function createSectionObserver() {
        observer?.disconnect();
        intersectingSections.clear();

        const headerHeight = Math.ceil(header.getBoundingClientRect().height);
        const scrollPaddingTop = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || headerHeight;
        const maxBandHeight = Math.max(1, window.innerHeight - headerHeight - 1);
        const bandHeight = Math.min(56, maxBandHeight, Math.max(1, scrollPaddingTop + 4 - headerHeight));
        const bottomInset = Math.max(0, window.innerHeight - headerHeight - bandHeight);

        observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) intersectingSections.add(entry.target.id);
                else intersectingSections.delete(entry.target.id);
            }

            if (pendingTargetId) {
                if (!intersectingSections.has(pendingTargetId)) return;
                pendingTargetId = null;
            }

            const sectionInBand = getSectionInActivationBand();
            if (sectionInBand) setActiveSection(sectionInBand.id);
        }, {
            rootMargin: `-${headerHeight}px 0px -${bottomInset}px 0px`,
            threshold: 0,
        });

        sections.forEach(({ section }) => observer.observe(section));
    }

    for (const link of navigationLinks) {
        link.addEventListener("click", () => {
            const targetId = link.getAttribute("href")?.slice(1);
            if (!targetId || !sections.some(({ id }) => id === targetId)) return;
            pendingTargetId = targetId;
            setActiveSection(targetId);
        });
    }

    const clearPendingTarget = () => {
        pendingTargetId = null;
    };
    window.addEventListener("wheel", clearPendingTarget, { passive: true });
    window.addEventListener("touchstart", clearPendingTarget, { passive: true });
    window.addEventListener("pointerdown", clearPendingTarget, { capture: true });
    document.addEventListener("keydown", (event) => {
        if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
            clearPendingTarget();
        }
    });

    window.addEventListener("hashchange", () => {
        const targetId = window.location.hash.slice(1);
        if (!sections.some(({ id }) => id === targetId)) return;
        pendingTargetId = targetId;
        setActiveSection(targetId);
    });

    window.addEventListener("resize", () => {
        if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(() => {
            resizeFrame = 0;
            createSectionObserver();
            if (activeSectionId) updateIndicator(activeSectionId);
        });
    });

    const initialTarget = sections.some(({ id }) => id === window.location.hash.slice(1))
        ? window.location.hash.slice(1)
        : "discover";
    setActiveSection(initialTarget);
    createSectionObserver();
    document.fonts?.ready.then(() => {
        if (activeSectionId) updateIndicator(activeSectionId);
    });
}

export function openModal(modal, {
    trigger = document.activeElement,
    focusTarget = null,
    onClose = null,
} = {}) {
    if (!modal || modal.classList.contains("is-open")) return;

    const previousInertState = [...document.body.children]
        .filter((element) => element !== modal)
        .map((element) => ({ element, wasInert: element.inert }));

    modalStates.set(modal, {
        trigger,
        previousOverflow: document.body.style.overflow,
        previousInertState,
        onClose,
    });

    document.body.style.overflow = "hidden";
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    const initialFocus = focusTarget
        || modal.querySelector('[role="dialog"]')
        || modal.querySelector("[data-close-modal], [data-close-event-details]");
    initialFocus?.focus({ preventScroll: true });
    previousInertState.forEach(({ element }) => {
        element.inert = true;
    });
    window.requestAnimationFrame(() => {
        if (!modal.classList.contains("is-open")) return;
        initialFocus?.focus({ preventScroll: true });
    });
}

export function closeModal(modal, { restoreFocus = true } = {}) {
    if (!modal?.classList.contains("is-open")) return;

    const state = modalStates.get(modal);
    state?.onClose?.();
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = state?.previousOverflow ?? "";
    state?.previousInertState.forEach(({ element, wasInert }) => {
        element.inert = wasInert;
    });
    modalStates.delete(modal);

    if (restoreFocus && state?.trigger?.isConnected) state.trigger.focus();
}

export function showToast(message, { duration = 4200 } = {}) {
    let container = document.querySelector("[data-toast-container]");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        container.setAttribute("data-toast-container", "");
        container.setAttribute("aria-live", "polite");
        document.body.append(container);
    }

    const toast = document.createElement("p");
    toast.className = "toast-message";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    container.append(toast);
    window.setTimeout(() => {
        toast.classList.add("is-leaving");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
        window.setTimeout(() => toast.remove(), 350);
    }, duration);
}

export function createIcon(name) {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.classList.add("icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");

    const paths = {
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
        pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
        location: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18m0-18a14 14 0 0 0 0 18"/>',
    };
    icon.innerHTML = paths[name] || "";
    return icon;
}

export function watchImageForFallback(image, fallbackClass, onFallback = null) {
    if (!image) return;

    const replaceWithFallback = () => {
        if (!image.parentNode || image.dataset.fallbackApplied === "true") return;
        image.dataset.fallbackApplied = "true";

        const fallback = document.createElement("div");
        fallback.className = fallbackClass;
        fallback.setAttribute("role", "img");
        fallback.setAttribute("aria-label", `Image unavailable: ${image.alt || "Event image"}`);

        const brand = document.createElement("strong");
        brand.textContent = "JOY EVENTS";
        const note = document.createElement("span");
        note.textContent = "Image unavailable";
        fallback.append(brand, note);
        image.replaceWith(fallback);
        onFallback?.(fallback);
    };

    image.addEventListener("error", replaceWithFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) replaceWithFallback();
}
