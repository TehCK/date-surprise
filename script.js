const yesButton = document.getElementById("yesButton");
const noButton = document.getElementById("noButton");
const noPersuasion = document.getElementById("noPersuasion");
const buttonsContainer = document.querySelector(".buttons");
const animalHelper = document.getElementById("animalHelper");
const card = document.querySelector(".card");
const photo = document.getElementById("photo");
const headline = document.getElementById("headline");
const subtitle = document.getElementById("subtitle");
const fireworksCanvas = document.getElementById("fireworksCanvas");
const celebrationActions = document.getElementById("celebrationActions");
const continueButton = document.getElementById("continueButton");
const datePicker = document.getElementById("datePicker");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const calendarDays = document.getElementById("calendarDays");
const prevMonthButton = document.getElementById("prevMonthButton");
const nextMonthButton = document.getElementById("nextMonthButton");
const selectedDateText = document.getElementById("selectedDateText");
const confirmDateButton = document.getElementById("confirmDateButton");
const calendarActions = document.getElementById("calendarActions");
const addToCalendarButton = document.getElementById("addToCalendarButton");
const googleCalendarLink = document.getElementById("googleCalendarLink");

const NO_CLICKS_BEFORE_ANIMAL = 5;

const NO_PERSUASION_MESSAGES = [
    "确定吗？我可是准备了一个超级浪漫的约会... 🥺",
    "来吧，肯定很好玩！我保证！ 🤞",
    "我会带一些好吃的零食。🍫",
    "看，愿意的按钮就在那里... 👀❤️",
    "我的心不能承受另一个不愿意... 💔",
    "好吧，继续点击不愿意 — 但是愿意的按钮已经变得超级大了！ 😄",
];
const YES_GROWTH_PER_CLICK = 0.22;
const BASE_YES_FONT_SIZE = 16;
const BASE_YES_PADDING_Y = 12;
const BASE_YES_PADDING_X = 25;

const HAPPY_HEADLINE = "Yay!! 🎉";
const HAPPY_SUBTITLE = "我太开心了，你愿意和我一起去约会！";
const DATE_PICKER_HEADLINE = "让我们计划一下吧！";
const DATE_PICKER_SUBTITLE = "选择一个最适合我们的日期。";
const DATE_CONFIRMED_HEADLINE = "是约会！ 💖";
const DATE_CONFIRMED_SUBTITLE = "我等不及要见到你了";
const CALENDAR_EVENT_TITLE = "我们的约会 💕";
const CALENDAR_EVENT_DESCRIPTION = "我们的特别约会。等不及了！";
const CALENDAR_EVENT_START_HOUR = 19;
const CALENDAR_EVENT_END_HOUR = 21;

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const FIREWORK_COLORS = [
    "#ff6b9a",
    "#ffd166",
    "#06d6a0",
    "#118ab2",
    "#ef476f",
    "#ffc8dd",
    "#cdb4db",
];

let noClickCount = 0;
let animalIsBusy = false;
let yesAccepted = false;
let fireworksFrameId = null;
let fireworksIntervalId = null;
let calendarViewDate = new Date();
let selectedDate = null;
let confirmedDate = null;

function startOfDay(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

function isSameDay(firstDate, secondDate) {
    return (
        firstDate.getFullYear() === secondDate.getFullYear()
        && firstDate.getMonth() === secondDate.getMonth()
        && firstDate.getDate() === secondDate.getDate()
    );
}

function formatSelectedDate(date) {
    return `${WEEKDAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function padNumber(value) {
    return String(value).padStart(2, "0");
}

function escapeIcsText(text) {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
}

function formatIcsLocalDateTime(date, hour, minute = 0) {
    return (
        `${date.getFullYear()}`
        + `${padNumber(date.getMonth() + 1)}`
        + `${padNumber(date.getDate())}T`
        + `${padNumber(hour)}`
        + `${padNumber(minute)}00`
    );
}

function formatIcsUtcStamp(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcsContent(date) {
    const uid = `${date.getTime()}-date@simpleweb`;
    const dtStamp = formatIcsUtcStamp(new Date());
    const dtStart = formatIcsLocalDateTime(date, CALENDAR_EVENT_START_HOUR);
    const dtEnd = formatIcsLocalDateTime(date, CALENDAR_EVENT_END_HOUR);

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//SimpleWeb//Date Invite//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcsText(CALENDAR_EVENT_TITLE)}`,
        `DESCRIPTION:${escapeIcsText(CALENDAR_EVENT_DESCRIPTION)}`,
        "END:VEVENT",
        "END:VCALENDAR",
    ];

    return `${lines.join("\r\n")}\r\n`;
}

