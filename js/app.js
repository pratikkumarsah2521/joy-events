import { initCustomCursor, initNavigation, watchImageForFallback } from "./ui.js";
import { initThemeToggle } from "./theme.js";
import { initEvents } from "./events.js";
import { initSiteSections } from "./site-sections.js";
import { initEventDetails } from "./event-details.js";
import { initTickets } from "./tickets.js";

initNavigation();
initCustomCursor();
initThemeToggle();
watchImageForFallback(document.querySelector(".hero-image"), "hero-image-fallback", () => {
    document.querySelector(".hero-image-frame")?.classList.add("hero-image-frame-fallback");
});
initEventDetails();
initTickets();
initEvents();
initSiteSections();
