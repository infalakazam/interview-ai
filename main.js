/*
 * PrepAI / InterviewIQ
 * The page files are intentionally small. This file loads the question bank,
 * builds the selected page, and connects its controls.
 */

const GOOGLE_USER_KEY = "prepai_google_user";
const AUTH_USER = (() => {
    try { return JSON.parse(localStorage.getItem(GOOGLE_USER_KEY) || "null"); }
    catch { return null; }
})();
const ACCOUNT_SCOPE = AUTH_USER?.sub || "guest";
const STORAGE = {
    name: `interviewiq_user_name_${ACCOUNT_SCOPE}`,
    history: `interviewiq_sessions_${ACCOUNT_SCOPE}`,
    topic: `iqTopic_${ACCOUNT_SCOPE}`,
    difficulty: `iqDifficulty_${ACCOUNT_SCOPE}`,
    count: `iqCount_${ACCOUNT_SCOPE}`,
    answers: `iqAnswers_${ACCOUNT_SCOPE}`,
    questionIds: `iqQuestionIds_${ACCOUNT_SCOPE}`,
    questionIndex: `iqQuestionIndex_${ACCOUNT_SCOPE}`,
    sessionId: `iqCurrentSessionId_${ACCOUNT_SCOPE}`,
    lastFeedback: `iqLastFeedback_${ACCOUNT_SCOPE}`
};

const API_BASE = window.PREPAI_API_BASE || (
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8000"
        : ""
);
const page = document.body.dataset.page || "dashboard";
const app = document.getElementById("app");
const questionBank = [];

const NAVIGATION = [
    ["dashboard", "⌂", "Dashboard", "index.html"],
    ["start", "▶", "Start Practice", "start-practice.html"],
    ["topics", "◉", "Practice by Topic", "practice-by-topic.html"],
    ["notes", "▤", "Short Notes", "short-notes.html"],
    ["bank", "☷", "Question Bank", "question-bank.html"],
    ["report", "▥", "Performance Report", "performance-report.html"],
    ["gaps", "◎", "Skill Gaps", "skill-gaps.html"],
    ["profile", "⚙", "Profile & Settings", "profile-settings.html"]
];

const TOPIC_INFO = {
    Python: ["🐍", "Language basics, data types, and object-oriented programming"],
    Java: ["☕", "Core Java, object-oriented programming, and language concepts"],
    "C++": ["⌘", "C and C++ fundamentals and programming concepts"],
    "Data Structures": ["▦", "Data structures, algorithms, and problem solving"],
    Algorithms: ["⌁", "Algorithm design, analysis, and complexity"],
    "Operating Systems": ["▣", "Processes, memory, scheduling, and operating systems"],
    "Database Management": ["▤", "Databases, SQL, and transaction concepts"],
    "Computer Networks": ["♧", "Networking concepts, protocols, and communication"],
    OOP: ["◇", "Object-oriented programming concepts"],
    SQL: ["▤", "Queries, joins, and relational databases"],
    "Software Engineering": ["⚙", "Software design and development practices"]
};

const NOTES = [
    ["Python", "Data types", "Common built-in types include int, float, str, bool, list, tuple, set, and dict."],
    ["Python", "Control flow", "Use if/elif/else for branching and for/while loops for iteration."],
    ["Java", "JVM, JRE, and JDK", "The JVM runs bytecode. The JRE includes the JVM and runtime libraries. The JDK adds development tools such as the compiler."],
    ["Data Structures", "Arrays", "Arrays store elements in indexed positions. Access is usually O(1); inserting into the middle is typically O(n)."],
    ["Algorithms", "Binary search", "Binary search repeatedly halves the search interval and requires sorted input. Its time complexity is O(log n)."],
    ["Operating Systems", "Process and thread", "Processes have separate address spaces. Threads in one process share memory and resources."],
    ["Database Management", "ACID", "Atomicity, Consistency, Isolation, and Durability describe properties that support reliable transactions."],
    ["Computer Networks", "TCP and UDP", "TCP provides ordered, reliable delivery. UDP has less overhead but does not guarantee delivery or ordering."],
    ["SQL", "JOIN", "A JOIN combines rows from tables using a related column. INNER JOIN returns matching rows; LEFT JOIN keeps every row from the left table."],
    ["OOP", "Encapsulation", "Encapsulation groups data with the operations that use it and controls how that data is accessed."],
    ["Software Engineering", "Version control", "Version control records changes over time and helps people collaborate, review, and restore earlier versions."]
];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
}