function createIcsFile(date) {
    return new File(
        [buildIcsContent(date)],
        "our-date.ics",
        { type: "text/calendar;charset=utf-8" }
    );
}

function downloadIcsFile(date) {
    const icsFile = createIcsFile(date);
    const url = URL.createObjectURL(icsFile);
    const link = document.createElement("a");

    link.href = url;
    link.download = "our-date.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function getGoogleCalendarUrl(date) {
    const start = formatIcsLocalDateTime(date, CALENDAR_EVENT_START_HOUR);
    const end = formatIcsLocalDateTime(date, CALENDAR_EVENT_END_HOUR);
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: CALENDAR_EVENT_TITLE,
        dates: `${start}/${end}`,
        details: CALENDAR_EVENT_DESCRIPTION,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function addToPhoneCalendar(date) {
    const icsFile = createIcsFile(date);

    if (navigator.canShare && navigator.canShare({ files: [icsFile] })) {
        try {
            await navigator.share({
                files: [icsFile],
                title: CALENDAR_EVENT_TITLE,
                text: CALENDAR_EVENT_DESCRIPTION,
            });
            return true;
        } catch (error) {
            if (error.name === "AbortError") {
                return false;
            }
        }
    }

    downloadIcsFile(date);
    return true;
}

function showCalendarActions(date) {
    if (googleCalendarLink) {
        googleCalendarLink.href = getGoogleCalendarUrl(date);
    }

    calendarActions.hidden = false;

    window.requestAnimationFrame(() => {
        calendarActions.classList.add("calendar-actions--visible");
        addToCalendarButton.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
}

function updateSelectedDateMessage() {
    if (!selectedDate) {
        selectedDateText.textContent = "Tap a day on the calendar.";
        confirmDateButton.disabled = true;
        return;
    }

    selectedDateText.textContent = `Selected: ${formatSelectedDate(selectedDate)}`;
    confirmDateButton.disabled = false;
}

function renderCalendar() {
    const today = startOfDay(new Date());
    const viewYear = calendarViewDate.getFullYear();
    const viewMonth = calendarViewDate.getMonth();
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    calendarMonthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    calendarDays.innerHTML = "";

    for (let i = 0; i < firstDayOfMonth.getDay(); i += 1) {
        const emptyCell = document.createElement("span");
        emptyCell.className = "calendar__day calendar__day--empty";
        calendarDays.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dayDate = new Date(viewYear, viewMonth, day);
        const dayButton = document.createElement("button");

        dayButton.type = "button";
        dayButton.className = "calendar__day";
        dayButton.textContent = String(day);

        const isPast = dayDate < today;
        const isToday = isSameDay(dayDate, today);
        const isSelected = selectedDate && isSameDay(dayDate, selectedDate);

        if (isPast) {
            dayButton.classList.add("calendar__day--disabled");
            dayButton.disabled = true;
        }

        if (isToday) {
            dayButton.classList.add("calendar__day--today");
        }

        if (isSelected) {
            dayButton.classList.add("calendar__day--selected");
        }

        dayButton.addEventListener("click", () => {
            selectedDate = startOfDay(dayDate);
            updateSelectedDateMessage();
            renderCalendar();
        });

        calendarDays.appendChild(dayButton);
    }

    const earliestMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonth = new Date(viewYear, viewMonth, 1);

    prevMonthButton.disabled = currentMonth <= earliestMonth;
}

function showContinueButton() {
    celebrationActions.hidden = false;

    window.requestAnimationFrame(() => {
        celebrationActions.classList.add("celebration-actions--visible");
    });
}

function showDatePicker() {
    calendarViewDate = startOfDay(new Date());
    selectedDate = null;
    updateSelectedDateMessage();
    renderCalendar();

    celebrationActions.classList.remove("celebration-actions--visible");

    window.setTimeout(() => {
        celebrationActions.hidden = true;
        datePicker.hidden = false;
        card.classList.add("card--scheduling");
        document.body.classList.add("body--scheduling");

        headline.textContent = DATE_PICKER_HEADLINE;
        subtitle.textContent = DATE_PICKER_SUBTITLE;

        window.requestAnimationFrame(() => {
            datePicker.classList.add("date-picker--visible");
        });
    }, 320);
}

function confirmSelectedDate() {
    if (!selectedDate) {
        return;
    }

    const dateToConfirm = new Date(selectedDate);
    confirmedDate = dateToConfirm;

    datePicker.classList.remove("date-picker--visible");
    card.classList.remove("card--scheduling");
    document.body.classList.remove("body--scheduling");
    document.body.classList.add("body--date-confirmed");
    card.classList.add("card--date-confirmed");

    headline.textContent = DATE_CONFIRMED_HEADLINE;
    subtitle.textContent = `${DATE_CONFIRMED_SUBTITLE} ${formatSelectedDate(dateToConfirm)}.`;

    window.setTimeout(() => {
        datePicker.hidden = true;
        showCalendarActions(dateToConfirm);

        window.setTimeout(() => {
            addToPhoneCalendar(dateToConfirm);
        }, 500);
    }, 350);
}

function showNoPersuasion() {
    const messageIndex = Math.min(noClickCount - 1, NO_PERSUASION_MESSAGES.length - 1);
    const message = NO_PERSUASION_MESSAGES[messageIndex];

    noPersuasion.hidden = false;
    noPersuasion.classList.remove("no-persuasion--visible");
    noPersuasion.textContent = message;

    window.requestAnimationFrame(() => {
        noPersuasion.classList.add("no-persuasion--visible");
    });
}

function playNoClickEffect() {
    noButton.classList.remove("no-button--nudged");
    yesButton.classList.remove("yes-button--hint");

    // Force reflow so repeated clicks retrigger the animation.
    void noButton.offsetWidth;

    noButton.classList.add("no-button--nudged");
    yesButton.classList.add("yes-button--hint");

    window.setTimeout(() => {
        noButton.classList.remove("no-button--nudged");
        yesButton.classList.remove("yes-button--hint");
    }, 450);
}

function growYesButton() {
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    const maxScale = isMobile ? 1.65 : 2.3;
    const scale = Math.min(1 + noClickCount * YES_GROWTH_PER_CLICK, maxScale);

    yesButton.style.setProperty("--yes-scale", scale);
    yesButton.style.setProperty("--yes-font-size", `${BASE_YES_FONT_SIZE * scale}px`);
    yesButton.style.setProperty(
        "--yes-padding-y",
        `${BASE_YES_PADDING_Y * scale}px`
    );
    yesButton.style.setProperty(
        "--yes-padding-x",
        `${BASE_YES_PADDING_X * scale}px`
    );

    const noScale = Math.max(0.82, 1 - noClickCount * 0.035);
    noButton.style.setProperty("--no-scale", noScale);
    noButton.style.setProperty("--no-font-size", `${16 * noScale}px`);
    noButton.style.setProperty("--no-padding-y", `${12 * noScale}px`);
    noButton.style.setProperty("--no-padding-x", `${25 * noScale}px`);

    buttonsContainer.style.minHeight = `${56 * scale}px`;
    buttonsContainer.style.gap = `${18 + noClickCount * 8}px`;

    yesButton.classList.add("yes-growing");

    window.setTimeout(() => {
        yesButton.classList.remove("yes-growing");
    }, 350);
}

function playAnimalRemoval() {
    if (animalIsBusy) {
        return;
    }

    animalIsBusy = true;
    noButton.disabled = true;
    noPersuasion.hidden = true;

    const noRect = noButton.getBoundingClientRect();
    const targetLeft = noRect.left + noRect.width / 2 - 36;

    animalHelper.style.setProperty("--cat-target-left", `${Math.max(targetLeft, 80)}px`);
    noButton.classList.add("no-button--grabbed");

    animalHelper.classList.add("animal-helper--active");
    buttonsContainer.classList.add("buttons--animal-scene");

    window.setTimeout(() => {
        noButton.classList.add("no-button--gone");
    }, 2400);

    window.setTimeout(() => {
        animalHelper.classList.remove("animal-helper--active");
        animalHelper.classList.add("animal-helper--done");
        buttonsContainer.classList.remove("buttons--animal-scene");
    }, 3200);
}

function resizeFireworksCanvas() {
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
}

function createFireworkBurst(particles, x, y) {
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const sparkCount = 36 + Math.floor(Math.random() * 18);

    for (let i = 0; i < sparkCount; i += 1) {
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.2;
        const speed = Math.random() * 4 + 2.5;

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color,
            radius: Math.random() * 2 + 2,
            decay: Math.random() * 0.012 + 0.012,
            gravity: 0.045,
        });
    }
}

function startFireworks() {
    const context = fireworksCanvas.getContext("2d");
    const particles = [];
    let burstCount = 0;
    const maxBursts = 14;

    resizeFireworksCanvas();
    fireworksCanvas.classList.add("fireworks--active");

    const launchBurst = () => {
        if (burstCount >= maxBursts) {
            return;
        }

        const x = Math.random() * fireworksCanvas.width * 0.75 + fireworksCanvas.width * 0.12;
        const y = Math.random() * fireworksCanvas.height * 0.45 + fireworksCanvas.height * 0.08;

        createFireworkBurst(particles, x, y);
        burstCount += 1;
    };

    const animate = () => {
        context.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

        for (let i = particles.length - 1; i >= 0; i -= 1) {
            const particle = particles[i];

            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += particle.gravity;
            particle.vx *= 0.985;
            particle.alpha -= particle.decay;

            if (particle.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            context.globalAlpha = particle.alpha;
            context.fillStyle = particle.color;
            context.beginPath();
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fill();
        }

        context.globalAlpha = 1;

        if (particles.length > 0 || burstCount < maxBursts) {
            fireworksFrameId = window.requestAnimationFrame(animate);
        } else {
            fireworksCanvas.classList.remove("fireworks--active");
            fireworksFrameId = null;
        }
    };

    launchBurst();
    launchBurst();
    animate();

    fireworksIntervalId = window.setInterval(() => {
        launchBurst();

        if (burstCount >= maxBursts) {
            window.clearInterval(fireworksIntervalId);
            fireworksIntervalId = null;
        }
    }, 450);

    window.setTimeout(() => {
        if (fireworksIntervalId) {
            window.clearInterval(fireworksIntervalId);
            fireworksIntervalId = null;
        }
    }, 5500);
}

function swapHappyPhoto() {
    const happySrc = photo.dataset.happySrc;

    if (!happySrc) {
        return;
    }

    const happyImage = new Image();

    happyImage.onload = () => {
        photo.classList.add("photo--swapping");

        window.setTimeout(() => {
            photo.src = happySrc;
            photo.alt = "A happy celebration photo";
            photo.classList.remove("photo--swapping");
            photo.classList.add("photo--happy");
        }, 280);
    };

    happyImage.onerror = () => {
        photo.classList.add("photo--happy");
    };

    happyImage.src = happySrc;
}

function updateCelebrationText() {
    headline.classList.add("celebration-text--changing");
    subtitle.classList.add("celebration-text--changing");

    window.setTimeout(() => {
        headline.textContent = HAPPY_HEADLINE;
        subtitle.textContent = HAPPY_SUBTITLE;
        headline.classList.remove("celebration-text--changing");
        subtitle.classList.remove("celebration-text--changing");
        headline.classList.add("celebration-text--shown");
        subtitle.classList.add("celebration-text--shown");
    }, 220);
}

function celebrateYes() {
    if (yesAccepted) {
        return;
    }

    yesAccepted = true;
    yesButton.disabled = true;
    noButton.disabled = true;
    noPersuasion.hidden = true;

    card.classList.add("card--celebrating");
    yesButton.classList.add("yes-celebrate");
    buttonsContainer.classList.add("buttons--celebrating");

    startFireworks();
    swapHappyPhoto();
    updateCelebrationText();

    window.setTimeout(() => {
        yesButton.classList.remove("yes-celebrate");
        showContinueButton();
    }, 700);
}

window.addEventListener("resize", () => {
    if (fireworksCanvas.classList.contains("fireworks--active")) {
        resizeFireworksCanvas();
    }
});

noButton.addEventListener("click", (event) => {
    event.preventDefault();

    if (yesAccepted || noButton.classList.contains("no-button--gone") || animalIsBusy) {
        return;
    }

    noClickCount += 1;
    growYesButton();
    showNoPersuasion();
    playNoClickEffect();

    if (noClickCount >= NO_CLICKS_BEFORE_ANIMAL) {
        playAnimalRemoval();
    }
});

yesButton.addEventListener("click", celebrateYes);

continueButton.addEventListener("click", showDatePicker);
prevMonthButton.addEventListener("click", () => {
    calendarViewDate = new Date(
        calendarViewDate.getFullYear(),
        calendarViewDate.getMonth() - 1,
        1
    );
    renderCalendar();
});
nextMonthButton.addEventListener("click", () => {
    calendarViewDate = new Date(
        calendarViewDate.getFullYear(),
        calendarViewDate.getMonth() + 1,
        1
    );
    renderCalendar();
});
confirmDateButton.addEventListener("click", confirmSelectedDate);
addToCalendarButton.addEventListener("click", () => {
    if (confirmedDate) {
        addToPhoneCalendar(confirmedDate);
    }
});
