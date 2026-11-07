import { eventsData } from "../data/events.js";
import { closeEventDetails } from "./event-details.js";
import { closeModal, openModal, showToast } from "./ui.js";

const STORAGE_KEY = "joy_events_tickets";
const MAX_TICKETS_PER_REGISTRATION = 5;

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

let registrationModal;
let confirmationModal;
let myTicketsModal;
let registrationForm;
let selectedEventIdInput;
let selectedEventSummary;
let selectedEventTitle;
let selectedEventMeta;
let selectedEventVenue;
let unitPrice;
let quantityInput;
let totalOutput;
let confirmationContent;
let savedTicketsList;
let lastEventCardTrigger = null;

export function initTickets() {
    registrationModal = document.querySelector("#registration-modal");
    confirmationModal = document.querySelector("#ticket-confirmation-modal");
    myTicketsModal = document.querySelector("#my-tickets-modal");
    registrationForm = document.querySelector("[data-registration-form]");
    selectedEventIdInput = document.querySelector("[data-registration-event-id]");
    selectedEventSummary = document.querySelector("[data-selected-event-summary]");
    selectedEventTitle = document.querySelector("[data-selected-event-title]");
    selectedEventMeta = document.querySelector("[data-selected-event-meta]");
    selectedEventVenue = document.querySelector("[data-selected-event-venue]");
    unitPrice = document.querySelector("[data-ticket-unit-price]");
    quantityInput = document.querySelector('[data-registration-field="quantity"]');
    totalOutput = document.querySelector("[data-ticket-total]");
    confirmationContent = document.querySelector("[data-ticket-confirmation-content]");
    savedTicketsList = document.querySelector("[data-saved-tickets-list]");

    if (
        !registrationModal
        || !confirmationModal
        || !myTicketsModal
        || !registrationForm
        || !selectedEventIdInput
        || !selectedEventSummary
        || !confirmationContent
        || !savedTicketsList
    ) return;

    document.querySelector("[data-event-details-content]")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-get-tickets]");
        if (!button) return;
        openRegistration(button.dataset.getTickets, button);
    });

    document.querySelector("#events-grid")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-open-event-details]");
        if (button) lastEventCardTrigger = button;
    });

    document.querySelectorAll("[data-open-my-tickets]").forEach((button) => {
        button.addEventListener("click", () => openMyTickets(button));
    });

    for (const modal of [registrationModal, confirmationModal, myTicketsModal]) {
        modal.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", () => closeModal(modal));
        });
        modal.addEventListener("click", (event) => {
            if (event.target === modal) closeModal(modal);
        });
    }

    registrationForm.addEventListener("submit", handleRegistrationSubmit);
    registrationForm.addEventListener("input", handleFormInput);
    registrationForm.addEventListener("change", handleFormInput);

    confirmationContent.addEventListener("click", handleTicketAction);
    savedTicketsList.addEventListener("click", handleTicketAction);

    document.addEventListener("keydown", handleModalKeydown);
    window.addEventListener("afterprint", clearPrintState);
}

function openRegistration(eventId, trigger) {
    const eventRecord = eventsData.find((event) => event.id === eventId);
    if (!eventRecord) return;

    closeEventDetails();
    registrationForm.reset();
    clearAllFieldErrors();
    selectedEventIdInput.value = eventRecord.id;
    selectedEventTitle.textContent = eventRecord.title;
    selectedEventMeta.textContent = `${formatDate(eventRecord.date)} · ${eventRecord.time}`;
    selectedEventVenue.textContent = `${eventRecord.venue} · ${eventRecord.city}, ${eventRecord.state}`;
    unitPrice.textContent = eventRecord.price === 0 ? "Free per ticket" : `${currencyFormatter.format(eventRecord.price)} per ticket`;
    quantityInput.value = "1";
    selectedEventSummary.removeAttribute("aria-invalid");
    updateTotal(eventRecord);

    const returnFocus = lastEventCardTrigger?.isConnected ? lastEventCardTrigger : trigger;
    const initialFocus = registrationForm.querySelector('[data-registration-field="fullName"]');
    openModal(registrationModal, { trigger: returnFocus, focusTarget: initialFocus });
}

