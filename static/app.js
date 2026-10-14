// ==========================================================================
// Demo Data (For previewing without an OpenAI API key using ?demo=1)
// ==========================================================================
const DEMO_ITINERARY = {
    title: "3 Days in Kyoto: Temples, Bamboo & Markets",
    summary: "Immerse yourself in Japan's cultural heart with historic shrines, peaceful bamboo groves, and bustling food markets.",
    days: [
        {
            day: 1,
            theme: "Ancient Traditions & Gion Evenings",
            activities: [
                {
                    time: "Morning",
                    title: "Fushimi Inari Shrine",
                    description: "Walk through the iconic tunnel of thousands of vermilion torii gates winding up Mount Inari.",
                    est_cost: "Free"
                },
                {
                    time: "Afternoon",
                    title: "Kiyomizu-dera Temple",
                    description: "Explore the historic wooden stage offering sweeping views of cherry blossoms and the city below.",
                    est_cost: "~$3 entry"
                },
                {
                    time: "Evening",
                    title: "Gion District & Pontocho Alley",
                    description: "Stroll along lantern-lit stone alleys, spotting geiko and sampling seasonal Kyoto street food.",
                    est_cost: "~$25 dinner"
                }
            ]
        },
        {
            day: 2,
            theme: "Arashiyama Nature & Bamboo Forest",
            activities: [
                {
                    time: "Morning",
                    title: "Arashiyama Bamboo Grove",
                    description: "Experience the otherworldly beauty and tranquil sounds of the towering bamboo pathways early in the morning.",
                    est_cost: "Free"
                },
                {
                    time: "Afternoon",
                    title: "Tenryu-ji Temple & Zen Garden",
                    description: "Admire the 14th-century landscaped garden designed around the scenic Arashiyama mountains.",
                    est_cost: "~$4 entry"
                },
                {
                    time: "Evening",
                    title: "Katsura River Riverside Walk",
                    description: "Relax by the Togetsukyo Bridge and dine on traditional matcha noodles at a local riverside teahouse.",
                    est_cost: "~$18 dinner"
                }
            ]
        },
        {
            day: 3,
            theme: "Golden Pavilions & Nishiki Market",
            activities: [
                {
                    time: "Morning",
                    title: "Kinkaku-ji (The Golden Pavilion)",
                    description: "Marvel at the top two floors completely covered in brilliant gold leaf, mirrored in the surrounding pond.",
                    est_cost: "~$4 entry"
                },
                {
                    time: "Afternoon",
                    title: "Nishiki Market Food Crawl",
                    description: "Sample Kyoto delicacies like tako tamago (baby octopus with quail egg), yuba, and freshly grilled dango.",
                    est_cost: "~$15 tastings"
                },
                {
                    time: "Evening",
                    title: "Kamogawa River Sunset",
                    description: "Join locals sitting on the grassy riverbanks as the evening lanterns illuminate the skyline.",
                    est_cost: "Free"
                }
            ]
        }
    ],
    tips: [
        "Purchase an IC card (ICOCA or Suica) for tap-and-go bus and subway transit.",
        "Visit Fushimi Inari and the Bamboo Grove before 8:00 AM to avoid the largest crowds.",
        "Carry Japanese Yen in cash, as traditional stalls and temple entry booths often do not accept cards."
    ]
};


// ==========================================================================
// DOM Element References
// ==========================================================================
const tripForm = document.getElementById("trip-form");
const destinationInput = document.getElementById("destination");
const daysInput = document.getElementById("days");
const budgetSelect = document.getElementById("budget");
const paceSelect = document.getElementById("pace");
const interestsInput = document.getElementById("interests");
const submitBtn = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status-message");
const itineraryPlaceholder = document.getElementById("itinerary-placeholder");
const itineraryLoading = document.getElementById("itinerary-loading");
const itineraryResults = document.getElementById("itinerary-results");


// ==========================================================================
// UI State Management Helpers
// Exactly one results panel state is displayed at a time: "empty", "loading", or "itinerary"
// ==========================================================================

function showResultsState(state) {
    itineraryPlaceholder.hidden = (state !== "empty");
    itineraryLoading.hidden = (state !== "loading");
    itineraryResults.hidden = (state !== "itinerary");
}

function showError(message) {
    statusMessage.textContent = message;
    statusMessage.classList.add("visible");
}

function clearError() {
    statusMessage.textContent = "";
    statusMessage.classList.remove("visible");
}

function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    const btnText = submitBtn.querySelector(".btn-text");
    const label = isSubmitting ? "Planning your trip..." : "Plan my trip";
    if (btnText) {
        btnText.textContent = label;
    } else {
        submitBtn.textContent = label;
    }
}


// ==========================================================================
// Boarding Pass Itinerary Renderer (XSS-Safe DOM Construction)
// ==========================================================================

