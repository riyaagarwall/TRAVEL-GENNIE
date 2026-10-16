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

const resultsEmpty = document.getElementById("results-empty");
const resultsLoading = document.getElementById("results-loading");
const resultsItinerary = document.getElementById("results-itinerary");


// ==========================================================================
// UI State Management Helpers
// Exactly one state below the form pass at a time: empty, loading, itinerary, or error
// ==========================================================================

function showResultsState(state) {
    resultsEmpty.hidden = (state !== "empty");
    resultsLoading.hidden = (state !== "loading");
    resultsItinerary.hidden = (state !== "itinerary");
    statusMessage.hidden = (state !== "error");
}

function showError(message) {
    statusMessage.textContent = message;
    showResultsState("error");
}

function clearError() {
    statusMessage.textContent = "";
    statusMessage.hidden = true;
}

function setSubmitting(isSubmitting) {
    // Disable submit button while loading, keep all form inputs interactive
    submitBtn.disabled = isSubmitting;
    const btnText = submitBtn.querySelector(".btn-text");
    const label = isSubmitting ? "Planning your trip..." : "Plan my trip";
    if (btnText) {
        btnText.textContent = label;
    } else {
        submitBtn.textContent = label;
    }
}

// Small helper to construct SVG gold airplane icon safely
function createPlaneIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "pass-plane-icon");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z");
    svg.appendChild(path);

    return svg;
}


// ==========================================================================
// Boarding Pass Itinerary Renderer (XSS-Safe DOM Construction)
// ==========================================================================

