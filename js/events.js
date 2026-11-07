import { eventsData } from "../data/events.js";
import { createIcon, watchImageForFallback } from "./ui.js";

const ALL_CATEGORIES = "all";
const ALL_LOCATIONS = "all";
const DEFAULT_SORT = "date-asc";
let applyEventCategory = null;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

const fullDateFormatter = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
});

const dateBadgeFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
});

export function initEvents() {
    const grid = document.querySelector("#events-grid");
    const featuredGrid = document.querySelector("#featured-events-grid");
    const searchInput = document.querySelector("#event-search");
    const categoryFilter = document.querySelector("#category-filter");
    const locationFilter = document.querySelector("#location-filter");
    const sortFilter = document.querySelector("#sort-filter");
    const resetButton = document.querySelector("#reset-filters");
    const resultsStatus = document.querySelector("#event-results-status");

    if (!grid || !searchInput || !categoryFilter || !locationFilter || !sortFilter || !resetButton || !resultsStatus) {
        return;
    }

    let selectedCategory = ALL_CATEGORIES;
    const availableCategories = new Set(eventsData.map((event) => event.category));

    populateCategoryFilters(categoryFilter);
    populateLocationFilter(locationFilter);
    if (featuredGrid) {
        renderEvents(featuredGrid, eventsData.filter((event) => event.featured));
    }
    renderFilteredEvents();

    searchInput.addEventListener("input", renderFilteredEvents);
    categoryFilter.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-category]");
        if (!button || !categoryFilter.contains(button)) return;

        selectedCategory = button.dataset.category;
        updateSelectedCategory(categoryFilter, selectedCategory);
        renderFilteredEvents();
    });
    locationFilter.addEventListener("change", renderFilteredEvents);
    sortFilter.addEventListener("change", renderFilteredEvents);
    resetButton.addEventListener("click", resetFilters);

    function resetFilters() {
        searchInput.value = "";
        locationFilter.value = ALL_LOCATIONS;
        sortFilter.value = DEFAULT_SORT;
        selectedCategory = ALL_CATEGORIES;
        updateSelectedCategory(categoryFilter, selectedCategory);
        renderFilteredEvents();
        searchInput.focus();
    }

    function renderFilteredEvents() {
        const filteredEvents = filterAndSortEvents(eventsData, {
            query: searchInput.value,
            category: selectedCategory,
            location: locationFilter.value,
            sort: sortFilter.value,
        });
        renderEvents(grid, filteredEvents);
        resultsStatus.textContent = `Showing ${filteredEvents.length} of ${eventsData.length} sample events`;
    }

    applyEventCategory = (category) => {
        if (!availableCategories.has(category)) return false;

        selectedCategory = category;
        updateSelectedCategory(categoryFilter, selectedCategory);
        renderFilteredEvents();
        return true;
    };
}

export function filterEventsByCategory(category) {
    return applyEventCategory?.(category) ?? false;
}

export function filterAndSortEvents(events, {
    query = "",
    category = ALL_CATEGORIES,
    location = ALL_LOCATIONS,
    sort = DEFAULT_SORT,
} = {}) {
    const normalizedQuery = normalize(query);

    return events
        .filter((event) => {
            const searchableText = normalize([
                event.title,
                event.category,
                event.description,
                event.city,
                event.state,
                event.venue,
            ].join(" "));

            return (!normalizedQuery || searchableText.includes(normalizedQuery))
                && (category === ALL_CATEGORIES || event.category === category)
                && (location === ALL_LOCATIONS || event.city === location);
        })
        .sort(getSortComparator(sort));
}

function populateCategoryFilters(container) {
    const categories = [ALL_CATEGORIES, ...new Set(eventsData.map((event) => event.category))];

    container.replaceChildren(...categories.map((category) => {
        const button = document.createElement("button");
        button.className = "category-chip";
        button.type = "button";
        button.dataset.category = category;
        button.setAttribute("aria-pressed", String(category === ALL_CATEGORIES));
        button.textContent = category === ALL_CATEGORIES ? "All events" : category;
        return button;
    }));
}

function populateLocationFilter(select) {
    const locations = [...new Set(eventsData.map((event) => event.city))]
        .sort((left, right) => left.localeCompare(right, "en-IN"));

    for (const location of locations) {
        const option = document.createElement("option");
        option.value = location;
        option.textContent = location;
        select.append(option);
    }
}

function updateSelectedCategory(container, selectedCategory) {
    container.querySelectorAll("button[data-category]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.category === selectedCategory));
    });
}

function getSortComparator(sort) {
    switch (sort) {
        case "date-desc":
            return (left, right) => right.date.localeCompare(left.date);
        case "price-asc":
            return (left, right) => left.price - right.price || left.date.localeCompare(right.date);
        case "price-desc":
            return (left, right) => right.price - left.price || left.date.localeCompare(right.date);
        case DEFAULT_SORT:
        default:
            return (left, right) => left.date.localeCompare(right.date);
    }
}

