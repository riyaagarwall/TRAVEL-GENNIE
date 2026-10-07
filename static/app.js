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
const itineraryResults = document.getElementById("itinerary-results");


// ==========================================================================
// Helper Functions: UI State Management
// ==========================================================================

/**
 * Displays an error message in the polite aria-live status container.
 * Uses textContent to safely insert the server error string.
 */
function showError(message) {
    statusMessage.textContent = message;
    statusMessage.classList.add("visible");
}

/**
 * Clears any existing error alert from the UI.
 */
function clearError() {
    statusMessage.textContent = "";
    statusMessage.classList.remove("visible");
}

/**
 * Updates UI to indicate an ongoing request.
 */
function setLoading(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Planning your trip...";
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = "Plan my trip";
    }
}


// ==========================================================================
// Render Itinerary (Safe DOM Construction using createElement & textContent)
// ==========================================================================

/**
 * Builds and renders the complete itinerary DOM tree.
 * Strictly uses document.createElement and textContent to prevent XSS.
 */
function renderItinerary(plan) {
    // 1. Clear out any previous itinerary content
    while (itineraryResults.firstChild) {
        itineraryResults.removeChild(itineraryResults.firstChild);
    }

    // 2. Build the Trip Header (Title and Summary)
    const tripHeader = document.createElement("div");
    tripHeader.className = "trip-header";

    const titleEl = document.createElement("h2");
    titleEl.className = "trip-title";
    titleEl.textContent = plan.title || "Your Travel Itinerary";

    const summaryEl = document.createElement("p");
    summaryEl.className = "trip-summary";
    summaryEl.textContent = plan.summary || "";

    tripHeader.appendChild(titleEl);
    tripHeader.appendChild(summaryEl);
    itineraryResults.appendChild(tripHeader);

    // 3. Build the Day-by-Day Cards Container
    const daysContainer = document.createElement("div");
    daysContainer.className = "days-container";

    if (Array.isArray(plan.days)) {
        plan.days.forEach((dayData) => {
            // Create day card container
            const dayCard = document.createElement("article");
            dayCard.className = "day-card";

            // Card Header: Day Badge and Theme
            const cardHeader = document.createElement("div");
            cardHeader.className = "day-card-header";

            const dayBadge = document.createElement("span");
            dayBadge.className = "day-badge";
            dayBadge.textContent = `Day ${dayData.day}`;

            const dayTheme = document.createElement("h3");
            dayTheme.className = "day-theme";
            dayTheme.textContent = dayData.theme || `Day ${dayData.day} Exploration`;

            cardHeader.appendChild(dayBadge);
            cardHeader.appendChild(dayTheme);
            dayCard.appendChild(cardHeader);

            // Activities List
            const activitiesList = document.createElement("div");
            activitiesList.className = "activities-list";

            if (Array.isArray(dayData.activities)) {
                dayData.activities.forEach((act) => {
                    const activityItem = document.createElement("div");
                    activityItem.className = "activity-item";

                    // Activity Top: Time and Cost Pills
                    const activityTop = document.createElement("div");
                    activityTop.className = "activity-top";

                    const timePill = document.createElement("span");
                    timePill.className = "activity-time-pill";
                    timePill.textContent = act.time || "Activity";

                    const costPill = document.createElement("span");
                    costPill.className = "activity-cost-pill";
                    costPill.textContent = act.est_cost || "Cost varies";

                    activityTop.appendChild(timePill);
                    activityTop.appendChild(costPill);

                    // Activity Title & Description
                    const actTitle = document.createElement("h4");
                    actTitle.className = "activity-title";
                    actTitle.textContent = act.title || "";

                    const actDesc = document.createElement("p");
                    actDesc.className = "activity-desc";
                    actDesc.textContent = act.description || "";

                    activityItem.appendChild(activityTop);
                    activityItem.appendChild(actTitle);
                    activityItem.appendChild(actDesc);

                    activitiesList.appendChild(activityItem);
                });
            }

            dayCard.appendChild(activitiesList);
            daysContainer.appendChild(dayCard);
        });
    }

    itineraryResults.appendChild(daysContainer);

    // 4. Build Tips Section (if tips exist)
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

    // 6. Reveal the itinerary results and hide the initial placeholder
    itineraryPlaceholder.hidden = true;
    itineraryResults.hidden = false;
}


// ==========================================================================
// Form Submission Event Handler
// ==========================================================================

tripForm.addEventListener("submit", async (event) => {
    // Prevent the default browser page reload on form submit
    event.preventDefault();

    // Clear any previous error message
    clearError();

    // Extract values from form controls
    const destination = destinationInput.value.trim();
    const days = parseInt(daysInput.value, 10);
    const budget = budgetSelect.value;
    const style = paceSelect.value;
    const interests = interestsInput.value.trim();

    // Prepare JSON payload for /api/plan
    const payload = {
        destination: destination,
        days: days,
        budget: budget,
        style: style,
        interests: interests
    };

    // Set UI to loading state
    setLoading(true);

    try {
        // Send POST request to backend API
        const response = await fetch("/api/plan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        // Parse response JSON data
        const data = await response.json();

        // Check if server returned an error status code
        if (!response.ok) {
            const errorMessage = data.error || "An unexpected error occurred. Please try again.";
            showError(errorMessage);
            return;
        }

        // On success, render the received itinerary
        renderItinerary(data);

    } catch (networkError) {
        // Handle unexpected network/connection failures
        showError("Could not connect to the server. Please check your connection.");
    } finally {
        // Reset button state once request finishes
        setLoading(false);
    }
});