function handleFormInput(event) {
    const field = event.target.closest("[data-registration-field]");
    if (field) clearFieldError(field.dataset.registrationField);

    if (field?.dataset.registrationField === "quantity") {
        const eventRecord = eventsData.find((item) => item.id === selectedEventIdInput.value);
        if (eventRecord) updateTotal(eventRecord);
    }
}

function updateTotal(eventRecord) {
    const quantity = Number(quantityInput.value);
    if (!Number.isFinite(quantity) || quantity < 1) {
        totalOutput.textContent = "—";
        return;
    }

    totalOutput.textContent = eventRecord.price === 0
        ? "Free"
        : currencyFormatter.format(eventRecord.price * quantity);
}

function handleRegistrationSubmit(event) {
    event.preventDefault();

    const formData = new FormData(registrationForm);
    const values = {
        fullName: String(formData.get("fullName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        eventId: String(formData.get("eventId") || ""),
        quantity: String(formData.get("quantity") || "").trim(),
    };
    const eventRecord = eventsData.find((item) => item.id === values.eventId);

    if (!validateRegistration(values, eventRecord)) {
        registrationForm.querySelector('[aria-invalid="true"]')?.focus();
        return;
    }

    const existingRecords = readRegistrations();
    if (!existingRecords) {
        showToast("Saved tickets could not be read. Your registration was not submitted.");
        return;
    }

    const quantity = Number(values.quantity);
    const totalAmount = eventRecord.price * quantity;
    const record = {
        bookingId: createBookingId(existingRecords),
        eventId: eventRecord.id,
        eventTitle: eventRecord.title,
        category: eventRecord.category,
        eventDate: eventRecord.date,
        eventTime: eventRecord.time,
        venue: eventRecord.venue,
        city: eventRecord.city,
        state: eventRecord.state,
        pricePerTicket: eventRecord.price,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        quantity,
        totalAmount,
        total: totalAmount === 0 ? "Free" : currencyFormatter.format(totalAmount),
        registeredAt: new Date().toISOString(),
    };

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existingRecords, record]));
    } catch {
        showToast("This browser could not save your ticket. Check LocalStorage availability and try again.");
        return;
    }

    closeModal(registrationModal, { restoreFocus: false });
    renderConfirmation(record);
    const returnFocus = lastEventCardTrigger?.isConnected
        ? lastEventCardTrigger
        : document.querySelector("[data-open-my-tickets]");
    openModal(confirmationModal, { trigger: returnFocus });
    showToast("Registration saved in this browser.");
}

function validateRegistration(values, eventRecord) {
    clearAllFieldErrors();
    let valid = true;

    if (!values.fullName) {
        setFieldError("fullName", "Enter your full name.");
        valid = false;
    }

    if (!values.email) {
        setFieldError("email", "Enter your email address.");
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        setFieldError("email", "Enter a valid email address, such as name@example.com.");
        valid = false;
    }

    const phoneDigits = values.phone.replace(/\D/g, "");
    if (!values.phone) {
        setFieldError("phone", "Enter your phone number.");
        valid = false;
    } else if (!/^\+?[\d\s().-]+$/.test(values.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        setFieldError("phone", "Enter a valid phone number with 7 to 15 digits.");
        valid = false;
    }

    if (!eventRecord) {
        setFieldError("eventId", "Select an event before registering.");
        valid = false;
    }

    const quantity = Number(values.quantity);
    if (!values.quantity || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_REGISTRATION) {
        setFieldError("quantity", `Choose a whole number from 1 to ${MAX_TICKETS_PER_REGISTRATION}.`);
        valid = false;
    }

    return valid;
}

function setFieldError(name, message) {
    const error = registrationForm.querySelector(`[data-error-for="${name}"]`);
    const field = registrationForm.querySelector(`[data-registration-field="${name}"]`);
    if (error) error.textContent = message;
    if (field) field.setAttribute("aria-invalid", "true");
    if (name === "eventId") selectedEventSummary.setAttribute("aria-invalid", "true");
}

function clearFieldError(name) {
    const error = registrationForm.querySelector(`[data-error-for="${name}"]`);
    const field = registrationForm.querySelector(`[data-registration-field="${name}"]`);
    if (error) error.textContent = "";
    field?.removeAttribute("aria-invalid");
    if (name === "eventId") selectedEventSummary.removeAttribute("aria-invalid");
}

function clearAllFieldErrors() {
    registrationForm.querySelectorAll("[data-error-for]").forEach((error) => {
        error.textContent = "";
    });
    registrationForm.querySelectorAll("[data-registration-field]").forEach((field) => {
        field.removeAttribute("aria-invalid");
    });
    selectedEventSummary.removeAttribute("aria-invalid");
}

function readRegistrations() {
    try {
        const storedValue = window.localStorage.getItem(STORAGE_KEY);
        if (!storedValue) return [];
        const records = JSON.parse(storedValue);
        return Array.isArray(records) ? records : null;
    } catch {
        return null;
    }
}

function createBookingId(existingRecords) {
    const existingIds = new Set(existingRecords.map((record) => record?.bookingId || record?.regId).filter(Boolean));
    let bookingId;

    do {
        const token = globalThis.crypto?.randomUUID
            ? globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 10)
            : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        bookingId = `JOY-${token.toUpperCase()}`;
    } while (existingIds.has(bookingId));

    return bookingId;
}

