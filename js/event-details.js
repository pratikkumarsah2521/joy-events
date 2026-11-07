import { eventsData } from "../data/events.js";
import { closeModal, createIcon, openModal, watchImageForFallback } from "./ui.js";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});

const countdownUnits = [
    ["days", "Days"],
    ["hours", "Hours"],
    ["minutes", "Minutes"],
    ["seconds", "Seconds"],
];

let modal;
let dialog;
let closeButton;
let modalContent;
let eventGrids = [];
let countdownInterval = null;

export function initEventDetails() {
    modal = document.querySelector("[data-event-details-modal]");
    dialog = modal?.querySelector(".event-details-dialog");
    closeButton = modal?.querySelector("[data-close-event-details]");
    modalContent = modal?.querySelector("[data-event-details-content]");
    eventGrids = [
        document.querySelector("#upcoming-spotlight"),
        document.querySelector("#featured-events-grid"),
        document.querySelector("#events-grid"),
    ].filter(Boolean);

    if (!modal || !dialog || !closeButton || !modalContent || eventGrids.length === 0) return;

    for (const grid of eventGrids) {
        grid.addEventListener("click", (event) => {
            const trigger = event.target.closest("[data-open-event-details]");
            if (!trigger || !grid.contains(trigger)) return;
            openEventDetails(trigger.dataset.openEventDetails, trigger);
        });
    }

    closeButton.addEventListener("click", closeEventDetails);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeEventDetails();
    });

    document.addEventListener("keydown", (event) => {
        if (!modal.classList.contains("is-open")) return;

        if (event.key === "Escape") {
            closeEventDetails();
            return;
        }

        if (event.key === "Tab") keepFocusInDialog(event);
    });
}

export function openEventDetails(eventId, trigger = document.activeElement) {
    const eventRecord = eventsData.find((event) => event.id === eventId);
    if (!eventRecord || !modalContent || !modal) return false;

    stopCountdown();
    renderEventDetails(eventRecord);
    openModal(modal, { trigger, focusTarget: dialog, onClose: stopCountdown });
    startCountdown(eventRecord);
    return true;
}

export function closeEventDetails() {
    closeModal(modal);
}