function renderItinerary(plan, isDemo = false) {
    // 1. Clear previous itinerary content safely
    while (itineraryResults.firstChild) {
        itineraryResults.removeChild(itineraryResults.firstChild);
    }

    // 2. Build Trip Header
    const tripHeader = document.createElement("div");
    tripHeader.className = "trip-header";

    // If demo data, add clear label
    if (isDemo) {
        const demoBadge = document.createElement("span");
        demoBadge.className = "demo-badge";
        demoBadge.textContent = "Demo data";
        tripHeader.appendChild(demoBadge);
    }

    const titleEl = document.createElement("h2");
    titleEl.className = "trip-title";
    titleEl.textContent = plan.title || "Your Travel Route";

    const summaryEl = document.createElement("p");
    summaryEl.className = "trip-summary";
    summaryEl.textContent = plan.summary || "";

    tripHeader.appendChild(titleEl);
    tripHeader.appendChild(summaryEl);
    itineraryResults.appendChild(tripHeader);

    // 3. Build Days Container with Route Line
    const daysContainer = document.createElement("div");
    daysContainer.className = "days-container";

    if (Array.isArray(plan.days)) {
        plan.days.forEach((dayData, index) => {
            // Day ticket card
            const dayCard = document.createElement("article");
            dayCard.className = "day-card";
            dayCard.style.setProperty("--stagger-delay", `${index * 0.08}s`);

            // Route Marker Dot
            const routeMarker = document.createElement("div");
            routeMarker.className = "day-route-marker";
            dayCard.appendChild(routeMarker);

            // Ticket Header Strip
            const cardHeader = document.createElement("div");
            cardHeader.className = "day-card-header";

            const flightNo = document.createElement("span");
            flightNo.className = "day-flight-no";
            flightNo.textContent = `Day ${dayData.day}`;

            const dayTheme = document.createElement("span");
            dayTheme.className = "day-theme";
            dayTheme.textContent = dayData.theme || `Day ${dayData.day} Exploration`;

            // Pure CSS Semicircle Notches
            const notchLeft = document.createElement("span");
            notchLeft.className = "day-notch-left";
            notchLeft.setAttribute("aria-hidden", "true");

            const notchRight = document.createElement("span");
            notchRight.className = "day-notch-right";
            notchRight.setAttribute("aria-hidden", "true");

            cardHeader.appendChild(flightNo);
            cardHeader.appendChild(dayTheme);
            cardHeader.appendChild(notchLeft);
            cardHeader.appendChild(notchRight);
            dayCard.appendChild(cardHeader);

            // Activities List (Ticket body)
            const activitiesList = document.createElement("div");
            activitiesList.className = "activities-list";

            if (Array.isArray(dayData.activities)) {
                dayData.activities.forEach((act) => {
                    const row = document.createElement("div");
                    row.className = "activity-row";

                    // Time Slot (Left)
                    const timeCol = document.createElement("div");
                    timeCol.className = "activity-time";
                    timeCol.textContent = act.time || "Activity";

                    // Details (Middle: Title & Description)
                    const detailsCol = document.createElement("div");
                    detailsCol.className = "activity-details";

                    const actTitle = document.createElement("h4");
                    actTitle.className = "activity-title";
                    actTitle.textContent = act.title || "";

                    const actDesc = document.createElement("p");
                    actDesc.className = "activity-desc";
                    actDesc.textContent = act.description || "";

                    detailsCol.appendChild(actTitle);
                    detailsCol.appendChild(actDesc);

                    // Fare / Cost (Right)
                    const costCol = document.createElement("div");
                    costCol.className = "activity-cost";
                    costCol.textContent = act.est_cost || "—";

                    row.appendChild(timeCol);
                    row.appendChild(detailsCol);
                    row.appendChild(costCol);
                    activitiesList.appendChild(row);
                });
            }

            dayCard.appendChild(activitiesList);
            daysContainer.appendChild(dayCard);
        });
    }

    itineraryResults.appendChild(daysContainer);

    // 4. Build Tips Section
    if (Array.isArray(plan.tips) && plan.tips.length > 0) {
        const tipsSection = document.createElement("div");
        tipsSection.className = "tips-section";

        const tipsTitle = document.createElement("h3");
        tipsTitle.className = "tips-title";
        tipsTitle.textContent = "Local Tips & Advice";

        const tipsList = document.createElement("ul");
        tipsList.className = "tips-list";

        plan.tips.forEach((tipText) => {
            const tipItem = document.createElement("li");
            tipItem.textContent = tipText;
            tipsList.appendChild(tipItem);
        });

        tipsSection.appendChild(tipsTitle);
        tipsSection.appendChild(tipsList);
        itineraryResults.appendChild(tipsSection);
    }

    // 5. Build Disclaimer Note
    const disclaimerNote = document.createElement("p");
    disclaimerNote.className = "disclaimer-note";
    disclaimerNote.textContent = "Costs are AI estimates, not live prices.";
    itineraryResults.appendChild(disclaimerNote);

    // 6. Transition results panel to itinerary state
    showResultsState("itinerary");
}


// ==========================================================================
// Form Submission Handler
// ==========================================================================

tripForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const destination = destinationInput.value.trim();
    const days = parseInt(daysInput.value, 10);
    const budget = budgetSelect.value;
    const style = paceSelect.value;
    const interests = interestsInput.value.trim();

    const payload = {
        destination: destination,
        days: days,
        budget: budget,
        style: style,
        interests: interests
    };

    // Hide empty state and show loading in the same spot, while keeping form usable
    setSubmitting(true);
    showResultsState("loading");

    try {
        const response = await fetch("/api/plan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            // On error: show server error message in status area and show empty state again
            const errorMessage = data.error || "An unexpected error occurred. Please try again.";
            showError(errorMessage);
            showResultsState("empty");
            return;
        }

        // On success: replace loading state with the itinerary
        renderItinerary(data, false);

        // Scroll the top of the itinerary into view (smooth, but instant if prefers-reduced-motion)
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        itineraryResults.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start"
        });

    } catch (networkError) {
        showError("Could not connect to the server. Please check your connection.");
        showResultsState("empty");
    } finally {
        // Re-enable submit button in every case
        setSubmitting(false);
    }
});


// ==========================================================================
// Page Load Check: Demo Mode Preview (?demo=1)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "1" || urlParams.get("demo") === "true") {
        renderItinerary(DEMO_ITINERARY, true);
    }
});