function readJSON(storage, key, fallback) {
    try {
        const value = JSON.parse(storage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function getHistory() {
    const saved = readJSON(localStorage, STORAGE.history, []);
    return Array.isArray(saved)
        ? saved
            .filter(item => item && Array.isArray(item.answers))
            .map(item => ({
                ...item,
                answers: item.answers.filter(answer => answer && typeof answer === "object")
            }))
        : [];
}

function getSessionAnswers() {
    const saved = readJSON(sessionStorage, STORAGE.answers, []);
    return Array.isArray(saved) ? saved : [];
}

function getTopics() {
    const counts = new Map();
    questionBank.forEach(question => counts.set(question.topic, (counts.get(question.topic) || 0) + 1));
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({
        name,
        count,
        icon: TOPIC_INFO[name]?.[0] || "▤",
        description: TOPIC_INFO[name]?.[1] || "Interview questions and concepts"
    }));
}

function getDifficulties(topic) {
    const labels = { Easy: "Beginner", Medium: "Intermediate", Hard: "Advanced" };
    const order = ["Easy", "Medium", "Hard"];
    return [...new Set(questionBank
        .filter(question => question.topic === topic)
        .map(question => question.difficulty)
        .filter(level => labels[level]))]
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map(level => ({ value: labels[level], dataValue: level }));
}

function difficultyValue(label) {
    return ({ Beginner: "Easy", Intermediate: "Medium", Advanced: "Hard" })[label] || label;
}

function getUserName() {
    return localStorage.getItem(STORAGE.name) || AUTH_USER?.name || AUTH_USER?.email?.split("@")[0] || "";
}

function getStats() {
    const answers = getHistory().flatMap(session => session.answers)
        .filter(answer => Number.isFinite(Number(answer.score)) && answer.score !== null);
    const totalScore = answers.reduce((sum, answer) => sum + Number(answer.score), 0);
    return {
        sessions: getHistory().length,
        questions: answers.length,
        average: answers.length ? Math.round(totalScore / answers.length) : 0,
        strong: answers.filter(answer => Number(answer.score) >= 60).length
    };
}

function renderNavigation() {
    return NAVIGATION.map(([key, icon, label, href]) => `
        <a class="nav-link ${page === key ? "active" : ""}" href="${href}" aria-label="${label}" ${page === key ? 'aria-current="page"' : ""}>
            <span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>
        </a>
    `).join("");
}

function renderShell(content) {
    const name = getUserName().trim();
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    app.innerHTML = `
        <a class="skip-link" href="#main-content">Skip to content</a>
        <div class="app-shell">
            <aside class="sidebar" aria-label="Main navigation">
                <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">✦</span><span>PrepAI</span></a>
                <p class="nav-label">YOUR WORKSPACE</p>
                <nav class="nav">${renderNavigation()}</nav>
                <div class="sidebar-note"><strong>Small steps add up.</strong><span>Practice regularly and use feedback to guide your next session.</span></div>
            </aside>
            <main class="main" id="main-content">
                <header class="topbar">
                    <form class="global-search" id="global-search-form" role="search">
                        <label class="sr-only" for="global-search">Search the question bank</label>
                        <span aria-hidden="true">⌕</span><input id="global-search" placeholder="Search questions..." />
                    </form>
                    <a class="profile-link" href="profile-settings.html" aria-label="Profile settings${name ? ` for ${escapeHTML(name)}` : ""}">
                        <span class="avatar">${escapeHTML(initial)}</span><span class="profile-name">${escapeHTML(name || "Your profile")}</span>
                    </a>
                    <button class="sign-out-button" id="sign-out" type="button">Sign out</button>
                </header>
                ${content}
                <footer class="footer-note">PrepAI · Interview preparation, practice, and reflection</footer>
            </main>
        </div>
    `;
    document.getElementById("global-search-form").addEventListener("submit", event => {
        event.preventDefault();
        const search = document.getElementById("global-search").value.trim();
        location.href = `question-bank.html${search ? `?search=${encodeURIComponent(search)}` : ""}`;
    });
    document.getElementById("sign-out").addEventListener("click", () => {
        localStorage.removeItem(GOOGLE_USER_KEY);
        location.replace("login.html");
    });
}

function renderHeader(eyebrow, title, description, action = "") {
    return `<section class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="page-description">${description}</p></div>${action}</section>`;
}

function renderStat(icon, label, value, caption, color = "purple") {
    return `<article class="card stat-card"><span class="stat-icon ${color}" aria-hidden="true">${icon}</span><div><p class="stat-label">${label}</p><p class="stat-value">${value}</p><p class="stat-caption">${caption}</p></div></article>`;
}

function renderEmpty(message, link = "start-practice.html", label = "Start practicing") {
    return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">✦</span><p>${message}</p><a class="button" href="${link}">${label}</a></div>`;
}

function renderTopicCards(list = getTopics()) {
    if (!list.length) return renderEmpty("There are no topics in the question bank yet.", "question-bank.html", "Browse question bank");
    return `<div class="topic-grid">${list.map(topic => `
        <a class="topic-card" href="start-practice.html?topic=${encodeURIComponent(topic.name)}">
            <div class="topic-icon" aria-hidden="true">${topic.icon}</div><div class="topic-card-copy"><h3>${escapeHTML(topic.name)}</h3><p>${escapeHTML(topic.description)}</p></div>
            <div class="topic-card-footer"><span>${topic.count} questions</span><span>Practice →</span></div>
        </a>`).join("")}</div>`;
}

function renderSessionList(sessions = getHistory().slice(0, 6)) {
    if (!sessions.length) return renderEmpty("Your completed sessions will appear here after your first practice.");
    return `<div class="session-list">${sessions.map(session => {
        const answers = session.answers.filter(answer => Number.isFinite(Number(answer.score)));
        const average = answers.length ? Math.round(answers.reduce((sum, answer) => sum + Number(answer.score), 0) / answers.length) : 0;
        const date = session.date && Number.isFinite(Date.parse(session.date)) ? new Date(session.date).toLocaleDateString() : "Saved session";
        return `<article class="session-row"><span class="session-icon" aria-hidden="true">▤</span><div class="session-copy"><strong>${escapeHTML(session.topic || "Practice")} · ${escapeHTML(session.difficulty || "")}</strong><span>${answers.length} answered · ${average}% average estimate</span></div><time>${escapeHTML(date)}</time></article>`;
    }).join("")}</div>`;
}

function getTopicPerformance() {
    const topics = new Map();
    getHistory().flatMap(session => session.answers).forEach(answer => {
        if (!Number.isFinite(Number(answer.score))) return;
        const name = answer.topic || "Other";
        const current = topics.get(name) || { total: 0, count: 0 };
        current.total += Number(answer.score);
        current.count += 1;
        topics.set(name, current);
    });
    return [...topics.entries()].map(([name, data]) => ({
        name, count: data.count, score: Math.round(data.total / data.count)
    })).sort((a, b) => a.score - b.score);
}

function renderProgressBars(items, includeCount = false) {
    if (!items.length) return `<p class="muted">Complete a practice session to see topic results.</p>`;
    return items.map(item => `<div class="progress-row"><div class="progress-label"><span>${escapeHTML(item.name)}</span><strong>${item.score}%${includeCount ? ` · ${item.count} answers` : ""}</strong></div><div class="progress-track" role="img" aria-label="${escapeHTML(item.name)}: ${item.score}%"><span style="width:${Math.max(0, Math.min(100, item.score))}%"></span></div></div>`).join("");
}

function getRevisionItems() {
    const attempts = new Map();
    getHistory().forEach(session => session.answers.forEach(answer => {
        if (answer.skipped || !answer.question) return;
        const key = String(answer.questionId ?? answer.question);
        const list = attempts.get(key) || [];
        list.push({ ...answer, date: session.date });
        attempts.set(key, list);
    }));
    return [...attempts.values()].map(list => {
        const latest = list.sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0))[0];
        return { ...latest, attempts: list.length };
    }).filter(answer => Number.isFinite(Number(answer.score)))
        .sort((a, b) => Number(a.score) - Number(b.score) || Date.parse(b.date || 0) - Date.parse(a.date || 0))
        .slice(0, 5);
}

function renderRevisionPlan() {
    const items = getRevisionItems();
    if (!items.length) return `<p class="body-copy">Finish a practice session and your lowest scoring answers will appear here as a focused review plan.</p>`;
    return `<p class="body-copy">Start with your lowest recent estimates. Revisit the reference answer, then try the topic again.</p><div class="revision-list">${items.map(item => `<article class="revision-item"><div><span class="badge">${escapeHTML(item.topic || "General")}</span> <span class="badge badge-soft">${Number(item.score)}% latest · ${item.attempts} attempt${item.attempts === 1 ? "" : "s"}</span><h3>${escapeHTML(item.question)}</h3><p class="muted small-note">${item.matchedConcepts?.length ? `Covered: ${item.matchedConcepts.map(escapeHTML).join(", ")}.` : "Review the reference answer and key concepts."}</p><details><summary>Review reference answer</summary><p class="body-copy">${escapeHTML(item.referenceAnswer || "No reference answer is available.")}</p></details></div><a class="button button-secondary" href="start-practice.html?topic=${encodeURIComponent(item.topic || "")}">Practice topic</a></article>`).join("")}</div>`;
}