export function getCountdownState(eventRecord, now = Date.now()) {
    const target = Date.parse(eventRecord.startsAt || `${eventRecord.date}T00:00:00`);
    if (!Number.isFinite(target)) {
        return { status: "unavailable", days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const difference = target - now;
    if (difference <= 0) {
        return { status: "ended", days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
        status: "counting",
        days: Math.floor(difference / 86_400_000),
        hours: Math.floor((difference % 86_400_000) / 3_600_000),
        minutes: Math.floor((difference % 3_600_000) / 60_000),
        seconds: Math.floor((difference % 60_000) / 1_000),
    };
}

function renderEventDetails(eventRecord) {
    const content = document.createDocumentFragment();
    const cover = document.createElement("img");
    cover.className = "event-detail-cover";
    cover.alt = eventRecord.imageAlt || eventRecord.title;
    cover.decoding = "async";
    cover.src = eventRecord.image;

    const body = document.createElement("div");
    body.className = "event-detail-body";

    const labels = document.createElement("div");
    labels.className = "event-detail-labels";
    labels.append(
        createTextElement("span", "event-detail-category", eventRecord.category),
        createTextElement("span", "event-detail-sample-label", "Illustrative sample"),
    );

    const title = createTextElement("h2", "event-detail-title", eventRecord.title);
    title.id = "event-details-title";

    const sampleNote = createTextElement(
        "p",
        "event-detail-sample-note",
        "This listing, organizer and schedule are illustrative and not confirmed.",
    );

    const eventFacts = document.createElement("div");
    eventFacts.className = "event-detail-facts";
    eventFacts.append(
        createFact("calendar", "Date & time", `${formatDate(eventRecord.date)} · ${eventRecord.time}`),
        createFact("pin", "Venue", eventRecord.venue),
        createFact("location", "Location", `${eventRecord.city}, ${eventRecord.state}`),
    );

    const countdown = createCountdown();
    const about = createSection("About this experience", eventRecord.description);
    const organizer = createSection("Organizer", eventRecord.organizer || "Illustrative local host");
    organizer.classList.add("event-organizer-section");
    const agenda = createAgenda(eventRecord.agenda);
    const footer = createTicketFooter(eventRecord);

    body.append(labels, title, sampleNote, eventFacts, countdown, about, organizer, agenda, footer);
    content.append(cover, body);
    modalContent.replaceChildren(content);
    watchImageForFallback(cover, "event-detail-cover-fallback");
}

function createCountdown() {
    const section = document.createElement("section");
    section.className = "event-countdown";
    section.setAttribute("aria-label", "Countdown to event start");

    const heading = document.createElement("div");
    heading.className = "event-countdown-heading";
    heading.append(
        createTextElement("h3", "event-section-title", "Event countdown"),
        createTextElement("p", "event-countdown-status", "Starts in", "data-countdown-status"),
    );

    const units = document.createElement("div");
    units.className = "event-countdown-units";
    for (const [unit, label] of countdownUnits) {
        const item = document.createElement("div");
        item.className = "event-countdown-unit";
        const value = createTextElement("span", "event-countdown-value", "00", `data-countdown-${unit}`);
        const unitLabel = createTextElement("span", "event-countdown-label", label);
        item.append(value, unitLabel);
        units.append(item);
    }

    section.append(heading, units);
    return section;
}

function createSection(headingText, bodyText) {
    const section = document.createElement("section");
    section.className = "event-detail-section";
    section.append(
        createTextElement("h3", "event-section-title", headingText),
        createTextElement("p", "event-detail-copy", bodyText),
    );
    return section;
}

function createAgenda(agendaItems = []) {
    const section = document.createElement("section");
    section.className = "event-detail-section";
    section.append(createTextElement("h3", "event-section-title", "Schedule & agenda"));

    if (!agendaItems.length) {
        section.append(createTextElement("p", "event-detail-copy", "Schedule information is not available yet."));
        return section;
    }

    const list = document.createElement("ol");
    list.className = "event-agenda";
    for (const item of agendaItems) {
        const row = document.createElement("li");
        row.className = "event-agenda-item";
        row.append(
            createTextElement("strong", "event-agenda-time", item.time),
            createTextElement("span", "event-agenda-title", item.title),
        );
        list.append(row);
    }
    section.append(list);
    return section;
}

function createTicketFooter(eventRecord) {
    const footer = document.createElement("footer");
    footer.className = "event-detail-footer";

    const priceBlock = document.createElement("div");
    priceBlock.className = "event-detail-price-block";
    priceBlock.append(createTextElement("span", "event-detail-price-label", "Sample ticket price"));
    const price = eventRecord.price === 0 ? "Free" : currencyFormatter.format(eventRecord.price);
    priceBlock.append(createTextElement("strong", "event-detail-price", price));
    if (eventRecord.price > 0) {
        priceBlock.append(createTextElement("span", "event-detail-price-unit", "per person"));
    }

    const ticketsButton = document.createElement("button");
    ticketsButton.className = "button button-primary event-get-tickets";
    ticketsButton.type = "button";
    ticketsButton.dataset.getTickets = eventRecord.id;
    ticketsButton.textContent = "Get Tickets";

    footer.append(priceBlock, ticketsButton);
    return footer;
}

function createFact(iconName, label, value) {
    const fact = document.createElement("div");
    fact.className = "event-detail-fact";
    fact.append(
        createIcon(iconName),
        createTextElement("span", "event-detail-fact-label", label),
        createTextElement("strong", "event-detail-fact-value", value),
    );
    return fact;
}

function createTextElement(tagName, className, text, dataAttribute) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    if (dataAttribute) element.setAttribute(dataAttribute, "");
    return element;
}

function formatDate(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);
    return Number.isNaN(date.getTime()) ? dateValue : dateFormatter.format(date);
}

function startCountdown(eventRecord) {
    const status = modalContent.querySelector("[data-countdown-status]");
    if (!status) return;

    const update = () => {
        const state = getCountdownState(eventRecord);
        status.textContent = state.status === "counting"
            ? "Starts in"
            : state.status === "ended"
                ? "This event has already started or passed."
                : "Countdown unavailable.";

        for (const [unit] of countdownUnits) {
            const valueElement = modalContent.querySelector(`[data-countdown-${unit}]`);
            if (valueElement) valueElement.textContent = String(state[unit]).padStart(2, "0");
        }

        if (state.status !== "counting") stopCountdown();
    };

    update();
    if (getCountdownState(eventRecord).status === "counting") {
        countdownInterval = window.setInterval(update, 1000);
    }
}

function stopCountdown() {
    if (countdownInterval !== null) {
        window.clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function keepFocusInDialog(event) {
    const focusableElements = [...dialog.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )];
    if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}