function renderConfirmation(record) {
    const header = document.createElement("header");
    header.className = "ticket-confirmation-header";
    header.append(
        createTextElement("span", "event-detail-category", "Registration saved"),
        createTextElement("h2", "event-detail-title", "You’re all set", "ticket-confirmation-title"),
        createTextElement("p", "event-detail-copy", "Your sample ticket is saved in this browser. No payment was collected."),
    );

    const actions = document.createElement("div");
    actions.className = "ticket-action-row";
    const printButton = createActionButton("button button-secondary", "Print ticket", "data-print-ticket", record.bookingId);
    const viewButton = createActionButton("button button-primary", "View My Tickets", "data-view-saved-tickets");
    const doneButton = createActionButton("button button-quiet", "Done", "data-close-modal");
    actions.append(printButton, viewButton, doneButton);

    confirmationContent.replaceChildren(header, createTicketCard(record), actions);
}

function openMyTickets(trigger) {
    renderSavedTickets();
    openModal(myTicketsModal, { trigger });
}

function renderSavedTickets() {
    const registrations = readRegistrations();
    if (!registrations) {
        savedTicketsList.replaceChildren(createEmptyState(
            "Tickets are unavailable",
            "This browser could not read the saved ticket data. Existing data was left untouched.",
        ));
        return;
    }

    const sortedRecords = registrations.filter((record) => record && typeof record === "object").reverse();
    if (sortedRecords.length === 0) {
        savedTicketsList.replaceChildren(createEmptyState(
            "No tickets saved yet",
            "When you register for a sample event, its ticket will appear here.",
        ));
        return;
    }

    const entries = sortedRecords.map((record) => {
        const entry = document.createElement("article");
        entry.className = "saved-ticket-entry";
        entry.append(createTicketCard(record));

        const actions = document.createElement("div");
        actions.className = "ticket-action-row saved-ticket-actions";
        actions.append(createActionButton("button button-secondary", "Print ticket", "data-print-ticket", record.bookingId || record.regId));
        entry.append(actions);
        return entry;
    });

    savedTicketsList.replaceChildren(...entries);
}