function renderAnswerHistory() {
    const attempts = getHistory().flatMap(session => session.answers.map(answer => ({ ...answer, date: session.date })))
        .filter(answer => !answer.skipped && answer.question)
        .sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0));
    if (!attempts.length) return `<p class="body-copy">Your saved answers will appear here after you complete a session.</p>`;
    return `<div class="feedback-list">${attempts.slice(0, 30).map((answer, index) => `<details class="answer-history-item"><summary><span>${escapeHTML(answer.question)}</span><span class="badge">${Number(answer.score) || 0}%</span></summary><p class="muted small-note">${escapeHTML(answer.topic || "General")} · ${answer.date && Number.isFinite(Date.parse(answer.date)) ? new Date(answer.date).toLocaleString() : "Saved attempt"} · ${answer.method === "ml_model" ? "ML model estimate" : "keyword estimate"}</p><p><strong>Your answer</strong><br>${escapeHTML(answer.answer || "No answer text saved.")}</p><p><strong>Reference answer</strong><br>${escapeHTML(answer.referenceAnswer || "No reference answer is available.")}</p>${answer.concepts?.length ? `<p><strong>Key concepts</strong><br>${answer.concepts.map(concept => `<span class="concept-chip ${answer.matchedConcepts?.includes(concept) ? "matched" : "missing"}">${escapeHTML(concept)}</span>`).join(" ")}</p>` : ""}</details>`).join("")}</div>`;
}

function renderDashboard() {
    const stats = getStats();
    const history = getHistory();
    const name = getUserName().trim();
    return `${renderHeader("YOUR PREPARATION", `Welcome${name ? `, ${escapeHTML(name)}` : " back"}!`, "Build confidence one interview question at a time.", '<a class="button" href="start-practice.html">＋ Start a session</a>')}
        <section class="stats-grid" aria-label="Practice summary">
            ${renderStat("▤", "Saved sessions", stats.sessions, "Sessions kept in this browser", "blue")}
            ${renderStat("✎", "Questions answered", stats.questions, "From completed sessions", "purple")}
            ${renderStat("✓", "Strong answers", stats.strong, "Estimate of 60% or more", "green")}
            ${renderStat("◉", "Average estimate", `${stats.average}%`, "Keyword coverage estimate", "amber")}
        </section>
        <section class="dashboard-grid">
            <div class="stack">
                <article class="card"><div class="section-heading"><div><p class="eyebrow">GET STARTED</p><h2>Choose your next step</h2></div></div><div class="action-grid">
                    <a class="action-card" href="start-practice.html"><span>▶</span><div><strong>Start practice</strong><p>Set a topic and difficulty for a focused session.</p></div></a>
                    <a class="action-card" href="practice-by-topic.html"><span>◎</span><div><strong>Explore topics</strong><p>See what is available in your question bank.</p></div></a>
                    <a class="action-card" href="question-bank.html"><span>☷</span><div><strong>Browse questions</strong><p>Search questions and reference answers.</p></div></a>
                </div></article>
                <article class="card"><div class="section-heading"><div><p class="eyebrow">BY TOPIC</p><h2>Practice performance</h2></div><a class="text-link" href="performance-report.html">Full report →</a></div>${history.length ? renderProgressBars(getTopicPerformance().slice(0, 6)) : renderEmpty("Topic results will appear after you finish a practice session.")}</article>
            </div>
            <div class="stack">
                <article class="card progress-summary"><p class="eyebrow">YOUR PROGRESS</p><div class="score-ring">${stats.average}%</div><h2>${stats.questions ? "Keep your momentum going" : "Your first session starts here"}</h2><p>${stats.questions ? `${stats.questions} questions answered across ${stats.sessions} saved session(s).` : "Your progress will be based on sessions you complete."}</p><a class="button button-secondary" href="skill-gaps.html">Review topic trends</a></article>
                <article class="card"><div class="section-heading"><div><p class="eyebrow">RECENT</p><h2>Practice sessions</h2></div><a class="text-link" href="performance-report.html">View report →</a></div>${renderSessionList(history.slice(0, 4))}</article>
            </div>
        </section>`;
}

function renderStart() {
    const topics = getTopics();
    const requested = new URLSearchParams(location.search).get("topic");
    const firstTopic = topics.some(topic => topic.name === requested) ? requested : topics[0]?.name || "";
    const difficulties = getDifficulties(firstTopic);
    const defaultDifficulty = difficulties.some(level => level.value === "Intermediate") ? "Intermediate" : difficulties[0]?.value || "";
    return `${renderHeader("PRACTICE SETUP", "Plan a practice session", "Choose from the topics and difficulty levels available in the question bank.")}
        <section class="setup-grid"><article class="card"><form id="start-form" class="form-stack">
            <div class="field"><label for="topic-select">Topic</label><select id="topic-select" required>${topics.map(topic => `<option value="${escapeHTML(topic.name)}" ${topic.name === firstTopic ? "selected" : ""}>${escapeHTML(topic.name)} · ${topic.count} questions</option>`).join("")}</select></div>
            <div class="field"><label for="difficulty-select">Difficulty</label><select id="difficulty-select" required>${difficulties.map(level => `<option value="${level.value}" ${level.value === defaultDifficulty ? "selected" : ""}>${level.value}</option>`).join("")}</select><small>Difficulty names map to the dataset’s Easy, Medium, and Hard labels.</small></div>
            <div class="field"><label for="count-select">Questions in this session</label><select id="count-select"><option value="5">5 questions</option><option value="10">10 questions</option><option value="20">20 questions</option></select></div>
            <div id="available-count" class="notice" aria-live="polite"></div>
            <button class="button" type="submit">Start practice →</button>
        </form></article>
        <aside class="card setup-aside"><span class="setup-illustration" aria-hidden="true">✦</span><p class="eyebrow">A FOCUSED SESSION</p><h2>Practice, reflect, improve.</h2><p>Answer in your own words. You can move between questions, and your work is kept while this browser tab is open.</p><a class="text-link" href="question-bank.html">Explore the question bank →</a></aside></section>`;
}

function renderTopics() {
    return `${renderHeader("QUESTION BANK", "Practice by topic", "Every count below comes from the question bank included with this project.")}
        <div class="filter-pills" id="topic-filters"><button class="filter-pill active" data-topic-filter="all">All topics</button><button class="filter-pill" data-topic-filter="programming">Programming</button><button class="filter-pill" data-topic-filter="systems">Systems</button><button class="filter-pill" data-topic-filter="data">Data and algorithms</button></div>
        <div id="topic-results">${renderTopicCards()}</div>`;
}

