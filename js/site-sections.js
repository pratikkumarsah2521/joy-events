import { categoriesData } from "../data/categories.js";
import { eventsData } from "../data/events.js";
import { filterEventsByCategory } from "./events.js";
import { showToast, watchImageForFallback } from "./ui.js";

export function initSiteSections() {
    initEventSpotlight();
    renderCategoryCards(document.querySelector("[data-category-grid]"));
    renderFooterCategories(document.querySelector("[data-footer-categories]"));
    initNewsletterForm();

    document.addEventListener("click", (event) => {
        const categoryLink = event.target.closest("[data-category-link]");
        if (categoryLink) filterEventsByCategory(categoryLink.dataset.categoryLink);

        const placeholderLink = event.target.closest("[data-placeholder-link]");
        if (!placeholderLink) return;

        event.preventDefault();
        showToast("Official social destinations are not configured in this demonstration.");
    });
}

export function selectNearestUpcomingEvent(events, now = Date.now()) {
    return events
        .map((event) => ({ event, startsAt: Date.parse(event.startsAt) }))
        .filter(({ startsAt }) => Number.isFinite(startsAt) && startsAt > now)
        .sort((left, right) => left.startsAt - right.startsAt)[0] || null;
}

function initEventSpotlight() {
    const section = document.querySelector("#upcoming-spotlight");
    const card = section?.querySelector("[data-spotlight-card]");
    const emptyState = section?.querySelector("[data-spotlight-empty]");
    const media = section?.querySelector("[data-spotlight-media]");
    const imageButton = section?.querySelector("[data-spotlight-image]");
    const titleButton = section?.querySelector("[data-spotlight-title]");
    const detailsButton = section?.querySelector("[data-spotlight-details]");
    if (!section || !card || !emptyState || !media || !imageButton || !titleButton || !detailsButton) return;

    const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
    const priceFormatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    });

    let selectedEvent = null;
    let countdownInterval = null;

    function showEvent(event) {
        selectedEvent = event;
        card.hidden = false;
        emptyState.hidden = true;

        section.querySelector("[data-spotlight-category]").textContent = event.category;
        titleButton.textContent = event.title;
        titleButton.dataset.openEventDetails = event.id;
        titleButton.setAttribute("aria-label", `View details for ${event.title}`);
        section.querySelector("[data-spotlight-description]").textContent = event.description;
        section.querySelector("[data-spotlight-datetime]").textContent = dateTimeFormatter.format(new Date(event.startsAt));
        section.querySelector("[data-spotlight-venue]").textContent = event.venue;
        section.querySelector("[data-spotlight-location]").textContent = [event.city, event.state].filter(Boolean).join(", ");
        section.querySelector("[data-spotlight-price]").textContent = event.price === 0 ? "Free" : priceFormatter.format(event.price);
        imageButton.dataset.openEventDetails = event.id;
        imageButton.setAttribute("aria-label", `View details for ${event.title}`);
        detailsButton.dataset.openEventDetails = event.id;

        const image = document.createElement("img");
        image.className = "spotlight-image";
        image.src = event.image;
        image.alt = event.imageAlt || event.title;
        image.loading = "eager";
        image.decoding = "async";
        imageButton.replaceChildren(image);
        watchImageForFallback(image, "spotlight-image-fallback");
    }

    function showEmptyState() {
        selectedEvent = null;
        card.hidden = true;
        emptyState.hidden = false;
        stopCountdown();
    }

    function updateSpotlight() {
        const next = selectNearestUpcomingEvent(eventsData);
        if (!next) {
            showEmptyState();
            return;
        }

        if (selectedEvent?.id !== next.event.id) showEvent(next.event);

        const remaining = Math.max(0, next.startsAt - Date.now());
        const units = {
            days: Math.floor(remaining / 86_400_000),
            hours: Math.floor((remaining % 86_400_000) / 3_600_000),
            minutes: Math.floor((remaining % 3_600_000) / 60_000),
            seconds: Math.floor((remaining % 60_000) / 1_000),
        };

        for (const [unit, value] of Object.entries(units)) {
            section.querySelector(`[data-spotlight-${unit}]`).textContent = String(value).padStart(2, "0");
        }

        section.querySelector("[data-spotlight-countdown-status]").textContent = remaining > 0
            ? "Starts in"
            : "Starting now";
    }

    function stopCountdown() {
        if (countdownInterval !== null) {
            window.clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    updateSpotlight();
    if (selectedEvent) countdownInterval = window.setInterval(updateSpotlight, 1000);
    window.addEventListener("pagehide", stopCountdown, { once: true });
}

function renderCategoryCards(container) {
    if (!container) return;

    container.replaceChildren(...categoriesData.map((category) => {
        const eventCount = eventsData.filter((event) => event.category === category.eventCategory).length;
        const item = document.createElement("li");
        item.className = "category-card-item";

        const link = document.createElement("a");
        link.className = "category-card";
        link.href = "#events";
        link.dataset.categoryLink = category.eventCategory;
        link.setAttribute(
            "aria-label",
            `Show ${category.title} events: ${eventCount} sample ${eventCount === 1 ? "event" : "events"}`,
        );

        const image = document.createElement("img");
        image.className = "category-card-image";
        image.src = category.image;
        image.alt = category.imageAlt;
        image.loading = "lazy";
        image.decoding = "async";

        const overlay = document.createElement("span");
        overlay.className = "category-card-overlay";

        const title = document.createElement("span");
        title.className = "category-card-title";
        title.textContent = category.title;

        const count = document.createElement("span");
        count.className = "category-card-count";
        count.textContent = `${eventCount} sample ${eventCount === 1 ? "event" : "events"}`;

        overlay.append(title, count);
        link.append(image, overlay);
        item.append(link);
        watchImageForFallback(image, "category-image-fallback");
        return item;
    }));
}

function renderFooterCategories(container) {
    if (!container) return;

    container.replaceChildren(...categoriesData.map((category) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = "#events";
        link.dataset.categoryLink = category.eventCategory;
        link.textContent = category.title;
        item.append(link);
        return item;
    }));
}

function initNewsletterForm() {
    const form = document.querySelector("[data-newsletter-form]");
    const emailInput = form?.querySelector("[name='email']");
    const feedback = document.querySelector("[data-newsletter-feedback]");
    if (!form || !emailInput || !feedback) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = emailInput.value.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailInput.setAttribute("aria-invalid", "true");
            feedback.dataset.state = "error";
            feedback.textContent = "Enter a valid email address to continue.";
            emailInput.focus();
            return;
        }

        emailInput.removeAttribute("aria-invalid");
        emailInput.value = "";
        feedback.dataset.state = "success";
        feedback.textContent = "Thanks! This demo subscription was simulated. No email was sent or stored.";
    });

    emailInput.addEventListener("input", () => {
        emailInput.removeAttribute("aria-invalid");
        if (feedback.dataset.state === "error") {
            feedback.removeAttribute("data-state");
            feedback.textContent = "";
        }
    });
}