function renderEvents(grid, events) {
    if (events.length === 0) {
        grid.replaceChildren(createEmptyState());
        return;
    }

    grid.replaceChildren(...events.map(createEventCard));
}

function createEventCard(event) {
    const card = document.createElement("article");
    card.className = "event-card";

    const media = document.createElement("div");
    media.className = "event-card-media";

    const imageButton = document.createElement("button");
    imageButton.className = "event-card-image-trigger";
    imageButton.type = "button";
    imageButton.dataset.openEventDetails = event.id;
    imageButton.setAttribute("aria-label", `View details for ${event.title}`);

    const image = document.createElement("img");
    image.className = "event-card-image";
    image.alt = event.imageAlt || event.title;
    image.loading = "lazy";
    image.decoding = "async";
    image.src = event.image;
    imageButton.append(image);
    watchImageForFallback(image, "event-card-image-fallback", () => {
        media.classList.add("event-card-media-fallback");
    });

    const category = document.createElement("span");
    category.className = "event-category-badge";
    category.textContent = event.category;

    const badgeDate = new Date(`${event.date}T00:00:00`);
    const dateBadge = document.createElement("div");
    dateBadge.className = "event-card-date-badge";
    dateBadge.setAttribute("aria-hidden", "true");
    const day = document.createElement("strong");
    const badgeParts = dateBadgeFormatter.formatToParts(badgeDate);
    day.textContent = badgeParts.find((part) => part.type === "day")?.value || "";
    const month = document.createElement("span");
    month.textContent = badgeParts.find((part) => part.type === "month")?.value || "";
    dateBadge.append(day, month);

    media.append(imageButton, category, dateBadge);

    const body = document.createElement("div");
    body.className = "event-card-body";

    const title = document.createElement("h3");
    title.className = "event-card-title";
    const titleButton = document.createElement("button");
    titleButton.className = "event-card-title-button";
    titleButton.type = "button";
    titleButton.dataset.openEventDetails = event.id;
    titleButton.setAttribute("aria-label", `View details for ${event.title}`);
    titleButton.textContent = event.title;
    title.append(titleButton);

    const description = document.createElement("p");
    description.className = "event-card-description";
    description.textContent = event.description;

    const meta = document.createElement("div");
    meta.className = "event-card-meta";
    meta.append(
        createMetaLine("calendar", `${fullDateFormatter.format(badgeDate)} · ${event.time}`),
        createVenueLine(event.venue, `${event.city}, ${event.state}`),
    );

    const footer = document.createElement("div");
    footer.className = "event-card-footer";

    const price = document.createElement("div");
    price.className = "event-price";
    price.textContent = event.price === 0 ? "Free" : currencyFormatter.format(event.price);
    if (event.price > 0) {
        const perTicket = document.createElement("small");
        perTicket.textContent = "per person · sample price";
        price.append(perTicket);
    }

    const detailsButton = document.createElement("button");
    detailsButton.className = "button event-details-button";
    detailsButton.type = "button";
    detailsButton.dataset.openEventDetails = event.id;
    detailsButton.textContent = "View Details";

    footer.append(price, detailsButton);
    body.append(meta, title, description, footer);
    card.append(media, body);
    return card;
}

function createMetaLine(iconName, text) {
    const line = document.createElement("div");
    line.className = "event-meta-line";

    const icon = createIcon(iconName);
    const label = document.createElement("span");
    label.textContent = text;
    line.append(icon, label);
    return line;
}

function createVenueLine(venue, location) {
    const line = document.createElement("div");
    line.className = "event-meta-line";
    line.append(createIcon("pin"));

    const label = document.createElement("span");
    const venueName = document.createElement("strong");
    venueName.className = "event-venue-name";
    venueName.textContent = venue;
    const city = document.createElement("span");
    city.textContent = location;
    label.append(venueName, city);
    line.append(label);
    return line;
}

function createEmptyState() {
    const state = document.createElement("div");
    state.className = "event-empty-state";

    const icon = document.createElement("span");
    icon.className = "empty-state-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M9 15h6"/></svg>';

    const title = document.createElement("h3");
    title.textContent = "No matching events";
    const message = document.createElement("p");
    message.textContent = "Try another keyword or adjust the category and city filters to see more sample listings.";
    const reset = document.createElement("button");
    reset.className = "button button-primary empty-reset-button";
    reset.type = "button";
    reset.textContent = "Clear filters";
    reset.addEventListener("click", () => document.querySelector("#reset-filters")?.click());

    state.append(icon, title, message, reset);
    return state;
}

function normalize(value) {
    return value
        .toLocaleLowerCase("en-IN")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}