function renderNotes() {
    const topics = ["All Topics", ...new Set(NOTES.map(note => note[0]))];
    return `${renderHeader("QUICK REFERENCE", "Short notes", "A small set of revision notes organized around topics in the question bank.", '<button class="button button-secondary" id="download-notes" type="button">↓ Download notes</button>')}
        <section class="notes-layout"><aside class="card notes-topics"><h2>Topics</h2><div class="note-topic-list">${topics.map((topic, index) => `<button class="note-topic ${index === 0 ? "active" : ""}" data-note-filter="${escapeHTML(topic)}">${escapeHTML(topic)}</button>`).join("")}</div></aside>
        <article class="card"><div class="section-heading"><div><p class="eyebrow">REVISION</p><h2 id="notes-title">All notes</h2></div><label class="sr-only" for="notes-search">Search notes</label><input class="compact-input" id="notes-search" placeholder="Search notes..." /></div><div id="notes-list">${renderNoteItems(NOTES)}</div></article></section>`;
}

function renderNoteItems(notes) {
    if (!notes.length) return `<p class="empty-inline">No notes match this topic and search.</p>`;
    return notes.map(note => `<details class="note-item" data-note-topic="${escapeHTML(note[0])}"><summary>${escapeHTML(note[1])}<span>${escapeHTML(note[0])}</span></summary><p>${escapeHTML(note[2])}</p></details>`).join("");
}

function renderBank() {
    const topics = getTopics();
    const search = new URLSearchParams(location.search).get("search") || "";
    return `${renderHeader("QUESTION LIBRARY", "Question bank", "Search and filter questions from the project dataset.")}
        <article class="card"><div class="filters bank-filters"><div class="field"><label for="bank-topic">Topic</label><select id="bank-topic"><option value="all">All topics</option>${topics.map(topic => `<option value="${escapeHTML(topic.name)}">${escapeHTML(topic.name)}</option>`).join("")}</select></div><div class="field"><label for="bank-difficulty">Difficulty</label><select id="bank-difficulty"><option value="all">All levels</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div><div class="field"><label for="bank-search">Search question text</label><input id="bank-search" value="${escapeHTML(search)}" placeholder="Try a keyword..." /></div></div><p class="result-count" id="bank-count" aria-live="polite"></p><div class="question-list" id="bank-results"></div></article>`;
}

function renderReport() {
    const stats = getStats();
    const performance = getTopicPerformance();
    return `${renderHeader("YOUR HISTORY", "Performance report", "Review results saved in this browser.", '<button class="button button-secondary" id="export-report" type="button">↓ Export report</button>')}
        <section class="stats-grid">${renderStat("▤", "Saved sessions", stats.sessions, "Latest 100 sessions are retained", "blue")}${renderStat("✎", "Questions answered", stats.questions, "From saved sessions", "purple")}${renderStat("✓", "Strong answers", stats.strong, "Estimate of 60% or more", "green")}${renderStat("◉", "Average estimate", `${stats.average}%`, "Keyword coverage estimate", "amber")}</section>
        <section class="report-grid"><article class="card"><div class="section-heading"><div><p class="eyebrow">TOPIC BREAKDOWN</p><h2>Average score estimate</h2></div></div>${performance.length ? renderProgressBars(performance, true) : renderEmpty("No score history yet. Finish a session to build your report.")}</article><article class="card"><p class="eyebrow">HOW TO READ THIS</p><h2>Scores are estimates</h2><p class="body-copy">The current built-in fallback checks for key concepts and words from a reference answer. It does not understand meaning. If the ML API is configured, its result will be identified separately.</p></article></section>
        <article class="card section-card"><div class="section-heading"><div><p class="eyebrow">HISTORY</p><h2>Recent sessions</h2></div></div>${renderSessionList(getHistory())}</article>
        <article class="card section-card"><div class="section-heading"><div><p class="eyebrow">ANSWER HISTORY</p><h2>Review past answers</h2></div></div>${renderAnswerHistory()}</article>`;
}

function renderGaps() {
    const performance = getTopicPerformance();
    const lowEvidence = performance.filter(item => item.count < 5);
    const enough = performance.filter(item => item.count >= 5);
    const reviewTopics = enough.filter(item => item.score < 60).sort((a, b) => a.score - b.score);
    const strongTopics = enough.filter(item => item.score >= 60).sort((a, b) => b.score - a.score);
    if (!performance.length) return `${renderHeader("PRACTICE REFLECTION", "Skill gaps", "Use practice history to decide what to review next.")}
        <article class="card">${renderEmpty("There is not enough practice history yet. Complete a few sessions and check again.")}</article>`;
    return `${renderHeader("PRACTICE REFLECTION", "Skill gaps", "These are practice trends, not a definitive measure of ability.")}
        ${lowEvidence.length ? `<article class="notice notice-info"><strong>More practice data is needed.</strong> ${lowEvidence.map(item => `${escapeHTML(item.name)} has ${item.count} answer(s); we use at least five answers before calling a topic a trend.`).join(" ")}</article>` : ""}
        <section class="report-grid"><article class="card"><p class="eyebrow">REVIEW FIRST</p><h2>Lower current estimates</h2>${reviewTopics.length ? renderProgressBars(reviewTopics, true) : `<p class="body-copy">No topic with enough answers is currently below the review threshold.</p>`}</article><article class="card"><p class="eyebrow">CURRENT STRENGTHS</p><h2>Topics going well</h2>${strongTopics.length ? renderProgressBars(strongTopics, true) : `<p class="body-copy">More practice is needed before identifying higher-scoring topics.</p>`}</article></section>
        <article class="card section-card"><div class="section-heading"><div><p class="eyebrow">PERSONALIZED REVIEW</p><h2>Your revision plan</h2></div></div>${renderRevisionPlan()}<p class="muted small-note">Scores are rough estimates. Use your judgment when reviewing answers.</p></article>`;
}

function renderProfile() {
    const name = getUserName();
    const email = AUTH_USER?.email || "Google account";
    const initials = name.trim() ? name.trim().charAt(0).toUpperCase() : "?";
    return `${renderHeader("YOUR DETAILS", "Profile & settings", "Your Google account identifies you; your practice history stays in this browser.")}
        <article class="card profile-card"><div class="profile-summary"><span class="big-avatar">${escapeHTML(initials)}</span><div><h2>${escapeHTML(name || "Your name")}</h2><p>${escapeHTML(email)}</p></div></div><form id="profile-form" class="form-stack profile-form"><div class="field"><label for="profile-name">Display name</label><input id="profile-name" maxlength="80" required value="${escapeHTML(name)}" placeholder="Enter your name" /></div><div class="form-feedback" id="profile-message" aria-live="polite"></div><button class="button" type="submit">Save name</button></form>
        <div class="danger-zone"><h2>Practice history</h2><p>Clearing removes saved practice history from this browser. Your profile name stays saved.</p><button class="button button-danger" type="button" id="clear-progress">Clear practice history</button><span id="clear-message" class="form-feedback" aria-live="polite"></span></div></article>`;
}

