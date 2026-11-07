# JOY EVENTS — Version 3

JOY EVENTS is a responsive frontend demonstration for discovering illustrative events in Indian cities, viewing event details, and saving sample ticket registrations in the current browser. Listings and venues are fictional examples, and the site does not process payments.

## Features

- Responsive homepage, navigation, hero section, and light/dark theme toggle.
- Featured sample events and a searchable upcoming events list with shared detail cards.
- Image-based category cards with sample counts, connected to event filters.
- Event search by title, category, location, venue, and description keywords.
- Category and city filters, date and INR price sorting, and reset controls.
- Four feature cards, a full platform/category footer, and a newsletter subscription simulation.
- Event detail modals with schedule information and a live countdown.
- Registration form with name, email, phone, event, and ticket quantity validation.
- INR totals, including free events, and a saved-ticket confirmation with a unique booking ID.
- My Tickets view, browser LocalStorage persistence, and individual ticket print layouts.
- Empty states and image fallbacks for unavailable event photography.

## Technologies

- HTML5
- CSS3 with custom properties and responsive media queries
- Vanilla JavaScript using native ES modules
- Browser LocalStorage for theme and sample registration data

No framework, package manager, build tool, or third-party JavaScript library is required.

## Project structure

```text
joyevents003/
├── index.html
├── README.md
├── assets/
│   └── icons/
│       └── favicon.svg
├── css/
│   ├── base.css
│   ├── components.css
│   ├── events.css
│   ├── layout.css
│   ├── overlays.css
│   ├── responsive.css
│   ├── site-sections.css
│   └── tokens.css
├── data/
│   ├── categories.js
│   └── events.js
└── js/
    ├── app.js
    ├── event-details.js
    ├── events.js
    ├── site-sections.js
    ├── theme.js
    ├── tickets.js
    └── ui.js
```

The current featured events are selected sample records in `data/events.js` and reuse the same card rendering and detail modal as the upcoming event list. Event, category, and hero photos use remote Unsplash URLs; the font stylesheet loads Plus Jakarta Sans and Playfair Display from Google Fonts. The favicon is local.

## Run locally

Serve the project over HTTP so the browser can load ES modules. From the project folder, run:

```powershell
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Stop the server with `Ctrl+C`.

## LocalStorage

- `joy-events-theme` stores the selected `light` or `dark` theme.
- `joy_events_tickets` stores an array of sample registrations, including the booking ID, event snapshot, attendee details, ticket count, and calculated total.
- Newsletter submissions are validated and simulated in the page only. Email addresses are not sent or stored.

Storage is local to the browser profile and site origin. It is not synchronized to another device or sent to a server. Clearing site data removes saved sample registrations.

## Limitations

- Event records, dates, schedules, organizers, and venues are illustrative and are not confirmed real listings.
- Registration is a frontend demonstration only. There is no backend, authentication, booking confirmation from an organizer, or payment gateway.
- Ticket totals are examples; no money is collected and a saved ticket is not proof of entry to a real event.
- External images and web fonts need an internet connection. Image fallbacks are shown when event photography cannot load.

## Screenshots

Screenshots are placeholders and have not been captured yet. Add the images at these paths when available:

- Desktop homepage — `screenshots/home-desktop.png`
- Mobile event details — `screenshots/event-details-mobile.png`
- Ticket confirmation and My Tickets — `screenshots/tickets.png`