function createTicketCard(record) {
    const bookingId = record.bookingId || record.regId || "JOY-SAVED-PASS";
    const quantity = Number(record.quantity ?? record.tickets ?? 1);
    const event = eventsData.find((item) => item.id === record.eventId);
    const eventDate = record.eventDate || event?.date || "Date unavailable";
    const dateText = isIsoDate(eventDate) ? `${formatDate(eventDate)}${record.eventTime || event?.time ? ` · ${record.eventTime || event.time}` : ""}` : eventDate;
    const venueText = [record.venue || event?.venue, [record.city || event?.city, record.state || event?.state].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" · ") || "Venue unavailable";
    const storedAmount = typeof record.totalAmount === "number" ? record.totalAmount : null;
    const total = record.total || record.totalPrice || (storedAmount === 0 ? "Free" : storedAmount !== null ? currencyFormatter.format(storedAmount) : "—");

    const card = document.createElement("article");
    card.className = "ticket-print-card";
    card.dataset.printTicketCard = bookingId;

    const header = document.createElement("div");
    header.className = "ticket-pass-header";
    const brand = document.createElement("span");
    brand.className = "ticket-pass-brand";
    brand.textContent = "JOY EVENTS · SAMPLE PASS";
    const code = document.createElement("span");
    code.className = "ticket-pass-code";
    code.textContent = bookingId;
    header.append(brand, code);

    const title = createTextElement("h3", "ticket-pass-title", record.eventTitle || event?.title || "Saved event ticket");
    const details = document.createElement("dl");
    details.className = "ticket-pass-details";
    appendTicketFact(details, "Attendee", record.fullName || "Name unavailable");
    appendTicketFact(details, "Date & time", dateText);
    appendTicketFact(details, "Venue", venueText);
    appendTicketFact(details, "Tickets", `${Number.isFinite(quantity) && quantity > 0 ? quantity : 1}`);
    appendTicketFact(details, "Total", total);
    card.append(header, title, details);
    return card;
}

function appendTicketFact(list, label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "ticket-pass-fact";
    const term = createTextElement("dt", "ticket-pass-label", label);
    const description = createTextElement("dd", "ticket-pass-value", value);
    wrapper.append(term, description);
    list.append(wrapper);
}

function handleTicketAction(event) {
    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) {
        closeModal(confirmationModal);
        return;
    }

    const printButton = event.target.closest("[data-print-ticket]");
    if (printButton) {
        printTicket(printButton.dataset.printTicket);
        return;
    }

    const viewButton = event.target.closest("[data-view-saved-tickets]");
    if (!viewButton) return;

    closeModal(confirmationModal, { restoreFocus: false });
    renderSavedTickets();
    const returnFocus = lastEventCardTrigger?.isConnected
        ? lastEventCardTrigger
        : document.querySelector("[data-open-my-tickets]");
    openModal(myTicketsModal, { trigger: returnFocus });
}

function printTicket(bookingId) {
    const card = [...document.querySelectorAll("[data-print-ticket-card]")]
        .find((item) => item.dataset.printTicketCard === bookingId);
    const modal = card?.closest("[data-ticket-modal]");
    if (!card || !modal) {
        showToast("This saved ticket could not be prepared for printing.");
        return;
    }

    clearPrintState();
    modal.classList.add("is-printing");
    card.classList.add("is-printing");
    card.closest(".saved-ticket-entry")?.classList.add("is-printing");
    document.body.classList.add("printing-ticket");
    window.print();
}

function clearPrintState() {
    document.body.classList.remove("printing-ticket");
    document.querySelectorAll("[data-ticket-modal].is-printing, [data-print-ticket-card].is-printing, .saved-ticket-entry.is-printing").forEach((element) => {
        element.classList.remove("is-printing");
    });
}

function handleModalKeydown(event) {
    const modal = [registrationModal, confirmationModal, myTicketsModal]
        .find((item) => item?.classList.contains("is-open"));
    if (!modal) return;

    if (event.key === "Escape") {
        closeModal(modal);
        return;
    }

    if (event.key !== "Tab") return;
    const dialog = modal.querySelector('[role="dialog"]');
    const focusable = [...dialog.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => element.getClientRects().length > 0);

    if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
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
}

function createEmptyState(title, message) {
    const state = document.createElement("div");
    state.className = "ticket-empty-state";
    state.append(
        createTextElement("span", "ticket-empty-icon", "JOY"),
        createTextElement("h3", "ticket-empty-title", title),
        createTextElement("p", "ticket-empty-copy", message),
    );
    return state;
}

function createActionButton(className, label, dataAttribute, dataValue) {
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.textContent = label;
    button.setAttribute(dataAttribute, dataValue ?? "");
    return button;
}

function createTextElement(tagName, className, text, id) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    if (id) element.id = id;
    return element;
}

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function isIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