function renderSession() {
    return `${renderHeader("FOCUSED PRACTICE", "Practice session", "Write what you know. You can go back and change an answer before finishing.")}
        <section class="session-panel"><article class="card session-card"><div class="session-topline"><span class="badge" id="session-label"></span><span id="session-position" class="muted"></span></div><div class="progress-track"><span id="session-progress-bar"></span></div><p class="eyebrow question-number" id="question-meta"></p><h2 class="session-question" id="question-text"></h2><form id="answer-form"><div class="field"><label for="answer-input">Your answer</label><textarea id="answer-input" rows="8" placeholder="Explain your answer in your own words..."></textarea><small id="answer-hint">Your answer stays in this browser session.</small></div><div id="answer-status" class="notice" aria-live="polite"></div><div class="session-controls"><button class="button button-secondary" id="previous-question" type="button">← Previous</button><div><button class="button button-secondary" id="skip-question" type="button">Skip</button> <button class="button" id="submit-answer" type="submit">Save and continue →</button></div></div></form></article></section>`;
}

function renderFeedback() {
    const feedback = readJSON(sessionStorage, STORAGE.lastFeedback, null);
    if (!feedback || !Array.isArray(feedback.answers) || !feedback.answers.length) {
        return `${renderHeader("SESSION REVIEW", "Practice feedback", "Complete a practice session to see answer feedback.")}
            <article class="card">${renderEmpty("No completed session is available in this browser tab.")}</article>`;
    }
    const answered = feedback.answers.filter(answer => !answer.skipped);
    const average = answered.length ? Math.round(answered.reduce((sum, answer) => sum + Number(answer.score || 0), 0) / answered.length) : 0;
    return `${renderHeader("SESSION REVIEW", "Practice feedback", `${escapeHTML(feedback.topic)} · ${escapeHTML(feedback.difficulty)} · ${new Date(feedback.date).toLocaleString()}`, '<a class="button" href="start-practice.html">Practice again</a>')}
        <section class="stats-grid">${renderStat("◉", "Average estimate", `${average}%`, "For answered questions", "purple")}${renderStat("✎", "Questions", feedback.answers.length, "This session", "blue")}${renderStat("✓", "Answered", answered.length, "Compared against reference text", "green")}${renderStat("↷", "Skipped", feedback.answers.length - answered.length, "Skipped answers score zero", "amber")}</section>
        <article class="card"><div class="section-heading"><div><p class="eyebrow">ANSWER BY ANSWER</p><h2>Review your responses</h2></div></div><div class="feedback-list">${feedback.answers.map((answer, index) => `
            <section class="feedback-item"><p class="eyebrow">QUESTION ${String(index + 1).padStart(2, "0")} · ${escapeHTML(answer.topic || "General")}</p><h3>${escapeHTML(answer.question)}</h3><p><strong>Question difficulty</strong><br />${escapeHTML(answer.difficulty || "Unspecified")}${answer.recommendedDifficulty ? ` · next question recommendation: ${escapeHTML(answer.recommendedDifficulty)}` : ""}</p><p><strong>Your answer</strong><br />${escapeHTML(answer.answer || "Skipped")}</p><p><strong>Reference answer</strong><br />${escapeHTML(answer.referenceAnswer || "No reference answer is available.")}</p>${answer.concepts?.length ? `<p><strong>Key concepts</strong><br />${answer.concepts.map(concept => `<span class="concept-chip ${answer.matchedConcepts?.includes(concept) ? "matched" : "missing"}">${escapeHTML(concept)}</span>`).join(" ")}</p>` : ""}<span class="badge ${answer.method === "ml_model" ? "badge-model" : ""}">${answer.skipped ? "Skipped" : `${Number(answer.score)}% · ${answer.method === "ml_model" ? "ML model estimate" : "keyword estimate"}`}</span>${answer.note ? `<p class="muted small-note">${escapeHTML(answer.note)}</p>` : ""}</section>`).join("")}</div></article>`;
}

function render() {
    const renderers = {
        dashboard: renderDashboard, start: renderStart, topics: renderTopics,
        notes: renderNotes, bank: renderBank, report: renderReport,
        gaps: renderGaps, profile: renderProfile, session: renderSession,
        feedback: renderFeedback
    };
    renderShell((renderers[page] || renderDashboard)());
    connectPageControls();
}

function connectPageControls() {
    if (page === "start") connectStartForm();
    if (page === "topics") connectTopicFilters();
    if (page === "notes") connectNotes();
    if (page === "bank") connectBank();
    if (page === "report") connectReport();
    if (page === "gaps") connectGaps();
    if (page === "profile") connectProfile();
    if (page === "session") connectSession();
}