function renderItinerary(plan, isDemo = false, submittedParams = null) {
    // 1. Clear previous itinerary content safely
    while (resultsItinerary.firstChild) {
        resultsItinerary.removeChild(resultsItinerary.firstChild);
    }

    // 2. Action bar with "Print or save as PDF" button above the day passes
    const actionsBar = document.createElement("div");
    actionsBar.className = "itinerary-actions";

    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "print-btn";
    printBtn.textContent = "Print or save as PDF";
    printBtn.addEventListener("click", () => {
        window.print();
    });
    actionsBar.appendChild(printBtn);
    resultsItinerary.appendChild(actionsBar);

    const totalDays = Array.isArray(plan.days) ? plan.days.length : (submittedParams?.days || 1);

    // 3. Render Each Day as its own horizontal Boarding Pass
    if (Array.isArray(plan.days)) {
        plan.days.forEach((dayData, index) => {
            const dayPass = document.createElement("article");
            dayPass.className = "boarding-pass day-pass";
            dayPass.style.setProperty("--stagger-index", index);

            // A. Royal-blue strip across top with trip title & day theme
            const passStrip = document.createElement("div");
            passStrip.className = "pass-strip";

            const stripLeft = document.createElement("div");
            stripLeft.className = "strip-left";

            stripLeft.appendChild(createPlaneIcon());

            const titleEl = document.createElement("span");
            titleEl.className = "strip-brand";
            titleEl.textContent = plan.title || "TravelGenie";
            stripLeft.appendChild(titleEl);

            if (isDemo) {
                const demoBadge = document.createElement("span");
                demoBadge.className = "pass-sample-badge";
                demoBadge.textContent = "Sample content";
                stripLeft.appendChild(demoBadge);
            }

            const stripRight = document.createElement("div");
            stripRight.className = "strip-right";

            const themeEl = document.createElement("span");
            themeEl.className = "strip-context";
            themeEl.textContent = dayData.theme || `Day ${dayData.day}`;
            stripRight.appendChild(themeEl);

            passStrip.appendChild(stripLeft);
            passStrip.appendChild(stripRight);
            dayPass.appendChild(passStrip);

            // B. Pass Body: Main Activity Rows + Tear-Off Stub
            const passBody = document.createElement("div");
            passBody.className = "pass-body";

            // Main Activities Area
            const passMain = document.createElement("div");
            passMain.className = "pass-main";

            if (Array.isArray(dayData.activities)) {
                dayData.activities.forEach((act) => {
                    const row = document.createElement("div");
                    row.className = "activity-row";

                    // Time slot in royal blue
                    const slotEl = document.createElement("span");
                    slotEl.className = "activity-slot";
                    slotEl.textContent = act.time || "Activity";

                    // Details: title in ink, description in muted ink
                    const detailsEl = document.createElement("div");
                    detailsEl.className = "activity-details";

                    const actTitle = document.createElement("h4");
                    actTitle.className = "activity-title";
                    actTitle.textContent = act.title || "";

                    const actDesc = document.createElement("p");
                    actDesc.className = "activity-desc";
                    actDesc.textContent = act.description || "";

                    detailsEl.appendChild(actTitle);
                    detailsEl.appendChild(actDesc);

                    // Cost in --gold-text
                    const costEl = document.createElement("span");
                    costEl.className = "activity-cost";
                    costEl.textContent = act.est_cost || "—";

                    row.appendChild(slotEl);
                    row.appendChild(detailsEl);
                    row.appendChild(costEl);
                    passMain.appendChild(row);
                });
            }

            // Tear-off Stub on the right: "Day", large day numeral, "of N"
            const passStub = document.createElement("div");
            passStub.className = "pass-stub day-stub";

            const stubLabel = document.createElement("span");
            stubLabel.className = "stub-day-label";
            stubLabel.textContent = "Day";

            const stubNumeral = document.createElement("span");
            stubNumeral.className = "stub-day-numeral";
            stubNumeral.textContent = String(dayData.day);

            const stubTotal = document.createElement("span");
            stubTotal.className = "stub-day-total";
            stubTotal.textContent = `of ${totalDays}`;

            passStub.appendChild(stubLabel);
            passStub.appendChild(stubNumeral);
            passStub.appendChild(stubTotal);

            passBody.appendChild(passMain);
            passBody.appendChild(passStub);
            dayPass.appendChild(passBody);

            // Non-mask fallback notches
            const notchTop = document.createElement("span");
            notchTop.className = "pass-notch-fallback-top";
            notchTop.setAttribute("aria-hidden", "true");

            const notchBottom = document.createElement("span");
            notchBottom.className = "pass-notch-fallback-bottom";
            notchBottom.setAttribute("aria-hidden", "true");

            dayPass.appendChild(notchTop);
            dayPass.appendChild(notchBottom);

            resultsItinerary.appendChild(dayPass);
        });
    }

    // 4. Smaller Pass for Local Tips at the end
    if (Array.isArray(plan.tips) && plan.tips.length > 0) {
        const tipsPass = document.createElement("article");
        tipsPass.className = "boarding-pass tips-pass";
        tipsPass.style.setProperty("--stagger-index", (plan.days ? plan.days.length : 1));

        const passStrip = document.createElement("div");
        passStrip.className = "pass-strip";

        const stripLeft = document.createElement("div");
        stripLeft.className = "strip-left";
        stripLeft.appendChild(createPlaneIcon());

        const brand = document.createElement("span");
        brand.className = "strip-brand";
        brand.textContent = "TravelGenie";
        stripLeft.appendChild(brand);

        const stripRight = document.createElement("div");
        stripRight.className = "strip-right";
        const stripType = document.createElement("span");
        stripType.className = "strip-type";
        stripType.textContent = "Local Tips & Advice";
        stripRight.appendChild(stripType);

        passStrip.appendChild(stripLeft);
        passStrip.appendChild(stripRight);
        tipsPass.appendChild(passStrip);

        const passBody = document.createElement("div");
        passBody.className = "pass-body";

        const passMain = document.createElement("div");
        passMain.className = "pass-main";

        const tipsList = document.createElement("ul");
        tipsList.className = "tips-list";
        plan.tips.forEach((tip) => {
            const li = document.createElement("li");
            li.textContent = tip;
            tipsList.appendChild(li);
        });
        passMain.appendChild(tipsList);

        const passStub = document.createElement("div");
        passStub.className = "pass-stub tips-stub";

        const tipStubLabel = document.createElement("span");
        tipStubLabel.className = "stub-day-label";
        tipStubLabel.textContent = "INFO";

        const tipStubCode = document.createElement("span");
        tipStubCode.className = "stub-tips-code";
        tipStubCode.textContent = "ADVICE";

        passStub.appendChild(tipStubLabel);
        passStub.appendChild(tipStubCode);

        passBody.appendChild(passMain);
        passBody.appendChild(passStub);
        tipsPass.appendChild(passBody);

        resultsItinerary.appendChild(tipsPass);
    }

    // 5. Transition to itinerary state
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

    // Show loading state and disable submit button
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
            // On error: show server error message in cream strip under the form pass
            const errorMessage = data.error || "An unexpected error occurred. Please try again.";
            showError(errorMessage);
            return;
        }

        // On success: render day passes
        renderItinerary(data, false, payload);

        // Staggered appearance: scroll the first day pass into view
        const firstPass = resultsItinerary.querySelector(".day-pass");
        if (firstPass) {
            const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            firstPass.scrollIntoView({
                behavior: prefersReducedMotion ? "auto" : "smooth",
                block: "start"
            });
        }

    } catch (networkError) {
        showError("Could not connect to the server. Please check your connection.");
    } finally {
        // Button is re-enabled in every case
        setSubmitting(false);
    }
});


// ==========================================================================
// Page Load Check: Demo Mode Preview (?demo=1)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "1" || urlParams.get("demo") === "true") {
        renderItinerary(DEMO_ITINERARY, true, { days: 3, budget: "mid-range", style: "balanced" });
    }
});