function connectStartForm() {
    const topicSelect = document.getElementById("topic-select");
    const difficultySelect = document.getElementById("difficulty-select");
    const countSelect = document.getElementById("count-select");
    const availableCount = document.getElementById("available-count");
    const updateDifficultyOptions = () => {
        const available = getDifficulties(topicSelect.value);
        difficultySelect.innerHTML = available.map(level => `<option value="${level.value}">${level.value}</option>`).join("");
        updateAvailableCount();
    };
    const updateAvailableCount = () => {
        const level = difficultyValue(difficultySelect.value);
        const atLevel = questionBank.filter(question => question.topic === topicSelect.value && question.difficulty === level).length;
        const total = questionBank.filter(question => question.topic === topicSelect.value && ["Easy", "Medium", "Hard"].includes(question.difficulty)).length;
        availableCount.textContent = `Starts at ${difficultySelect.value} (${atLevel} question(s)). Difficulty can adjust as you answer; up to ${Math.min(total, 20)} questions are available for this topic.`;
    };
    topicSelect.addEventListener("change", updateDifficultyOptions);
    difficultySelect.addEventListener("change", updateAvailableCount);
    countSelect.addEventListener("change", updateAvailableCount);
    updateAvailableCount();

    document.getElementById("start-form").addEventListener("submit", event => {
        event.preventDefault();
        const topic = topicSelect.value;
        const level = difficultyValue(difficultySelect.value);
        const count = Math.max(1, Math.min(20, Number(countSelect.value) || 5));
        const candidates = questionBank.filter(question => question.topic === topic && question.difficulty === level);
        if (!candidates.length) {
            availableCount.textContent = "There are no questions for this selection. Choose another topic or difficulty.";
            return;
        }
        const firstQuestion = candidates[Math.floor(Math.random() * candidates.length)];
        sessionStorage.setItem(STORAGE.topic, topic);
        sessionStorage.setItem(STORAGE.difficulty, difficultySelect.value);
        sessionStorage.setItem(STORAGE.count, String(count));
        sessionStorage.setItem(STORAGE.answers, "[]");
        sessionStorage.setItem(STORAGE.questionIds, JSON.stringify([firstQuestion.id]));
        sessionStorage.setItem(STORAGE.questionIndex, "0");
        sessionStorage.setItem(STORAGE.sessionId, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        sessionStorage.removeItem(STORAGE.lastFeedback);
        location.href = "practice-session.html";
    });
}

function connectTopicFilters() {
    const groups = {
        programming: ["Python", "Java", "C++", "OOP"],
        systems: ["Operating Systems", "Computer Networks", "Software Engineering"],
        data: ["Data Structures", "Algorithms", "Database Management", "SQL", "DBMS", "DSA"]
    };
    document.getElementById("topic-filters").addEventListener("click", event => {
        const button = event.target.closest("[data-topic-filter]");
        if (!button) return;
        document.querySelectorAll("[data-topic-filter]").forEach(item => item.classList.toggle("active", item === button));
        const filter = button.dataset.topicFilter;
        const shown = filter === "all" ? getTopics() : getTopics().filter(topic => (groups[filter] || []).includes(topic.name));
        document.getElementById("topic-results").innerHTML = renderTopicCards(shown);
    });
}

function connectNotes() {
    let selectedTopic = "All Topics";
    const search = document.getElementById("notes-search");
    const draw = () => {
        const term = search.value.trim().toLowerCase();
        const filtered = NOTES.filter(note => (selectedTopic === "All Topics" || note[0] === selectedTopic) && note.join(" ").toLowerCase().includes(term));
        document.getElementById("notes-list").innerHTML = renderNoteItems(filtered);
        document.getElementById("notes-title").textContent = selectedTopic;
    };
    search.addEventListener("input", draw);
    document.querySelectorAll("[data-note-filter]").forEach(button => button.addEventListener("click", () => {
        selectedTopic = button.dataset.noteFilter;
        document.querySelectorAll("[data-note-filter]").forEach(item => item.classList.toggle("active", item === button));
        draw();
    }));
    document.getElementById("download-notes").addEventListener("click", () => downloadText("prepai-short-notes.txt", NOTES.map(note => `${note[0]} — ${note[1]}\n${note[2]}`).join("\n\n")));
}

function connectBank() {
    const topicSelect = document.getElementById("bank-topic");
    const difficultySelect = document.getElementById("bank-difficulty");
    const searchInput = document.getElementById("bank-search");
    const params = new URLSearchParams(location.search);
    if (params.get("search")) searchInput.value = params.get("search");
    const draw = () => {
        const topic = topicSelect.value;
        const difficulty = difficultySelect.value;
        const term = searchInput.value.trim().toLowerCase();
        const filtered = questionBank.filter(question =>
            (topic === "all" || question.topic === topic) &&
            (difficulty === "all" || question.difficulty === difficulty) &&
            `${question.question} ${question.topic} ${question.subtopic || ""}`.toLowerCase().includes(term)
        );
        document.getElementById("bank-count").textContent = `${filtered.length} question(s)`;
        document.getElementById("bank-results").innerHTML = filtered.length ? filtered.map(question => `
            <details class="bank-question"><summary><span>${escapeHTML(question.question)}</span><span class="question-tags"><span class="badge">${escapeHTML(question.topic)}</span><span class="badge badge-soft">${escapeHTML(question.difficulty || "Unspecified")}</span></span></summary><div class="bank-answer"><p><strong>Reference answer</strong><br />${escapeHTML(question.reference_answer || "No reference answer supplied.")}</p>${Array.isArray(question.key_concepts) && question.key_concepts.length ? `<p><strong>Key concepts</strong><br />${question.key_concepts.map(escapeHTML).join(" · ")}</p>` : ""}<a class="text-link" href="start-practice.html?topic=${encodeURIComponent(question.topic)}">Practice this topic →</a></div></details>
        `).join("") : `<div class="empty-inline">No questions match these filters.</div>`;
    };
    [topicSelect, difficultySelect, searchInput].forEach(element => element.addEventListener("input", draw));
    draw();
}

function connectReport() {
    document.getElementById("export-report").addEventListener("click", () => {
        const lines = ["PrepAI / InterviewIQ Practice Report", `Exported: ${new Date().toLocaleString()}`, "", ...getHistory().map(session => {
            const scores = session.answers.map(answer => Number(answer.score)).filter(Number.isFinite);
            const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
            return `${session.date || ""} | ${session.topic || "Practice"} | ${session.difficulty || ""} | ${scores.length} answers | ${average}% average estimate`;
        })];
        downloadText("prepai-practice-report.txt", lines.join("\n"));
    });
}

function connectGaps() {
    // Skill gap views are computed directly from the saved answers in renderGaps().
}

function connectProfile() {
    document.getElementById("profile-form").addEventListener("submit", event => {
        event.preventDefault();
        const name = document.getElementById("profile-name").value.trim();
        const message = document.getElementById("profile-message");
        if (!name) {
            message.textContent = "Enter a name before saving.";
            return;
        }
        localStorage.setItem(STORAGE.name, name);
        message.textContent = "Name saved.";
        setTimeout(() => location.reload(), 250);
    });
    document.getElementById("clear-progress").addEventListener("click", () => {
        if (!confirm("Clear saved practice history from this browser? Your profile name will stay saved.")) return;
        localStorage.removeItem(STORAGE.history);
        localStorage.removeItem("interviewiq_last_practice");
        document.getElementById("clear-message").textContent = "Saved practice history cleared.";
        setTimeout(() => location.href = "index.html", 300);
    });
}

function getActiveQuestions() {
    const ids = readJSON(sessionStorage, STORAGE.questionIds, []);
    if (!Array.isArray(ids) || !ids.length) return [];
    const byId = new Map(questionBank.map(question => [String(question.id), question]));
    return ids.map(id => byId.get(String(id))).filter(Boolean);
}

const ADAPTIVE_LEVELS = ["Easy", "Medium", "Hard"];

function recommendDifficulty(score, currentDifficulty, recentScores = []) {
    const history = [...recentScores.slice(-2).map(Number), Number(score)].filter(Number.isFinite);
    const average = history.reduce((sum, value) => sum + value, 0) / Math.max(1, history.length);
    const currentIndex = Math.max(0, ADAPTIVE_LEVELS.indexOf(currentDifficulty));
    if (average >= 78) return ADAPTIVE_LEVELS[Math.min(ADAPTIVE_LEVELS.length - 1, currentIndex + 1)];
    if (average < 42) return ADAPTIVE_LEVELS[Math.max(0, currentIndex - 1)];
    return ADAPTIVE_LEVELS[currentIndex];
}

function chooseQuestion(topic, targetDifficulty, usedIds = []) {
    const used = new Set(usedIds.map(String));
    const candidates = questionBank.filter(question =>
        question.topic === topic &&
        ADAPTIVE_LEVELS.includes(question.difficulty) &&
        !used.has(String(question.id))
    );
    if (!candidates.length) return null;
    const targetIndex = Math.max(0, ADAPTIVE_LEVELS.indexOf(targetDifficulty));
    const availableLevels = [...new Set(candidates.map(question => question.difficulty))];
    const chosenLevel = availableLevels.sort((a, b) =>
        Math.abs(ADAPTIVE_LEVELS.indexOf(a) - targetIndex) - Math.abs(ADAPTIVE_LEVELS.indexOf(b) - targetIndex)
    )[0];
    const atLevel = candidates.filter(question => question.difficulty === chosenLevel);
    return atLevel[Math.floor(Math.random() * atLevel.length)];
}

function connectSession() {
    let questions = getActiveQuestions();
    const sessionId = sessionStorage.getItem(STORAGE.sessionId);
    if (!sessionId) {
        document.querySelector(".session-panel").innerHTML = `<article class="card">${renderEmpty("Start a practice session first. No questions were loaded for this session.")}</article>`;
        return;
    }
    const topic = sessionStorage.getItem(STORAGE.topic) || questions[0]?.topic;
    const difficulty = sessionStorage.getItem(STORAGE.difficulty) || "Intermediate";
    const plannedCount = Math.max(1, Number(sessionStorage.getItem(STORAGE.count)) || 5);
    if (!topic) {
        document.querySelector(".session-panel").innerHTML = `<article class="card">${renderEmpty("Choose a topic and start a session first.")}</article>`;
        return;
    }
    if (!questions.length) {
        const firstQuestion = chooseQuestion(topic, difficultyValue(difficulty));
        if (firstQuestion) questions = [firstQuestion];
    }
    if (!questions.length) {
        document.querySelector(".session-panel").innerHTML = `<article class="card">${renderEmpty("There are no available questions for this topic.", "start-practice.html", "Choose another topic")}</article>`;
        return;
    }
    let answers = getSessionAnswers();
    let index = Math.max(0, Math.min(Number(sessionStorage.getItem(STORAGE.questionIndex)) || 0, questions.length - 1));
    const questionText = document.getElementById("question-text");
    const answerInput = document.getElementById("answer-input");
    const feedback = document.getElementById("answer-status");

    function drawQuestion() {
        const question = questions[index];
        document.getElementById("session-label").textContent = `${topic} · Adaptive practice`;
        document.getElementById("session-position").textContent = `Question ${index + 1} of up to ${plannedCount}`;
        document.getElementById("session-progress-bar").style.width = `${Math.min(100, ((index + 1) / plannedCount) * 100)}%`;
        document.getElementById("question-meta").textContent = `${question.subtopic || question.topic} · ${question.difficulty || "Unspecified"}`;
        questionText.textContent = question.question;
        answerInput.value = answers[index]?.answer || "";
        document.getElementById("previous-question").disabled = index === 0;
        document.getElementById("skip-question").textContent = index + 1 >= plannedCount ? "Skip and finish" : "Skip";
        document.getElementById("submit-answer").textContent = index + 1 >= plannedCount ? "Save and finish" : "Save and continue →";
        feedback.textContent = answers[index]?.submitted ? `Saved score: ${answers[index].score}% (${answers[index].method === "ml_model" ? "ML model" : "keyword estimate"}). You can edit and save this answer again.` : "";
    }

    function saveState() {
        sessionStorage.setItem(STORAGE.answers, JSON.stringify(answers));
        sessionStorage.setItem(STORAGE.questionIndex, String(index));
        sessionStorage.setItem(STORAGE.questionIds, JSON.stringify(questions.map(question => question.id)));
    }

    function advanceToNext(targetDifficulty) {
        if (index + 1 >= plannedCount) {
            finishSession(topic, difficulty, answers);
            return;
        }
        const usedIds = questions.slice(0, index + 1).map(question => question.id);
        // If the learner edits an earlier answer, discard the old future path and adapt it again.
        questions = questions.slice(0, index + 1);
        answers = answers.slice(0, index + 1);
        const nextQuestion = chooseQuestion(topic, targetDifficulty, usedIds);
        if (!nextQuestion) {
            sessionStorage.setItem(STORAGE.answers, JSON.stringify(answers));
            finishSession(topic, difficulty, answers);
            return;
        }
        questions.push(nextQuestion);
        index += 1;
        saveState();
        drawQuestion();
    }

    async function submitAnswer(event) {
        event.preventDefault();
        const question = questions[index];
        const text = answerInput.value.trim();
        if (!text) {
            feedback.textContent = "Write an answer or choose Skip before moving on.";
            answerInput.focus();
            return;
        }
        document.getElementById("submit-answer").disabled = true;
        feedback.textContent = "Scoring answer…";
        const priorScores = answers.slice(0, index).filter(answer => answer?.submitted && !answer.skipped).map(answer => Number(answer.score));
        const result = await scoreAnswer(question, text, question.difficulty, priorScores);
        answers[index] = {
            questionId: question.id,
            question: question.question,
            topic: question.topic,
            answer: text,
            referenceAnswer: question.reference_answer || "",
            concepts: Array.isArray(question.key_concepts) ? question.key_concepts : [],
            matchedConcepts: result.matchedConcepts || [],
            score: result.score,
            method: result.method,
            difficulty: question.difficulty,
            recommendedDifficulty: result.recommendedDifficulty,
            note: result.note || "",
            skipped: false,
            submitted: true
        };
        saveState();
        document.getElementById("submit-answer").disabled = false;
        advanceToNext(result.recommendedDifficulty || recommendDifficulty(result.score, question.difficulty, priorScores));
    }

    function skipQuestion() {
        const question = questions[index];
        const priorScores = answers.slice(0, index).filter(answer => answer?.submitted && !answer.skipped).map(answer => Number(answer.score));
        const nextDifficulty = recommendDifficulty(0, question.difficulty, priorScores);
        answers[index] = {
            questionId: question.id,
            question: question.question,
            topic: question.topic,
            answer: "",
            referenceAnswer: question.reference_answer || "",
            concepts: Array.isArray(question.key_concepts) ? question.key_concepts : [],
            matchedConcepts: [], score: 0, method: "skipped", difficulty: question.difficulty,
            recommendedDifficulty: nextDifficulty, note: "Skipped by learner.", skipped: true, submitted: true
        };
        saveState();
        advanceToNext(nextDifficulty);
    }

    document.getElementById("answer-input").addEventListener("input", () => {
        const question = questions[index];
        answers[index] = {
            ...(answers[index] || {}), questionId: question.id,
            question: question.question, topic: question.topic,
            answer: answerInput.value, submitted: Boolean(answers[index]?.submitted)
        };
        saveState();
    });
    document.getElementById("answer-form").addEventListener("submit", submitAnswer);
    document.getElementById("skip-question").addEventListener("click", skipQuestion);
    document.getElementById("previous-question").addEventListener("click", () => {
        if (index > 0) { index -= 1; saveState(); drawQuestion(); }
    });
    drawQuestion();
}

function tokenize(text) {
    return new Set(String(text || "").toLowerCase().match(/[a-z0-9+#.]+/g) || []);
}

function localEstimate(question, answer, note = "") {
    const answerTerms = tokenize(answer);
    const concepts = Array.isArray(question.key_concepts) ? question.key_concepts : [];
    const matchedConcepts = concepts.filter(concept => {
        const conceptText = String(concept).toLowerCase().trim();
        return conceptText && (answer.toLowerCase().includes(conceptText) || tokenize(conceptText).size > 0 && [...tokenize(conceptText)].every(term => answerTerms.has(term)));
    });
    if (concepts.length) {
        return { score: Math.round(matchedConcepts.length / concepts.length * 100), matchedConcepts, method: "keyword_coverage", note: note || "Estimate based on key-concept word matches; meaning is not assessed." };
    }
    const stopWords = new Set(["this", "that", "with", "from", "have", "will", "into", "than", "when", "where", "what", "which", "their", "there", "these", "those", "also", "such", "been", "being", "they", "them", "then", "some", "more", "most", "each", "only", "used", "using", "does", "over", "under", "about", "your", "because", "between", "through"]);
    const referenceTerms = [...tokenize(question.reference_answer)].filter(term => term.length > 3 && !stopWords.has(term));
    const uniqueTerms = [...new Set(referenceTerms)];
    const matches = uniqueTerms.filter(term => answerTerms.has(term));
    return { score: uniqueTerms.length ? Math.round(matches.length / uniqueTerms.length * 100) : 0, matchedConcepts: matches, method: "keyword_coverage", note: note || "Estimate based on overlapping words with the reference answer; meaning is not assessed." };
}

async function scoreAnswer(question, answer, currentDifficulty, recentScores) {
    try {
        const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(5000)
            : undefined;
        const response = await fetch(`${API_BASE}/api/score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: question.question,
                reference_answer: question.reference_answer || "",
                student_answer: answer,
                key_concepts: Array.isArray(question.key_concepts) ? question.key_concepts : [],
                current_difficulty: currentDifficulty,
                recent_scores: recentScores
            }),
            signal
        });
        if (response.ok) {
            const result = await response.json();
            if (Number.isFinite(Number(result.score)) && Number(result.score) >= 0 && Number(result.score) <= 100) {
                const score = Math.round(Number(result.score));
                return {
                    score,
                    method: "ml_model",
                    matchedConcepts: result.matched_concepts || [],
                    recommendedDifficulty: result.recommended_difficulty || recommendDifficulty(score, currentDifficulty, recentScores),
                    note: result.note || "Model score is an estimate."
                };
            }
            const fallback = localEstimate(question, answer, "The scoring API returned an invalid score; showing the local keyword estimate instead.");
            return { ...fallback, recommendedDifficulty: recommendDifficulty(fallback.score, currentDifficulty, recentScores) };
        }
        const detail = await response.json().catch(() => ({}));
        const fallback = localEstimate(question, answer, detail.detail || "ML model is not configured; showing the local keyword estimate.");
        return { ...fallback, recommendedDifficulty: recommendDifficulty(fallback.score, currentDifficulty, recentScores) };
    } catch {
        const fallback = localEstimate(question, answer, "ML scoring service is unavailable; showing the local keyword estimate.");
        return { ...fallback, recommendedDifficulty: recommendDifficulty(fallback.score, currentDifficulty, recentScores) };
    }
}

function finishSession(topic, difficulty, answers) {
    const id = sessionStorage.getItem(STORAGE.sessionId);
    const completed = answers.map((answer, index) => {
        const question = questionBank.find(item => String(item.id) === String(answer.questionId));
        return {
            questionId: answer.questionId ?? question?.id ?? index,
            question: answer.question || question?.question || "",
            topic: answer.topic || question?.topic || topic,
            answer: answer.answer || "",
            referenceAnswer: answer.referenceAnswer || question?.reference_answer || "",
            concepts: answer.concepts || question?.key_concepts || [],
            matchedConcepts: answer.matchedConcepts || [],
            score: Number(answer.score) || 0,
            method: answer.method || "skipped",
            difficulty: answer.difficulty || question?.difficulty || "",
            recommendedDifficulty: answer.recommendedDifficulty || "",
            note: answer.note || "",
            skipped: Boolean(answer.skipped)
        };
    });
    const record = { id, topic, difficulty, date: new Date().toISOString(), answers: completed };
    const history = getHistory();
    if (!history.some(session => session.id === id)) {
        history.unshift(record);
        localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 100)));
    }
    sessionStorage.setItem(STORAGE.lastFeedback, JSON.stringify(record));
    location.href = "feedback.html";
}

function downloadText(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

async function loadQuestionBank() {
    const response = await fetch("questions.json");
    if (!response.ok) throw new Error(`Question bank could not be loaded (HTTP ${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("The question bank must be a JSON array.");
    const aliases = { DBMS: "Database Management", OS: "Operating Systems", CN: "Computer Networks", DSA: "Data Structures", "C/C++": "C++" };
    data.forEach((item, index) => {
        if (!item || typeof item.question !== "string" || !item.question.trim()) return;
        questionBank.push({
            ...item,
            id: item.id ?? index + 1,
            topic: aliases[item.topic] || item.topic || "Uncategorized",
            difficulty: ["Easy", "Medium", "Hard"].includes(item.difficulty) ? item.difficulty : "Unspecified"
        });
    });
    if (!questionBank.length) throw new Error("The question bank contains no usable questions.");
}

function showLoadError(error) {
    app.innerHTML = `<main class="load-error"><p class="eyebrow">QUESTION BANK ERROR</p><h1>PrepAI could not start</h1><p>${escapeHTML(error.message)}</p><p>Run this folder with a local web server such as VS Code Live Server. Opening the HTML file directly may block fetch() from loading questions.json.</p><a class="button" href="index.html">Try again</a></main>`;
}

if (page !== "login" && (!AUTH_USER?.sub || !AUTH_USER?.email)) {
    const requested = location.pathname.split("/").pop();
    const safePages = new Set(["index.html", "start-practice.html", "practice-by-topic.html", "practice-session.html", "feedback.html", "question-bank.html", "short-notes.html", "performance-report.html", "skill-gaps.html", "profile-settings.html"]);
    const next = safePages.has(requested) ? requested : "index.html";
    location.replace(`login.html?next=${encodeURIComponent(next)}`);
} else if (page !== "login") {
    loadQuestionBank().then(render).catch(showLoadError);
}
