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
const PREPARATION_GROUP_KEY = `prepai_preparation_group_${ACCOUNT_SCOPE}`;
const STORAGE = {
    name: `interviewiq_user_name_${ACCOUNT_SCOPE}`,
    history: `interviewiq_sessions_${ACCOUNT_SCOPE}`,
    mode: `iqSessionMode_${ACCOUNT_SCOPE}`,
    role: `iqSessionRole_${ACCOUNT_SCOPE}`,
    topic: `iqTopic_${ACCOUNT_SCOPE}`,
    topics: `iqTopics_${ACCOUNT_SCOPE}`,
    difficulty: `iqDifficulty_${ACCOUNT_SCOPE}`,
    questionType: `iqQuestionType_${ACCOUNT_SCOPE}`,
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
let dashboardRange = 7;

const NAVIGATION = [
    ["dashboard", "⌂", "Dashboard", "index.html"],
    ["start", "▶", "Start Practice", "start-practice.html"],
    ["mock", "✦", "AI Mock Interview", "mock-interview.html"],
    ["topics", "◉", "Practice by Topic", "practice-by-topic.html"],
    ["notes", "▤", "Notes", "short-notes.html"],
    ["bank", "☷", "Question Bank", "question-bank.html"],
    ["report", "▥", "Performance Report", "performance-report.html"],
    ["gaps", "◎", "Skill Gaps", "skill-gaps.html"],
    ["profile", "⚙", "Profile & Settings", "profile-settings.html"]
];

const TOPIC_INFO = {
    Python: ["🐍", "Language basics, data types, and object-oriented programming", "blue"],
    Java: ["☕", "Core Java, object-oriented programming, and language concepts", "red"],
    "C++": ["⚙", "C and C++ fundamentals and programming concepts", "blue"],
    "Data Structures": ["▦", "Data structures, algorithms, and problem solving", "violet"],
    Algorithms: ["⌘", "Algorithm design, analysis, and complexity", "pink"],
    "Operating Systems": ["▣", "Processes, memory, scheduling, and operating systems", "cyan"],
    "Database Management": ["▤", "Databases, SQL, and transaction concepts", "orange"],
    "Computer Networks": ["⌘", "Networking concepts, protocols, and communication", "blue"],
    "Machine Learning": ["✣", "Models, training, evaluation, and applied machine learning", "pink"],
    "System Design": ["◈", "Scalable architecture, components, and system tradeoffs", "violet"],
    "Web Development": ["◎", "Frontend, backend, APIs, and web technologies", "cyan"],
    Aptitude: ["∑", "Numerical reasoning, logic, and problem solving", "orange"],
    OOP: ["◇", "Object-oriented programming concepts", "violet"],
    SQL: ["▤", "Queries, joins, and relational databases", "orange"],
    "Software Engineering": ["⚙", "Software design and development practices", "green"]
};

const PREPARATION_GROUPS = {
    undergraduate: {
        label: "Undergraduate students",
        detail: "2nd–4th year",
        description: "Build core concepts and confidence step by step.",
        icon: "🎓",
        recommendedDifficulty: "Easy",
        topics: ["Python", "Java", "C++", "OOP", "Data Structures", "Database Management"]
    },
    graduate: {
        label: "Recent graduates",
        detail: "Freshers",
        description: "Rehearse common technical interview questions.",
        icon: "✦",
        recommendedDifficulty: "Medium",
        topics: ["Data Structures", "Python", "Java", "SQL", "Operating Systems", "Computer Networks"]
    },
    professional: {
        label: "Working professionals",
        detail: "Job switch",
        description: "Refresh technical topics as you prepare for a move.",
        icon: "▣",
        recommendedDifficulty: "Medium",
        topics: ["Software Engineering", "SQL", "Database Management", "Operating Systems", "Computer Networks", "Data Structures"]
    },
    educator: {
        label: "Educators / mentors",
        detail: "Teaching use",
        description: "Browse the question bank to guide lessons and practice.",
        icon: "♧",
        recommendedDifficulty: "Medium",
        topics: ["Python", "Java", "C++", "OOP", "Data Structures", "Database Management", "SQL", "Operating Systems", "Computer Networks", "Software Engineering"]
    }
};

const MOCK_INTERVIEW_ROLES = {
    software: { label: "Software Engineer", topics: ["Data Structures", "Python", "Java", "Software Engineering", "SQL", "Operating Systems"] },
    python: { label: "Python Developer", topics: ["Python", "Data Structures", "SQL", "Software Engineering"] },
    java: { label: "Java Developer", topics: ["Java", "OOP", "Data Structures", "SQL", "Software Engineering"] },
    cpp: { label: "C++ Developer", topics: ["C++", "OOP", "Data Structures", "Operating Systems"] },
    database: { label: "Database Developer", topics: ["Database Management", "SQL", "Data Structures", "Software Engineering"] },
    network: { label: "Network Engineer", topics: ["Computer Networks", "Operating Systems", "C++"] },
    custom: { label: "Custom technical role", topics: [] }
};

const NOTES = [
    { topic: "C++", summary: "A compiled, general-purpose language that gives direct control over memory while supporting object-oriented and generic programming.", sections: [
        { heading: "Language basics", points: ["A C++ program commonly starts execution in int main(); declarations introduce names and types before use.", "Use const for values that should not be changed, and choose a type that matches the value and range needed.", "The compiler translates source code into a program; compile errors are different from errors that happen while the program runs."] },
        { heading: "Pointers and memory", points: ["A pointer stores an address. Use & to get an address and * to access the pointed-to object.", "A null pointer points to no object; check pointers before dereferencing when they may be empty.", "Prefer automatic objects and standard containers. If dynamic allocation is needed, use RAII and smart pointers to manage lifetime safely."] },
        { heading: "Functions and collections", points: ["Pass small values by value; pass large objects by const reference when the function should not modify them.", "Arrays and vectors store ordered elements; std::vector grows dynamically and provides indexed access.", "Use standard algorithms and containers where possible instead of writing memory-management code by hand."] },
        { heading: "Classes and input/output", points: ["A class combines data and operations; public, private, and protected control access.", "Constructors initialize objects. Destructors release owned resources when an object leaves its lifetime.", "iostream provides console input and output; use std::cin and std::cout and check stream state for errors."] },
        { heading: "Templates, builds, and safe code", points: ["Templates let functions and classes work with multiple types while keeping type checks at compile time.", "The Standard Template Library provides containers, iterators, and algorithms such as sort and find.", "Headers declare interfaces and source files define implementations; include guards or #pragma once prevent repeated inclusion.", "Watch for out-of-bounds access, dangling pointers, uninitialized values, and signed/unsigned comparison errors."] },
        { heading: "Useful comparisons", points: ["A reference must refer to an object when initialized; a pointer can be reassigned and can represent no object with nullptr.", "Stack storage is automatically reclaimed at scope exit; heap storage can outlive a scope but needs clear ownership.", "A vector is usually the default sequence container; a list is useful only when its insertion/removal tradeoffs fit the access pattern.", "Copying duplicates a value; moving can transfer resources from a temporary or expiring object to avoid expensive copies."] }
    ] },
    { topic: "Computer Networks", summary: "How devices exchange data through agreed protocols, addressing, routing, and layered services.", sections: [
        { heading: "Layers and protocols", points: ["Layering separates responsibilities. The OSI model has seven layers; the TCP/IP model groups the practical Internet stack into fewer layers.", "Each layer uses the service below it and provides a service above it; encapsulation adds protocol information as data moves down the stack.", "A protocol defines message format, meaning, and rules for sending and receiving data."] },
        { heading: "Addressing and delivery", points: ["IP addresses identify interfaces for network-layer delivery; routers forward packets between networks.", "TCP provides a reliable, ordered byte stream using acknowledgements and retransmission; UDP sends datagrams without guaranteeing delivery or order.", "DNS maps domain names to records such as IP addresses. HTTP and HTTPS carry web requests; HTTPS protects traffic with TLS."] },
        { heading: "Local networks and routing", points: ["Ethernet and Wi-Fi connect devices on local networks. Switches forward frames within a local network using link-layer addresses.", "Routers choose a next hop based on routing tables; routing protocols help routers exchange reachability information.", "Bandwidth is a link’s capacity; throughput is the achieved data rate, while latency is the time a message takes to travel."] },
        { heading: "Security and troubleshooting", points: ["TLS protects confidentiality and integrity in transit and helps authenticate the server.", "Firewalls control traffic according to rules; encryption does not replace strong authentication or secure system configuration.", "Troubleshoot from the basics: check the physical or Wi-Fi link, IP configuration, DNS resolution, routing, and then the application protocol."] },
        { heading: "Addressing and interview checks", points: ["A MAC address identifies a network interface on a local link; ARP helps map an IPv4 address to a local MAC address.", "DHCP can assign a host its IP configuration automatically; a subnet mask separates the network prefix from host bits.", "Explain a web request end-to-end: DNS lookup, connection setup, TLS when using HTTPS, HTTP request/response, then data delivery back to the client.", "When comparing TCP and UDP, connect the choice to the application’s needs for reliability, ordering, latency, and overhead."] },
        { heading: "Real-world examples", points: ["A browser uses DNS to find a server address, then sends an HTTP request over a transport connection.", "Video streaming may use buffering and adaptive quality to handle changing throughput; latency and reliability needs depend on the application.", "A ping can help check reachability and round-trip time, while traceroute can show the path’s responding hops; neither proves that a web application is healthy.", "If a device can reach an IP address but not a domain name, investigate DNS before assuming the network link is down."] }
    ] },
    { topic: "Database Management", summary: "Designing and operating data stores so information stays organized, consistent, and retrievable.", sections: [
        { heading: "Relational model and keys", points: ["A relational database stores data in tables of rows and columns; each row represents a record.", "A primary key uniquely identifies a row. A foreign key references a key in another table and helps enforce relationships.", "Constraints such as NOT NULL, UNIQUE, CHECK, and foreign keys protect data quality at the database level."] },
        { heading: "Design and normalization", points: ["Model entities, their attributes, and relationships before creating tables; choose keys that identify records reliably.", "Normalization reduces duplicate facts and update anomalies by splitting data into related tables.", "Indexes can speed up lookups and joins, but use storage and can slow inserts, updates, and deletes."] },
        { heading: "Transactions and ACID", points: ["A transaction groups operations that should succeed or fail as one unit.", "Atomicity means all-or-nothing; consistency preserves rules; isolation controls concurrent transactions; durability preserves committed changes.", "Commit makes a transaction permanent; rollback cancels its uncommitted changes."] },
        { heading: "Concurrency and performance", points: ["Concurrent transactions can cause lost updates, dirty reads, or inconsistent results if isolation is insufficient.", "Locks and isolation levels coordinate access; stronger isolation can reduce anomalies but may lower concurrency.", "Use query plans to understand scans and joins. Add indexes based on real query patterns and measure their effect."] },
        { heading: "Recovery and practical design", points: ["A log records changes so a database can recover after a crash; checkpoints reduce the work needed during recovery.", "Views provide saved queries as a virtual table; they can simplify access but do not automatically improve performance.", "Separate facts into related tables, define constraints, and select indexes according to the queries users actually run.", "In an interview, explain the tradeoff between normalization, query speed, storage, and correctness rather than treating one design as best for every case."] },
        { heading: "Design examples", points: ["Store customers and orders in separate tables, then connect each order to its customer with a foreign key.", "If a customer address is copied into every order row, updating the address in many places can cause inconsistent data; normalization helps avoid that anomaly.", "A bank transfer should debit one account and credit another in one transaction so the database does not save only half the operation.", "An index on a frequently searched column may help reads, but measure its cost if the table receives many writes."] }
    ] },
    { topic: "Data Structures", summary: "Ways to organize data so common operations such as lookup, insertion, removal, and traversal are efficient.", sections: [
        { heading: "Complexity and arrays", points: ["Big O describes how time or space requirements grow as input size grows; it is not an exact runtime measurement.", "Arrays provide constant-time indexed access, but inserting or deleting in the middle usually requires shifting elements.", "A linked list supports local insertion or removal once a node is found, but finding an item requires traversal."] },
        { heading: "Stacks, queues, and hashing", points: ["A stack is last-in, first-out; push adds an item and pop removes the newest item.", "A queue is first-in, first-out; enqueue adds at the back and dequeue removes from the front.", "A hash table maps keys to buckets for average constant-time lookup, insertion, and deletion; collisions still need handling."] },
        { heading: "Trees and heaps", points: ["A tree represents parent-child relationships. A binary search tree orders values so search can be efficient when it stays balanced.", "A heap keeps the smallest or largest item at the root and is useful for priority queues.", "Tree traversals include preorder, inorder, postorder, and level order; each visits nodes in a different sequence."] },
        { heading: "Graphs and choosing a structure", points: ["A graph contains vertices and edges; edges may be directed or undirected, weighted or unweighted.", "Breadth-first search explores by distance in edges; depth-first search explores one path before backtracking.", "Choose a structure based on operations: arrays for indexed access, hash maps for key lookup, queues for order, heaps for priority, and graphs for relationships."] },
        { heading: "Algorithms and complexity", points: ["Binary search runs in O(log n) time on sorted data; sorting first may or may not be worthwhile depending on how often searches repeat.", "Breadth-first and depth-first graph traversals run in O(V + E) time when adjacency lists are used.", "Many comparison-based sorting algorithms run in O(n log n) time; simpler quadratic sorts may be reasonable only for small inputs or special cases.", "State the operation, input size, time complexity, and extra space when comparing data structures or algorithms."] },
        { heading: "Choosing a structure in practice", points: ["Use a queue for breadth-first search because it processes the oldest discovered vertex first.", "Use a stack, often through recursion, for depth-first traversal and backtracking.", "Use a hash map when fast key-based lookup matters more than sorted order; use a balanced search tree when ordered traversal matters.", "Before coding, clarify input size, duplicates, ordering, and edge cases, then choose a structure whose operations match those needs."] }
    ] },
    { topic: "Java", summary: "A statically typed, object-oriented language whose compiled bytecode runs on the Java Virtual Machine.", sections: [
        { heading: "JDK, JRE, and JVM", points: ["The JDK includes development tools such as the compiler; the JVM runs Java bytecode.", "The compiler turns .java source into .class bytecode, which can run on compatible JVMs.", "Java is statically typed: variables and expressions have types checked by the compiler and at runtime where applicable."] },
        { heading: "Classes and object-oriented programming", points: ["Classes define fields and methods; objects are instances created from classes.", "Encapsulation controls access to state. Inheritance reuses and specializes behavior; interfaces define contracts that different classes can implement.", "Polymorphism lets code use a shared parent type or interface while the actual object supplies the behavior."] },
        { heading: "Methods, strings, and exceptions", points: ["Method signatures include the method name and parameter types; overloading uses the same name with different parameter lists.", "String objects are immutable. Use StringBuilder for repeated changes when building a string in a loop.", "Use exceptions to report exceptional conditions; catch specific exceptions and close resources with try-with-resources."] },
        { heading: "Memory and common types", points: ["Local variables and object references have different roles; objects are created on the heap and reclaimed by garbage collection when unreachable.", "Use == to compare primitive values or object identity; use equals() to compare object values when implemented appropriately.", "Collections such as List, Set, and Map provide reusable data structures; choose one based on ordering, uniqueness, and lookup needs."] },
        { heading: "Collections, generics, and good practice", points: ["Generics let collections express the types they contain, for example List<String>, so many type errors are caught at compile time.", "A Set stores unique elements; a Map associates keys with values; a List keeps elements in sequence.", "If objects are used as hash keys, equals() and hashCode() must agree: equal objects need equal hash codes.", "Prefer clear interfaces, small methods, and try-with-resources for files or other closeable resources."] },
        { heading: "Examples to remember", points: ["Use an interface when several unrelated classes need to provide the same capability, such as a common payment or storage operation.", "Use equals() to compare two String values; == checks whether two references point to the same object.", "Make value objects immutable when practical: initialize their state once and do not expose mutable internals.", "Catch an exception only when you can handle it, add useful context, or translate it into a meaningful higher-level error."] }
    ] },
    { topic: "OOP", summary: "A programming approach that organizes software around objects, their state, behavior, and relationships.", sections: [
        { heading: "Classes, objects, and encapsulation", points: ["A class describes data and operations; an object is a particular instance with its own state.", "Encapsulation keeps internal state controlled and exposes a clear public interface.", "Use access modifiers to protect invariants instead of allowing unrelated code to change fields freely."] },
        { heading: "Abstraction and inheritance", points: ["Abstraction exposes the essential behavior while hiding implementation details.", "Inheritance models an is-a relationship and allows a subtype to reuse or specialize a base type.", "Favor composition when an object can use another object’s behavior without being a subtype; it often keeps designs more flexible."] },
        { heading: "Polymorphism and interfaces", points: ["Polymorphism allows different implementations to be used through a common interface.", "Method overriding provides subtype-specific behavior; overloading provides multiple methods with different parameter lists.", "Depend on stable abstractions and small interfaces so implementations can change with fewer effects on callers."] },
        { heading: "Good design", points: ["Keep each class focused on a small, coherent responsibility.", "Reduce coupling between classes and keep related responsibilities together.", "Write tests against observable behavior so implementations can be refactored safely."] },
        { heading: "Design principles and common mistakes", points: ["SOLID summarizes five design ideas: single responsibility, open/closed, Liskov substitution, interface segregation, and dependency inversion.", "Patterns such as Strategy or Factory can solve recurring design problems, but add them only when they make the code clearer.", "Avoid deep inheritance trees, classes with unrelated responsibilities, and public mutable state that breaks invariants.", "In an interview, explain why a relationship is inheritance or composition and how the design handles change and testing."] },
        { heading: "A simple design example", points: ["For a notification feature, define a small sender interface and provide email or text implementations behind it.", "A service can depend on that abstraction rather than creating a concrete email sender itself; tests can substitute a fake sender.", "Keep account rules inside the account/domain model or a focused service instead of spreading them across unrelated UI code.", "Describe the object responsibilities and interactions first, then discuss patterns only if they solve a real design problem."] }
    ] },
    { topic: "Operating Systems", summary: "Software that manages hardware resources and provides common services for applications.", sections: [
        { heading: "Processes and threads", points: ["A process is a running program with its own address space and resources; a thread is an execution path within a process.", "Threads in one process share memory, which makes communication fast but requires synchronization.", "A context switch saves one execution state and restores another; frequent switching adds overhead."] },
        { heading: "CPU scheduling and synchronization", points: ["Schedulers choose which ready task runs; goals can include responsiveness, fairness, throughput, and low waiting time.", "A race condition occurs when the result depends on timing of concurrent operations.", "Locks, semaphores, and condition variables coordinate shared data; protect the smallest necessary critical section."] },
        { heading: "Deadlocks and memory", points: ["Deadlock requires mutual exclusion, hold-and-wait, no preemption, and circular wait; breaking any condition can prevent it.", "Virtual memory gives processes a private address space and lets the OS manage memory beyond physical RAM using pages.", "A page fault occurs when a needed page is not currently in memory; too many faults can cause performance to collapse."] },
        { heading: "Kernel and I/O", points: ["The kernel manages processes, memory, devices, and system calls between programs and hardware.", "User mode restricts direct access to sensitive resources; system calls request services from the kernel.", "Interrupts and device drivers let the OS respond to hardware events and provide a consistent way to use devices."] },
        { heading: "Scheduling and storage", points: ["First-come-first-served is simple but can make short jobs wait behind a long job; round-robin gives each ready process a time slice.", "Shortest-job-first can reduce average waiting time when job lengths are known, while priority scheduling needs care to avoid starvation.", "File systems organize persistent files and metadata; buffering and caching can reduce repeated slow I/O.", "Explain scheduling choices in terms of response time, fairness, throughput, and context-switch overhead."] },
        { heading: "Walk-through examples", points: ["A web browser may use multiple processes for isolation and multiple threads to keep the interface responsive while work continues.", "A deadlock example is two tasks each holding one lock while waiting for the other; consistent lock ordering can prevent the circular wait.", "If a program accesses a page not in RAM, a page fault lets the OS load it; the process resumes after the required data becomes available.", "A cache improves repeated reads, but the OS must keep cached data consistent with writes to the underlying device."] }
    ] },
    { topic: "Python", summary: "A high-level language known for readable syntax, dynamic typing, and a broad standard library.", sections: [
        { heading: "Core syntax and data types", points: ["Indentation defines code blocks; consistent spaces make control flow easier to read.", "Common built-in types include int, float, bool, str, list, tuple, set, and dict.", "Lists are mutable and ordered; tuples are immutable; sets hold unique values; dictionaries map keys to values."] },
        { heading: "Control flow and functions", points: ["Use if/elif/else for branching and for or while loops for repetition.", "Functions package reusable behavior; parameters, return values, and clear names make them easier to test.", "Use exceptions for error handling and keep try blocks focused on operations that can fail."] },
        { heading: "Modules, files, and objects", points: ["A module is a Python file that can define functions, classes, and constants; imports make names available to another module.", "Use with open(...) to read or write files so they close even if an error occurs.", "Classes bundle state and behavior; __init__ initializes instances, and self refers to the current instance."] },
        { heading: "Practical habits", points: ["Use a virtual environment to isolate project dependencies and record required packages for reproducible setup.", "Prefer clear, idiomatic code and small functions over clever one-line expressions.", "Check whether a value is None with is None; use == for value equality and avoid relying on truthiness when empty values have meaning."] },
        { heading: "Iteration, mutability, and reliability", points: ["An iterable can produce values one at a time; generators yield values lazily and can avoid building a large list in memory.", "Lists and dictionaries are mutable; assignment creates another reference to the same object, while copying creates a separate container.", "Use comprehensions for simple transformations and loops when the logic needs several steps or clearer error handling.", "Keep dependencies isolated, handle expected exceptions explicitly, and write small tests for behavior that is easy to break."] },
        { heading: "Small examples", points: ["Use a list when order and duplicates matter, a set when membership or uniqueness matters, and a dictionary when values are looked up by key.", "Use with open('file.txt', encoding='utf-8') as file to read text and reliably close the file afterward.", "A generator expression can process a large input one item at a time instead of storing every result at once.", "Avoid mutable default arguments such as def add_item(item, items=[]); use None and create a new list inside the function instead."] }
    ] },
    { topic: "Software Engineering", summary: "Applying repeatable methods to plan, build, test, deliver, and maintain software with a team.", sections: [
        { heading: "Requirements and design", points: ["Functional requirements describe what the system should do; quality requirements describe needs such as reliability, performance, security, or accessibility.", "Clarify users, goals, constraints, and acceptance criteria before implementation.", "Design decomposes a system into components with clear responsibilities and interfaces."] },
        { heading: "Development lifecycle", points: ["A lifecycle commonly includes discovery, planning, design, implementation, testing, release, and maintenance; teams may repeat these steps iteratively.", "Small, reviewable changes make feedback and debugging easier.", "Document important decisions, setup steps, and known limitations so others can work with the project."] },
        { heading: "Testing and quality", points: ["Unit tests check small pieces; integration tests check components together; end-to-end tests exercise important user flows.", "Review changes for correctness, readability, security, and maintainability.", "Automated checks catch regressions, but usability and exploratory review still matter."] },
        { heading: "Teamwork and version control", points: ["Version control records changes and supports branches, code review, collaboration, and recovery.", "Use clear commits and meaningful pull requests so teammates can understand why a change was made.", "When discussing a project, explain the user problem, your decisions, tradeoffs, testing, and what you would improve next."] },
        { heading: "Delivery and maintenance", points: ["Continuous integration runs builds and checks automatically; continuous delivery keeps software ready to release through a repeatable pipeline.", "Deployment plans should include configuration, monitoring, rollback, and safe handling of secrets.", "Logs, metrics, and traces help teams understand failures and performance after release.", "Software engineering continues after launch: fix defects, update dependencies, respond to user needs, and retire features safely."] },
        { heading: "Putting the process together", points: ["A small feature can move from a user story and acceptance criteria to design, implementation, tests, review, deployment, and monitoring.", "A failed check should stop a release until the cause is understood; a rollback plan limits user impact if a new release fails in production.", "Use code review to share context and catch issues early, not just to enforce formatting preferences.", "When presenting a project, explain your contribution, constraints, alternatives considered, and how you knew the change worked."] }
    ] },
    { topic: "SQL", summary: "A language for defining, querying, and changing data in relational databases.", sections: [
        { heading: "Query structure", points: ["SELECT chooses columns; FROM identifies tables; WHERE filters rows before grouping.", "GROUP BY forms groups for aggregate functions such as COUNT, SUM, AVG, MIN, and MAX; HAVING filters groups.", "ORDER BY sorts results. LIMIT or the database’s equivalent restricts how many rows are returned."] },
        { heading: "Joins and relationships", points: ["INNER JOIN returns matching rows from both sides; LEFT JOIN keeps all left rows and fills missing right-side values with NULL.", "Join on related keys and check whether duplicate matches may multiply rows.", "A primary key identifies a row; a foreign key represents a relationship to another table."] },
        { heading: "Data changes and NULL", points: ["INSERT adds rows, UPDATE changes rows, and DELETE removes rows; use a WHERE clause carefully with UPDATE and DELETE.", "DDL defines structures, for example CREATE TABLE; DML reads or changes rows, for example SELECT, INSERT, UPDATE, and DELETE.", "NULL means unknown or missing, not zero or an empty string. Use IS NULL or IS NOT NULL rather than = NULL."] },
        { heading: "Transactions and performance", points: ["Transactions group related changes; COMMIT saves them and ROLLBACK cancels uncommitted work.", "Indexes can speed up filtering and joining but add storage and write overhead.", "Use parameterized queries for user-supplied values; they help prevent SQL injection and handle data safely."] },
        { heading: "Subqueries and common checks", points: ["A subquery is a query inside another query; a common table expression (WITH) can name an intermediate result for clarity.", "Window functions calculate across related rows without collapsing them into one row per group; specify PARTITION BY and ORDER BY deliberately.", "DELETE removes selected rows, TRUNCATE removes all rows from a table in a database-specific way, and DROP removes the database object itself.", "Check joins for duplicate rows, use parentheses when combining AND and OR conditions, and inspect NULL behavior in filters and aggregates."] },
        { heading: "Query examples to explain", points: ["To find customers with at least three orders, join customers to orders, group by customer, then use HAVING COUNT(order_id) >= 3.", "To keep every customer even if they have no orders, use a LEFT JOIN and count a non-null order key to distinguish matches.", "A window function such as ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) ranks rows without collapsing each department to one row.", "Explain a query in stages: which rows are read, how they are filtered or joined, how groups are formed, and how results are sorted."] }
    ] }
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
        description: TOPIC_INFO[name]?.[1] || "Interview questions and concepts",
        iconColor: TOPIC_INFO[name]?.[2] || "violet"
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
    const topbarLead = page === "session"
        ? '<span class="topbar-status">Practice session in progress</span>'
        : page === "start"
            ? '<span class="topbar-status">Choose a topic and start practicing</span>'
            : '<a class="button topbar-action" href="start-practice.html">＋ Start practice</a>';
    app.innerHTML = `
        <a class="skip-link" href="#main-content">Skip to content</a>
        <div class="app-shell">
            <aside class="sidebar" aria-label="Main navigation">
                <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">✦</span><span>PrepAI</span></a>
                <p class="nav-label">YOUR WORKSPACE</p>
                <nav class="nav">${renderNavigation()}</nav>
            </aside>
            <main class="main" id="main-content">
                <header class="topbar">
                    ${topbarLead}
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
    document.getElementById("sign-out").addEventListener("click", () => {
        localStorage.removeItem(GOOGLE_USER_KEY);
        location.replace("login.html");
    });
}

function renderHeader(eyebrow, title, description, action = "") {
    return `<section class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="page-description">${description}</p></div>${action}</section>`;
}

function renderStat(icon, label, value, caption, color = "purple") {
    return `<article class="card stat-card stat-card-${color}"><span class="stat-icon ${color}" aria-hidden="true">${icon}</span><div><p class="stat-label">${label}</p><p class="stat-value">${value}</p><p class="stat-caption">${caption}</p></div></article>`;
}

function renderEmpty(message, link = "start-practice.html", label = "Start practicing") {
    return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">✦</span><p>${message}</p><a class="button" href="${link}">${label}</a></div>`;
}

function renderTopicCards(list = getTopics(), selectedTopics = []) {
    if (!list.length) return renderEmpty("There are no topics in the question bank yet.", "question-bank.html", "Browse question bank");
    return `<div class="topic-grid">${list.map(topic => `
        <label class="topic-card topic-select-card">
            <input type="checkbox" name="practice-topic" value="${escapeHTML(topic.name)}" ${selectedTopics.includes(topic.name) ? "checked" : ""} />
            <span class="topic-icon topic-icon-${topic.iconColor}" aria-hidden="true">${topic.icon}</span><span class="topic-card-copy"><strong>${escapeHTML(topic.name)}</strong><span>${escapeHTML(topic.description)}</span></span>
            <span class="topic-card-footer"><span>${topic.count} questions</span><span>Select topic</span></span>
        </label>`).join("")}</div>`;
}

function renderSessionList(sessions = getHistory().slice(0, 6)) {
    if (!sessions.length) return renderEmpty("Your completed sessions will appear here after your first practice.");
    return `<div class="session-list">${sessions.map(session => {
        const answers = session.answers.filter(answer => Number.isFinite(Number(answer.score)));
        const average = answers.length ? Math.round(answers.reduce((sum, answer) => sum + Number(answer.score), 0) / answers.length) : 0;
        const date = session.date && Number.isFinite(Date.parse(session.date)) ? new Date(session.date).toLocaleDateString() : "Saved session";
        const sessionTitle = session.role ? `${session.role} interview · ${session.topic || "Role practice"}` : `${session.topic || "Practice"} · ${session.difficulty || ""}`;
        return `<article class="session-row"><span class="session-icon" aria-hidden="true">${session.role ? "✦" : "▤"}</span><div class="session-copy"><strong>${escapeHTML(sessionTitle)}</strong><span>${answers.length} answered · ${average}% average estimate</span></div><time>${escapeHTML(date)}</time></article>`;
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

function getDashboardOverview(days = dashboardRange) {
    const now = new Date();
    const cutoff = days === 0 ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
    const sessions = getHistory().filter(session => {
        if (!cutoff) return true;
        const date = Date.parse(session.date || "");
        return Number.isFinite(date) && date >= cutoff.getTime() && date <= now.getTime();
    });
    const allAnswers = sessions.flatMap(session => session.answers);
    const answered = allAnswers.filter(answer => !answer.skipped && answer.score !== null && answer.score !== undefined && Number.isFinite(Number(answer.score)));
    const scoreTotal = answered.reduce((sum, answer) => sum + Number(answer.score), 0);
    const topics = new Map();
    answered.forEach(answer => {
        const name = answer.topic || "Other";
        const current = topics.get(name) || { total: 0, count: 0 };
        current.total += Number(answer.score);
        current.count += 1;
        topics.set(name, current);
    });
    return {
        practiced: allAnswers.length,
        correct: answered.filter(answer => Number(answer.score) >= 60).length,
        incorrect: answered.filter(answer => Number(answer.score) < 60).length,
        accuracy: answered.length ? Math.round(scoreTotal / answered.length) : 0,
        topics: [...topics.entries()]
            .map(([name, values]) => ({ name, score: Math.round(values.total / values.count), count: values.count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
            .slice(0, 7)
    };
}

function renderTopicChart(items) {
    if (!items.length) return `<div class="overview-chart-empty">Your topic chart will appear after you complete a practice session in this time period.</div>`;
    return `<div class="overview-chart" role="list" aria-label="Topic-wise average answer score estimates">
        <div class="chart-axis" aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
        <div class="chart-columns">${items.map(item => `<div class="chart-column" role="listitem" aria-label="${escapeHTML(item.name)}: ${item.score}% average score estimate across ${item.count} answered questions"><div class="chart-bar-wrap" style="--bar-height:${Math.max(3, item.score)}%"><span class="chart-value">${item.score}%</span><span class="chart-bar"></span></div><span class="chart-topic" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</span></div>`).join("")}</div>
    </div>`;
}

function renderProgressOverview() {
    const overview = getDashboardOverview();
    const rangeLabel = dashboardRange === 0 ? "All time" : `Last ${dashboardRange} days`;
    return `<article class="card progress-overview">
        <div class="section-heading overview-heading"><div><p class="eyebrow">YOUR PROGRESS</p><h2>Progress overview</h2></div>
            <label class="sr-only" for="dashboard-range">Progress time period</label><select class="overview-range" id="dashboard-range"><option value="7" ${dashboardRange === 7 ? "selected" : ""}>Last 7 days</option><option value="30" ${dashboardRange === 30 ? "selected" : ""}>Last 30 days</option><option value="90" ${dashboardRange === 90 ? "selected" : ""}>Last 90 days</option><option value="0" ${dashboardRange === 0 ? "selected" : ""}>All time</option></select>
        </div>
        <div class="overview-metrics">
            ${renderStat("▤", "Questions practiced", overview.practiced, rangeLabel, "blue")}
            ${renderStat("✓", "Strong answers", overview.correct, "Score estimate 60% or higher", "green")}
            ${renderStat("×", "Needs practice", overview.incorrect, "Score estimate below 60%", "red")}
            ${renderStat("◉", "Average score", `${overview.accuracy}%`, "Estimated across answered questions", "purple")}
        </div>
        <div class="chart-heading"><h3>Topic-wise performance</h3><span>Average answer score estimate</span></div>
        ${renderTopicChart(overview.topics)}
    </article>`;
}

function getSelectedPreparationGroup() {
    const key = localStorage.getItem(PREPARATION_GROUP_KEY);
    return Object.hasOwn(PREPARATION_GROUPS, key) ? key : "";
}

function renderPreparationGroupFilter() {
    const selected = getSelectedPreparationGroup();
    const selectedGroup = PREPARATION_GROUPS[selected];
    return `<section class="audience-filter" aria-labelledby="audience-filter-title">
        <div class="section-heading"><div><p class="eyebrow">PERSONALIZE YOUR PREPARATION</p><h2 id="audience-filter-title">Who are you preparing as?</h2><p class="audience-intro">Choose a group to open a curated topic plan you can practice from.</p></div></div>
        <div class="audience-grid" role="group" aria-label="Choose your preparation group">${Object.entries(PREPARATION_GROUPS).map(([key, group]) => `
            <a class="audience-option ${selected === key ? "selected" : ""}" href="prepare.html?group=${key}" data-preparation-group="${key}" ${selected === key ? 'aria-current="true"' : ""}>
                <span class="audience-icon" aria-hidden="true">${group.icon}</span><span class="audience-copy"><strong>${group.label}</strong><span>${group.detail}</span></span>
            </a>`).join("")}
        </div>
        ${selectedGroup ? `<p class="audience-selected-note">Selected: <strong>${selectedGroup.label}</strong></p>` : ""}
    </section>`;
}

function renderDashboardFeatures() {
    const selected = getSelectedPreparationGroup();
    const group = PREPARATION_GROUPS[selected];
    const focusFeature = group
        ? [group.icon, "Your topic plan", `Open suggested topics for ${group.label.toLowerCase()} and choose what to practice.`, `prepare.html?group=${selected}`, "View topics"]
        : ["▶", "Adaptive practice", "Practice with difficulty that can adjust as you answer.", "start-practice.html", "Start a session"];
    const features = [
        focusFeature,
        ["✦", "AI Mock Interview", "Practice role-focused questions with scoring and adaptive difficulty.", "mock-interview.html", "Choose a role"],
        ["✦", "Progress report", "Review recent score estimates and topic performance.", "performance-report.html", "View report"],
        ["↗", "Find skill gaps", "Use topic trends to decide what to practice next.", "skill-gaps.html", "Review insights"]
    ];
    return `<section class="dashboard-features" aria-labelledby="dashboard-features-title">
        <div class="section-heading"><div><p class="eyebrow">PREPAI TOOLS</p><h2 id="dashboard-features-title">Practice with a clear next step</h2></div></div>
        <div class="feature-grid">${features.map(([icon, title, description, href, action, theme = ""]) => `
            <a class="feature-card ${theme ? `feature-card-${theme}` : ""}" href="${href}">
                <span class="feature-icon ${theme ? `feature-icon-${theme}` : ""}" aria-hidden="true">${icon}</span>
                <span class="feature-copy"><strong>${title}</strong><span>${description}</span><b>${action} →</b></span>
            </a>`).join("")}
        </div>
    </section>`;
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
    return `${renderHeader("ADAPTIVE INTERVIEW PREPARATION", `Welcome${name ? `, ${escapeHTML(name)}` : " back"}!`, "Personalized practice, adaptive questions, and clear feedback in one workspace.")}
        ${renderPreparationGroupFilter()}
        ${renderDashboardFeatures()}
        <section class="dashboard-grid">
            <div class="stack">
                ${renderProgressOverview()}
            </div>
            <div class="stack">
                <article class="card progress-summary"><p class="eyebrow">YOUR PROGRESS</p><div class="score-ring">${stats.average}%</div><h2>${stats.questions ? "Keep your momentum going" : "Your first session starts here"}</h2><p>${stats.questions ? `${stats.questions} questions answered across ${stats.sessions} saved session(s).` : "Your progress will be based on sessions you complete."}</p><a class="button button-secondary" href="skill-gaps.html">Review topic trends</a></article>
                <article class="card"><div class="section-heading"><div><p class="eyebrow">RECENT</p><h2>Practice sessions</h2></div><a class="text-link" href="performance-report.html">View report →</a></div>${renderSessionList(history.slice(0, 4))}</article>
            </div>
        </section>`;
}

function renderStart() {
    const topics = getTopics();
    const params = new URLSearchParams(location.search);
    const requested = params.get("topic");
    const requestedDifficulty = params.get("difficulty");
    const firstTopic = topics.some(topic => topic.name === requested) ? requested : topics[0]?.name || "";
    const difficulties = getDifficulties(firstTopic);
    const defaultDifficulty = difficulties.find(level => level.dataValue === requestedDifficulty)?.value
        || (difficulties.some(level => level.value === "Intermediate") ? "Intermediate" : difficulties[0]?.value || "");
    return `${renderHeader("PRACTICE SETUP", "Plan a practice session", "Choose from the topics and difficulty levels available in the question bank.")}
        <section class="setup-grid"><article class="card"><form id="start-form" class="form-stack">
            <div class="field"><label for="topic-select">Topic</label><select id="topic-select" required>${topics.map(topic => `<option value="${escapeHTML(topic.name)}" ${topic.name === firstTopic ? "selected" : ""}>${escapeHTML(topic.name)} · ${topic.count} questions</option>`).join("")}</select></div>
            <div class="field"><label for="difficulty-select">Difficulty</label><select id="difficulty-select" required>${difficulties.map(level => `<option value="${level.value}" ${level.value === defaultDifficulty ? "selected" : ""}>${level.value}</option>`).join("")}</select><small>Difficulty names map to the dataset’s Easy, Medium, and Hard labels.</small></div>
            <div class="field"><label for="question-type">Question format</label><select id="question-type"><option value="descriptive">Descriptive answers</option><option value="mcq">Multiple choice (MCQ)</option></select><small>Choose how you want to answer. MCQ choices are assembled from the question bank.</small></div>
            <div class="field"><label for="count-select">Questions in this session</label><select id="count-select"><option value="5">5 questions</option><option value="10">10 questions</option><option value="20">20 questions</option></select></div>
            <div id="available-count" class="notice" aria-live="polite"></div>
            <button class="button" type="submit">Start practice →</button>
        </form></article>
        <aside class="card setup-aside"><span class="setup-illustration" aria-hidden="true">✦</span><p class="eyebrow">A FOCUSED SESSION</p><h2>Practice, reflect, improve.</h2><p>Answer in your own words. You can move between questions, and your work is kept while this browser tab is open.</p><a class="text-link" href="question-bank.html">Explore the question bank →</a></aside></section>`;
}

function renderMockTopicOptions(roleKey = "software") {
    const role = MOCK_INTERVIEW_ROLES[roleKey] || MOCK_INTERVIEW_ROLES.software;
    const topics = roleKey === "custom" ? getTopics().map(topic => topic.name) : role.topics;
    const availableTopics = new Map(getTopics().map(topic => [topic.name, topic]));
    const topicList = topics.map(name => availableTopics.get(name)).filter(Boolean);
    return topicList.map(topic => `<label class="mock-topic-option"><input type="checkbox" name="mock-topic" value="${escapeHTML(topic.name)}" checked /><span><strong>${escapeHTML(topic.name)}</strong><small>${topic.count} questions</small></span></label>`).join("");
}

function renderMockInterview() {
    return `${renderHeader("ROLE-BASED PRACTICE", "AI Mock Interview", "Choose a target role and focus topics. PrepAI will ask questions from the selected areas, score your answers, and adjust difficulty as you go.")}
        <section class="mock-interview-layout"><article class="card"><form id="mock-interview-form" class="form-stack">
            <div class="field"><label for="mock-role">Target job role</label><select id="mock-role" required>${Object.entries(MOCK_INTERVIEW_ROLES).map(([key, role]) => `<option value="${key}" ${key === "software" ? "selected" : ""}>${escapeHTML(role.label)}</option>`).join("")}</select><small>Role suggestions use topics currently available in PrepAI’s question bank.</small></div>
            <div class="field" id="custom-role-field" hidden><label for="custom-role">Enter your target role</label><input id="custom-role" maxlength="80" placeholder="For example, Backend Developer" /></div>
            <fieldset class="mock-topic-field"><legend>Interview focus topics</legend><p class="field-help">Choose one or more areas for this interview. You can remove topics that do not fit your target role.</p><div id="mock-topic-options" class="mock-topic-options">${renderMockTopicOptions()}</div></fieldset>
            <div class="mock-session-options"><div class="field"><label for="mock-difficulty">Starting difficulty</label><select id="mock-difficulty"><option value="Easy">Beginner</option><option value="Medium" selected>Intermediate</option><option value="Hard">Advanced</option></select></div><div class="field"><label for="mock-count">Interview length</label><select id="mock-count"><option value="5">5 questions</option><option value="10">10 questions</option><option value="20">20 questions</option></select></div></div>
            <p id="mock-status" class="field-help" aria-live="polite"></p><button class="button" id="mock-start" type="submit">Start mock interview →</button>
        </form></article>
        <aside class="card mock-interview-aside"><span class="setup-illustration" aria-hidden="true">✦</span><p class="eyebrow">HOW IT WORKS</p><h2>Practice like an interview</h2><ul><li>The interviewer asks one question at a time from your selected role topics.</li><li>Your answer receives a score estimate and topic-specific review.</li><li>Question difficulty can adapt to your recent answers.</li><li>Your completed interview appears in your practice report.</li></ul><p class="mock-interview-note">Scoring uses the configured PrepAI model when available; otherwise it uses the app’s local keyword estimate.</p></aside></section>`;
}

function renderPrepare() {
    const params = new URLSearchParams(location.search);
    const requestedGroup = params.get("group");
    const groupKey = Object.hasOwn(PREPARATION_GROUPS, requestedGroup) ? requestedGroup : getSelectedPreparationGroup();
    const group = PREPARATION_GROUPS[groupKey];
    if (!group) {
        return `${renderHeader("PERSONALIZED PREPARATION", "Choose your preparation group", "Pick a group on the dashboard to see a set of suggested topics.", '<a class="button button-secondary" href="index.html">← Dashboard</a>')}
            <article class="card">${renderEmpty("Choose undergraduate, graduate, professional, or educator on the dashboard to build your topic plan.", "index.html", "Choose a group")}</article>`;
    }

    const availableTopics = new Map(getTopics().map(topic => [topic.name, topic]));
    const recommendedTopics = group.topics.map(name => availableTopics.get(name)).filter(Boolean);
    const difficultyNames = { Easy: "Beginner", Medium: "Intermediate", Hard: "Advanced" };
    return `${renderHeader("PERSONALIZED TOPIC PLAN", `${escapeHTML(group.label)} prep plan`, `${escapeHTML(group.description)} Suggested starting level: ${difficultyNames[group.recommendedDifficulty]}. Choose one or more topics to build your session.`, '<a class="button button-secondary" href="index.html">← Dashboard</a>')}
        <form id="prep-session-form" class="prep-session-form">
        <div class="section-heading prep-selection-heading"><div><p class="eyebrow">BUILD A PRACTICE SESSION</p><h2>Select one or more topics</h2><p class="body-copy">Choose a single topic or combine several. Questions will come only from your selections.</p></div></div>
        <section class="prep-topic-grid" aria-label="Suggested topics for ${escapeHTML(group.label)}">${recommendedTopics.map(topic => {
            const levels = getDifficulties(topic.name);
            const icon = TOPIC_INFO[topic.name]?.[0] || "▤";
            const iconColor = TOPIC_INFO[topic.name]?.[2] || "violet";
            return `<article class="card prep-topic-card">
                <label class="prep-topic-select"><input type="checkbox" name="prep-topic" value="${escapeHTML(topic.name)}" /><span class="prep-topic-heading"><span class="topic-icon topic-icon-${iconColor}" aria-hidden="true">${icon}</span><span><strong>${escapeHTML(topic.name)}</strong><small>${topic.count} questions in the bank</small></span></span></label>
                <p>${escapeHTML(topic.description)}</p>
                <span class="prep-topic-availability">Available levels: ${levels.map(level => level.value).join(" · ") || "No levels listed"}</span>
            </article>`;
        }).join("")}</section>
        <section class="card prep-session-options"><div class="field"><label for="prep-start-level">Starting difficulty</label><select id="prep-start-level"><option value="Easy" ${group.recommendedDifficulty === "Easy" ? "selected" : ""}>Beginner${group.recommendedDifficulty === "Easy" ? " (recommended)" : ""}</option><option value="Medium" ${group.recommendedDifficulty === "Medium" ? "selected" : ""}>Intermediate${group.recommendedDifficulty === "Medium" ? " (recommended)" : ""}</option><option value="Hard" ${group.recommendedDifficulty === "Hard" ? "selected" : ""}>Advanced${group.recommendedDifficulty === "Hard" ? " (recommended)" : ""}</option></select><small>Questions may adjust in difficulty as you answer.</small></div>
            <div class="field"><label for="prep-question-type">Question format</label><select id="prep-question-type"><option value="descriptive">Descriptive answers</option><option value="mcq">Multiple choice (MCQ)</option></select><small>MCQ choices are assembled from the question bank.</small></div>
            <div class="field"><label for="prep-question-count">Questions in this session</label><select id="prep-question-count"><option value="5">5 questions</option><option value="10">10 questions</option><option value="20">20 questions</option></select></div>
            <div class="prep-start-actions"><p id="prep-selection-status" class="prep-plan-note" aria-live="polite">Select at least one topic to begin.</p><button class="button" id="prep-start-button" type="submit" disabled>Start selected topics →</button></div>
        </section></form>
        <p class="prep-plan-note">Topic counts and levels come from the current question bank. The session only draws questions from the topics you select.</p>`;
}

function renderTopics() {
    return `${renderHeader("QUESTION BANK", "Practice by topic", "Select one or more topics to create a combined practice session.")}
        <div class="filter-pills" id="topic-filters"><button class="filter-pill active" data-topic-filter="all">All topics</button><button class="filter-pill" data-topic-filter="programming">Programming</button><button class="filter-pill" data-topic-filter="systems">Systems</button><button class="filter-pill" data-topic-filter="data">Data and algorithms</button></div>
        <form id="topic-practice-form" class="card topic-practice-controls">
            <div class="field"><label for="topics-difficulty">Starting difficulty</label><select id="topics-difficulty"><option value="Beginner">Beginner</option><option value="Intermediate" selected>Intermediate</option><option value="Advanced">Advanced</option></select></div>
            <div class="field"><label for="topics-format">Question format</label><select id="topics-format"><option value="descriptive">Descriptive answers</option><option value="mcq">Multiple choice (MCQ)</option></select></div>
            <div class="field"><label for="topics-count">Questions</label><select id="topics-count"><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></div>
            <p class="topic-selection-status" id="topic-selection-status" aria-live="polite">Select one or more topics below.</p>
            <button class="button" id="topic-practice-start" type="submit" disabled>Practice selected topics →</button>
        </form>
        <div id="topic-results">${renderTopicCards()}</div>`;
}

function renderNotes() {
    return `${renderHeader("STUDY NOTES", "Notes", "Choose a topic to open its complete guide with clear explanations and important points.", '<button class="button button-secondary" id="download-notes" type="button">↓ Download all notes</button>')}
        <section class="card notes-catalog"><div class="section-heading"><div><p class="eyebrow">TOPIC DIRECTORY</p><h2>Choose a topic to study</h2></div><label class="sr-only" for="notes-search">Search topics and notes</label><input class="compact-input" id="notes-search" placeholder="Search topics or key points..." /></div>
            <p class="notes-result-count" id="notes-result-count" aria-live="polite"></p><div class="notes-topic-grid" id="notes-topic-grid">${renderNotesCatalog(NOTES)}</div></section>`;
}

function renderNotesCatalog(notes) {
    if (!notes.length) return `<p class="empty-inline">No topics match your search.</p>`;
    return notes.map(note => `<a class="notes-topic-card" href="topic-notes.html?topic=${encodeURIComponent(note.topic)}" aria-label="Open full notes for ${escapeHTML(note.topic)}">
        <span class="notes-topic-icon topic-icon-${TOPIC_INFO[note.topic]?.[2] || "violet"}" aria-hidden="true">${TOPIC_INFO[note.topic]?.[0] || "▤"}</span>
        <span class="notes-topic-copy"><strong>${escapeHTML(note.topic)}</strong></span>
    </a>`).join("");
}

function renderNoteSections(note) {
    return `<div class="topic-note-sections">${note.sections.map(section => `<section class="topic-note-section"><h4>${escapeHTML(section.heading)}</h4><ul>${section.points.map(point => `<li>${escapeHTML(point)}</li>`).join("")}</ul></section>`).join("")}</div>`;
}

function briefNoteText(value, limit = 320) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= limit) return text;
    const end = text.lastIndexOf(" ", limit - 1);
    return `${text.slice(0, end > limit * 0.7 ? end : limit).trim()}…`;
}

function renderQuestionBankSubtopics(topic) {
    const subtopics = new Map();
    questionBank.filter(question => question.topic === topic).forEach(question => {
        const name = question.subtopic?.trim() || "General questions";
        if (!subtopics.has(name)) subtopics.set(name, []);
        subtopics.get(name).push(question);
    });
    if (!subtopics.size) return "";
    return `<section class="card bank-subtopic-notes"><header class="section-heading"><div><p class="eyebrow">FULL QUESTION BANK COVERAGE</p><h2>Brief notes for every subtopic</h2><p class="body-copy">These quick points follow the subtopics represented in PrepAI’s question bank.</p></div></header>
        <div class="bank-subtopic-grid">${[...subtopics.entries()].map(([name, questions]) => `<article class="bank-subtopic-note"><h3>${escapeHTML(name)}</h3><ul>${questions.slice(0, 2).map(question => `<li><strong>${escapeHTML(briefNoteText(question.question, 150))}</strong><span>${escapeHTML(briefNoteText(question.reference_answer || "Review the question and explain the key concept in your own words."))}</span></li>`).join("")}</ul></article>`).join("")}</div>
    </section>`;
}

function renderShortNotePoints(note) {
    return `<article class="card short-note-summary-card"><p class="eyebrow">QUICK REVIEW</p><p class="topic-note-summary">${escapeHTML(note.summary)}</p><ol>${note.sections.map(section => `<li><strong>${escapeHTML(section.heading)}:</strong> ${escapeHTML(section.points[0] || "Review the core ideas and explain how they apply.")}</li>`).join("")}</ol></article>`;
}

function renderNoteModeLinks(note, selectedMode = "") {
    const topic = encodeURIComponent(note.topic);
    return `<nav class="note-mode-switch" aria-label="Choose note length">
        <a class="button ${selectedMode === "full" ? "" : "button-secondary"}" href="topic-notes.html?topic=${topic}&mode=full" ${selectedMode === "full" ? 'aria-current="page"' : ""}>Full Notes</a>
        <a class="button ${selectedMode === "short" ? "" : "button-secondary"}" href="topic-notes.html?topic=${topic}&mode=short" ${selectedMode === "short" ? 'aria-current="page"' : ""}>Short Notes</a>
        <a class="text-link" href="short-notes.html">← Topic directory</a>
    </nav>`;
}

function renderTopicNotes() {
    const requestedTopic = new URLSearchParams(location.search).get("topic");
    const mode = new URLSearchParams(location.search).get("mode");
    const note = NOTES.find(item => item.topic === requestedTopic);
    if (!note) {
        return `${renderHeader("FULL TOPIC NOTES", "Choose a topic", "Select a topic from the Notes directory to open its guide.", '<a class="button button-secondary" href="short-notes.html">← Topic directory</a>')}
            <article class="card">${renderEmpty("This topic is not in the current notes directory.", "short-notes.html", "Browse topics")}</article>`;
    }
    if (mode !== "short" && mode !== "full") {
        return `${renderHeader("TOPIC NOTES", escapeHTML(note.topic), "Choose the level of detail you want for this topic.", '<a class="button button-secondary" href="short-notes.html">← Topic directory</a>')}
            <section class="note-mode-choices" aria-label="Choose notes format">
                <a class="note-mode-card" href="topic-notes.html?topic=${encodeURIComponent(note.topic)}&mode=full"><span class="note-mode-icon" aria-hidden="true">▤</span><span><strong>Full Notes</strong><small>Detailed explanations, examples, and question-bank subtopics.</small><b>Study in detail →</b></span></a>
                <a class="note-mode-card" href="topic-notes.html?topic=${encodeURIComponent(note.topic)}&mode=short"><span class="note-mode-icon" aria-hidden="true">✦</span><span><strong>Short Notes</strong><small>Key ideas and takeaways for a quick revision.</small><b>Review quickly →</b></span></a>
            </section>`;
    }
    const isShort = mode === "short";
    const heading = isShort ? "SHORT NOTES" : "FULL TOPIC NOTES";
    const description = isShort ? "A quick review of the main points for this topic." : "Detailed explanations, examples, and notes for every question-bank subtopic.";
    return `${renderHeader(heading, escapeHTML(note.topic), description, '<a class="button button-secondary" href="short-notes.html">← Topic directory</a>')}
        ${renderNoteModeLinks(note, mode)}
        ${isShort ? renderShortNotePoints(note) : `<article class="card topic-notes-page"><p class="topic-note-summary">${escapeHTML(note.summary)}</p>${renderNoteSections(note)}</article>${renderQuestionBankSubtopics(note.topic)}`}`;
}

function renderBank() {
    const topics = getTopics();
    const search = new URLSearchParams(location.search).get("search") || "";
    return `${renderHeader("QUESTION LIBRARY", "Question bank", "Search and filter questions from the project dataset.")}
        <article class="card"><div class="filters bank-filters"><div class="field"><label for="bank-topic">Topic</label><select id="bank-topic"><option value="all">All topics</option>${topics.map(topic => `<option value="${escapeHTML(topic.name)}">${escapeHTML(topic.name)}</option>`).join("")}</select></div><div class="field"><label for="bank-difficulty">Difficulty</label><select id="bank-difficulty"><option value="all">All levels</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div><div class="field"><label for="bank-search">Search question text</label><input id="bank-search" value="${escapeHTML(search)}" placeholder="Try a keyword..." /></div></div><p class="result-count" id="bank-count" aria-live="polite"></p><div class="question-list" id="bank-results"></div></article>`;
}

function renderAccuracyTrend() {
    const daily = new Map();
    getHistory().forEach(session => {
        const date = new Date(session.date || "");
        if (!Number.isFinite(date.getTime())) return;
        const key = date.toISOString().slice(0, 10);
        const day = daily.get(key) || { correct: 0, total: 0 };
        session.answers.filter(answer => !answer.skipped && Number.isFinite(Number(answer.score))).forEach(answer => {
            day.total += 1;
            if (Number(answer.score) >= 60) day.correct += 1;
        });
        if (day.total) daily.set(key, day);
    });
    const points = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);
    if (!points.length) return `<div class="report-chart-empty">Complete practice sessions to see your accuracy trend.</div>`;
    const width = 600, height = 220, left = 42, right = 18, top = 20, bottom = 42;
    const chartWidth = width - left - right, chartHeight = height - top - bottom;
    const coords = points.map(([date, result], index) => ({
        x: points.length === 1 ? left + chartWidth / 2 : left + index * chartWidth / (points.length - 1),
        y: top + chartHeight * (1 - result.correct / result.total),
        date,
        accuracy: Math.round(result.correct / result.total * 100)
    }));
    const line = coords.map(point => `${point.x},${point.y}`).join(" ");
    return `<svg class="accuracy-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Accuracy trend over recent practice days">
        ${[0, 25, 50, 75, 100].map(value => { const y = top + chartHeight * (1 - value / 100); return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="trend-gridline"/><text x="${left - 8}" y="${y + 4}" text-anchor="end" class="trend-axis-label">${value}%</text>`; }).join("")}
        <polyline points="${line}" class="trend-line"/>${coords.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" class="trend-point"><title>${point.accuracy}% on ${escapeHTML(point.date)}</title></circle><text x="${point.x}" y="${height - 12}" text-anchor="middle" class="trend-axis-label">${escapeHTML(point.date.slice(5))}</text>`).join("")}
    </svg>`;
}

function renderTopicDistribution(answers) {
    const counts = new Map();
    answers.forEach(answer => counts.set(answer.topic || "Other", (counts.get(answer.topic || "Other") || 0) + 1));
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!entries.length) return `<div class="report-chart-empty">Your topic breakdown will appear after you complete a practice session.</div>`;
    const palette = ["#5969e8", "#37a8d8", "#f1a142", "#ed6b78", "#49b994", "#9a76df", "#8290a8"];
    let start = 0;
    const stops = entries.map(([, count], index) => {
        const end = start + count / answers.length * 100;
        const segment = `${palette[index % palette.length]} ${start}% ${end}%`;
        start = end;
        return segment;
    });
    return `<div class="topic-distribution-layout"><div class="topic-donut" style="--topic-donut: conic-gradient(${stops.join(", ")})" role="img" aria-label="Distribution of ${answers.length} answered questions by topic"><span>${answers.length}<small>answered</small></span></div><ul class="topic-distribution-legend">${entries.map(([topic, count], index) => `<li><span class="topic-legend-name"><i style="--legend-color:${palette[index % palette.length]}"></i>${escapeHTML(topic)}</span><strong>${Math.round(count / answers.length * 100)}%</strong></li>`).join("")}</ul></div>`;
}

function renderReport() {
    const answers = getHistory().flatMap(session => session.answers);
    const answered = answers.filter(answer => !answer.skipped && answer.score !== null && answer.score !== undefined && Number.isFinite(Number(answer.score)));
    const correct = answered.filter(answer => Number(answer.score) >= 60).length;
    const incorrect = answered.length - correct;
    const accuracy = answered.length ? Math.round(correct / answered.length * 100) : 0;
    return `${renderHeader("YOUR HISTORY", "Performance report", "Review results saved in this browser.", '<button class="button button-secondary" id="export-report" type="button">↓ Export report</button>')}
        <section class="stats-grid report-summary-grid">${renderStat("▤", "Questions answered", answered.length, "Across your saved sessions", "blue")}${renderStat("✓", "Correct", correct, "Score estimate of 60% or higher", "green")}${renderStat("×", "Incorrect", incorrect, "Score estimate below 60%", "red")}${renderStat("◉", "Accuracy", `${accuracy}%`, "Correct answers ÷ answered questions", "purple")}</section>
        <section class="report-grid report-visuals"><article class="card"><div class="section-heading"><div><p class="eyebrow">ACCURACY TREND</p><h2>Recent practice</h2></div></div>${renderAccuracyTrend()}</article><article class="card"><div class="section-heading"><div><p class="eyebrow">TOPIC DISTRIBUTION</p><h2>Questions by topic</h2></div></div>${renderTopicDistribution(answered)}</article></section>
        <section class="report-grid"><article class="card"><div class="section-heading"><div><p class="eyebrow">TOPIC PERFORMANCE</p><h2>Average score estimate</h2></div></div>${getTopicPerformance().length ? renderProgressBars(getTopicPerformance(), true) : renderEmpty("No score history yet. Finish a session to build your report.")}</article><article class="card"><p class="eyebrow">HOW TO READ THIS</p><h2>Scores are estimates</h2><p class="body-copy">Scores are estimates based on answer coverage and model predictions. Review answers and use your judgment, especially for technical paraphrases.</p></article></section>
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
    const isMock = sessionStorage.getItem(STORAGE.mode) === "mock";
    const role = sessionStorage.getItem(STORAGE.role) || "";
    const isMcq = sessionStorage.getItem(STORAGE.questionType) === "mcq";
    return `${renderHeader(isMock ? "AI MOCK INTERVIEW" : "FOCUSED PRACTICE", isMock ? `${escapeHTML(role)} interview` : "Practice session", isMock ? "Answer as you would in an interview. PrepAI will focus on topics that need work, keep your other topics in rotation, and raise their difficulty." : `${isMcq ? "Choose the best option for each question." : "Write what you know."} PrepAI uses your recent results to revisit topics that need work, while keeping your other selected topics in rotation at a higher difficulty. You can go back and change submitted answers before finishing.`)}
        <section class="session-panel"><article class="card session-card"><div class="session-topline"><span class="badge" id="session-label"></span><span id="session-position" class="muted"></span></div><div class="progress-track"><span id="session-progress-bar"></span></div><p class="eyebrow question-number" id="question-meta"></p><h2 class="session-question" id="question-text"></h2><form id="answer-form"><fieldset id="mcq-options" class="mcq-options" hidden><legend>Select one answer</legend></fieldset><div class="field" id="descriptive-answer-field"><label for="answer-input">Your answer</label><textarea id="answer-input" rows="8" placeholder="Explain your answer in your own words..."></textarea><small id="answer-hint">Your answer stays in this browser session.</small></div><div id="answer-status" class="notice" aria-live="polite"></div><div class="session-controls"><button class="button button-secondary" id="previous-question" type="button">← Previous</button><div><button class="button button-secondary" id="skip-question" type="button">Skip</button> <button class="button" id="submit-answer" type="submit">Save and continue →</button></div></div></form></article></section>`;
}

function renderFeedback() {
    const feedback = readJSON(sessionStorage, STORAGE.lastFeedback, null);
    if (!feedback || !Array.isArray(feedback.answers) || !feedback.answers.length) {
        return `${renderHeader("SESSION REVIEW", "Practice feedback", "Complete a practice session to see answer feedback.")}
            <article class="card">${renderEmpty("No completed session is available in this browser tab.")}</article>`;
    }
    const answered = feedback.answers.filter(answer => !answer.skipped);
    const average = answered.length ? Math.round(answered.reduce((sum, answer) => sum + Number(answer.score || 0), 0) / answered.length) : 0;
    const correctCount = answered.filter(answer => Number(answer.score) >= 60).length;
    const incorrectCount = answered.length - correctCount;
    const isMock = feedback.mode === "mock";
    const title = isMock ? `${escapeHTML(feedback.role || "Role-based")} interview review` : "Practice feedback";
    const action = isMock ? '<a class="button" href="mock-interview.html">Start another interview</a>' : '<a class="button" href="start-practice.html">Practice again</a>';
    return `${renderHeader(isMock ? "AI MOCK INTERVIEW REVIEW" : "SESSION REVIEW", title, `${escapeHTML(feedback.topic)} · ${escapeHTML(feedback.difficulty)} · ${new Date(feedback.date).toLocaleString()}`, action)}
        <section class="stats-grid">${renderStat("◉", "Average estimate", `${average}%`, `${answered.length} answered question${answered.length === 1 ? "" : "s"}`, "purple")}${renderStat("✓", "Correct", correctCount, "Score of 60% or higher", "green")}${renderStat("×", "Incorrect", incorrectCount, "Score below 60%", "red")}${renderStat("↷", "Skipped", feedback.answers.length - answered.length, "Not included in correct/incorrect", "amber")}</section>
        <article class="card"><div class="section-heading"><div><p class="eyebrow">ANSWER BY ANSWER</p><h2>Review your responses</h2></div></div><div class="feedback-list">${feedback.answers.map((answer, index) => `
            <section class="feedback-item"><p class="eyebrow">QUESTION ${String(index + 1).padStart(2, "0")} · ${escapeHTML(answer.topic || "General")}</p><h3>${escapeHTML(answer.question)}</h3><p><strong>Question difficulty</strong><br />${escapeHTML(answer.difficulty || "Unspecified")}${answer.recommendedDifficulty ? ` · next question recommendation: ${escapeHTML(answer.recommendedDifficulty)}` : ""}</p><p><strong>Your answer</strong><br />${escapeHTML(answer.answer || "Skipped")}</p><p><strong>Reference answer</strong><br />${escapeHTML(answer.referenceAnswer || "No reference answer is available.")}</p>${answer.concepts?.length ? `<p><strong>Key concepts</strong><br />${answer.concepts.map(concept => `<span class="concept-chip ${answer.matchedConcepts?.includes(concept) ? "matched" : "missing"}">${escapeHTML(concept)}</span>`).join(" ")}</p>` : ""}<span class="badge ${answer.method === "ml_model" ? "badge-model" : ""} ${!answer.skipped && Number(answer.score) < 60 ? "badge-incorrect" : !answer.skipped ? "badge-correct" : ""}">${answer.skipped ? "Skipped" : answer.method === "mcq" ? (Number(answer.score) >= 60 ? "Correct choice · 100%" : "Incorrect choice · 0%") : `${Number(answer.score)}% · ${answer.method === "ml_model" ? "ML model estimate" : "keyword estimate"}`}</span>${answer.note ? `<p class="muted small-note">${escapeHTML(answer.note)}</p>` : ""}</section>`).join("")}</div></article>`;
}

function render() {
    const renderers = {
        dashboard: renderDashboard, start: renderStart, prepare: renderPrepare, mock: renderMockInterview, topics: renderTopics,
        notes: renderNotes, topicNotes: renderTopicNotes, bank: renderBank, report: renderReport,
        gaps: renderGaps, profile: renderProfile, session: renderSession,
        feedback: renderFeedback
    };
    renderShell((renderers[page] || renderDashboard)());
    connectPageControls();
}

function connectPageControls() {
    if (page === "dashboard") {
        document.querySelectorAll("[data-preparation-group]").forEach(link => {
            link.addEventListener("click", () => {
                localStorage.setItem(PREPARATION_GROUP_KEY, link.dataset.preparationGroup);
            });
        });
        document.getElementById("dashboard-range")?.addEventListener("change", event => {
            dashboardRange = Number(event.target.value) || 0;
            render();
        });
    }
    if (page === "prepare") connectPrepare();
    if (page === "mock") connectMockInterview();
    if (page === "start") connectStartForm();
    if (page === "topics") connectTopicFilters();
    if (page === "notes") connectNotes();
    if (page === "bank") connectBank();
    if (page === "report") connectReport();
    if (page === "gaps") connectGaps();
    if (page === "profile") connectProfile();
    if (page === "session") connectSession();
}

function startPracticeSession(topics, difficultyLabel, count, sessionInfo = {}) {
    const selectedTopics = [...new Set(topics)].filter(topic => questionBank.some(question => question.topic === topic));
    const firstQuestion = chooseAdaptiveQuestion(selectedTopics, difficultyValue(difficultyLabel), [], [], []);
    if (!firstQuestion) return false;
    const topicLabel = selectedTopics.length === 1 ? selectedTopics[0] : `${selectedTopics.length} topics`;
    sessionStorage.setItem(STORAGE.topic, topicLabel);
    sessionStorage.setItem(STORAGE.topics, JSON.stringify(selectedTopics));
    sessionStorage.setItem(STORAGE.mode, sessionInfo.mode || "practice");
    sessionStorage.setItem(STORAGE.role, sessionInfo.role || "");
    sessionStorage.setItem(STORAGE.difficulty, difficultyLabel);
    sessionStorage.setItem(STORAGE.questionType, sessionInfo.questionType === "mcq" ? "mcq" : "descriptive");
    sessionStorage.setItem(STORAGE.count, String(count));
    sessionStorage.setItem(STORAGE.answers, "[]");
    sessionStorage.setItem(STORAGE.questionIds, JSON.stringify([firstQuestion.id]));
    sessionStorage.setItem(STORAGE.questionIndex, "0");
    sessionStorage.setItem(STORAGE.sessionId, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    sessionStorage.removeItem(STORAGE.lastFeedback);
    location.href = "practice-session.html";
    return true;
}

function connectMockInterview() {
    const roleSelect = document.getElementById("mock-role");
    const customField = document.getElementById("custom-role-field");
    const customRole = document.getElementById("custom-role");
    const topicOptions = document.getElementById("mock-topic-options");
    const status = document.getElementById("mock-status");
    const startButton = document.getElementById("mock-start");
    const updateStatus = () => {
        const selected = [...topicOptions.querySelectorAll('input[name="mock-topic"]:checked')];
        const count = questionBank.filter(question => selected.some(input => input.value === question.topic)).length;
        startButton.disabled = !selected.length || !count;
        status.textContent = `${selected.length} focus topic${selected.length === 1 ? "" : "s"} selected · ${count} available questions`;
    };
    const updateTopics = () => {
        const roleKey = roleSelect.value;
        customField.hidden = roleKey !== "custom";
        customRole.required = roleKey === "custom";
        topicOptions.innerHTML = renderMockTopicOptions(roleKey);
        topicOptions.querySelectorAll('input[name="mock-topic"]').forEach(input => input.addEventListener("change", updateStatus));
        updateStatus();
    };
    roleSelect.addEventListener("change", updateTopics);
    document.getElementById("mock-interview-form").addEventListener("submit", event => {
        event.preventDefault();
        const topics = [...topicOptions.querySelectorAll('input[name="mock-topic"]:checked')].map(input => input.value);
        const role = roleSelect.value === "custom"
            ? customRole.value.trim()
            : MOCK_INTERVIEW_ROLES[roleSelect.value]?.label || "Software Engineer";
        if (!role) {
            status.textContent = "Enter the target role to continue.";
            customRole.focus();
            return;
        }
        const difficulty = document.getElementById("mock-difficulty").value;
        const count = Number(document.getElementById("mock-count").value) || 5;
        if (!startPracticeSession(topics, difficulty, count, { mode: "mock", role, questionType: "descriptive" })) {
            status.textContent = "Choose at least one topic with available questions.";
        }
    });
    updateTopics();
}

function connectPrepare() {
    const form = document.getElementById("prep-session-form");
    const checkboxes = [...form.querySelectorAll('input[name="prep-topic"]')];
    const status = document.getElementById("prep-selection-status");
    const startButton = document.getElementById("prep-start-button");
    const updateSelection = () => {
        const selected = checkboxes.filter(input => input.checked).map(input => input.value);
        const available = questionBank.filter(question => selected.includes(question.topic) && ADAPTIVE_LEVELS.includes(question.difficulty)).length;
        startButton.disabled = !selected.length || !available;
        status.textContent = selected.length
            ? `${selected.length} topic${selected.length === 1 ? "" : "s"} selected · ${available} available questions`
            : "Select at least one topic to begin.";
    };
    checkboxes.forEach(input => input.addEventListener("change", updateSelection));
    form.addEventListener("submit", event => {
        event.preventDefault();
        const selected = checkboxes.filter(input => input.checked).map(input => input.value);
        const level = document.getElementById("prep-start-level").value;
        const count = Math.max(1, Math.min(20, Number(document.getElementById("prep-question-count").value) || 5));
        const questionType = document.getElementById("prep-question-type").value;
        if (!startPracticeSession(selected, level, count, { questionType })) {
            status.textContent = "No questions are available for that selection. Choose another topic.";
        }
    });
    updateSelection();
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
        const questionType = document.getElementById("question-type").value;
        if (!startPracticeSession([topic], difficultySelect.value, count, { questionType })) {
            availableCount.textContent = "There are no questions for this selection. Choose another topic or difficulty.";
        }
    });
}

function connectTopicFilters() {
    const selectedTopics = new Set();
    const resultContainer = document.getElementById("topic-results");
    const status = document.getElementById("topic-selection-status");
    const startButton = document.getElementById("topic-practice-start");
    const groups = {
        programming: ["Python", "Java", "C++", "OOP"],
        systems: ["Operating Systems", "Computer Networks", "Software Engineering"],
        data: ["Data Structures", "Algorithms", "Database Management", "SQL", "DBMS", "DSA"]
    };
    const drawSelectionState = () => {
        const available = questionBank.filter(question => selectedTopics.has(question.topic) && ADAPTIVE_LEVELS.includes(question.difficulty)).length;
        startButton.disabled = !selectedTopics.size || !available;
        status.textContent = selectedTopics.size
            ? `${selectedTopics.size} topic${selectedTopics.size === 1 ? "" : "s"} selected · ${available} questions available across your selection.`
            : "Select one or more topics below.";
    };
    resultContainer.addEventListener("change", event => {
        const checkbox = event.target.closest('input[name="practice-topic"]');
        if (!checkbox) return;
        if (checkbox.checked) selectedTopics.add(checkbox.value);
        else selectedTopics.delete(checkbox.value);
        drawSelectionState();
    });
    document.getElementById("topic-filters").addEventListener("click", event => {
        const button = event.target.closest("[data-topic-filter]");
        if (!button) return;
        document.querySelectorAll("[data-topic-filter]").forEach(item => item.classList.toggle("active", item === button));
        const filter = button.dataset.topicFilter;
        const shown = filter === "all" ? getTopics() : getTopics().filter(topic => (groups[filter] || []).includes(topic.name));
        resultContainer.innerHTML = renderTopicCards(shown, [...selectedTopics]);
    });
    document.getElementById("topic-practice-form").addEventListener("submit", event => {
        event.preventDefault();
        const difficulty = document.getElementById("topics-difficulty").value;
        const questionType = document.getElementById("topics-format").value;
        const count = Number(document.getElementById("topics-count").value) || 5;
        if (!startPracticeSession([...selectedTopics], difficulty, count, { questionType })) {
            status.textContent = "No questions are available for those topics. Select another topic.";
        }
    });
    drawSelectionState();
}

function connectNotes() {
    const search = document.getElementById("notes-search");
    const grid = document.getElementById("notes-topic-grid");
    const resultCount = document.getElementById("notes-result-count");
    const draw = () => {
        const term = search.value.trim().toLowerCase();
        const filtered = NOTES.filter(note => {
            const topicText = [note.topic, note.summary, ...note.sections.flatMap(section => [section.heading, ...section.points])].join(" ").toLowerCase();
            return topicText.includes(term);
        });
        grid.innerHTML = renderNotesCatalog(filtered);
        resultCount.textContent = `${filtered.length} topic guide${filtered.length === 1 ? "" : "s"}`;
    };
    search.addEventListener("input", draw);
    draw();
    document.getElementById("download-notes").addEventListener("click", () => downloadText("prepai-notes.txt", NOTES.map(note => [
        note.topic.toUpperCase(), note.summary,
        ...note.sections.flatMap(section => ["", section.heading, ...section.points.map(point => `• ${point}`)])
    ].join("\n")).join("\n\n")));
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
            <details class="bank-question"><summary><span>${escapeHTML(question.question)}</span><span class="question-tags"><span class="badge">${escapeHTML(question.topic)}</span><span class="badge badge-difficulty badge-difficulty-${String(question.difficulty || "unspecified").toLowerCase()}">${escapeHTML(question.difficulty || "Unspecified")}</span></span></summary><div class="bank-answer"><p><strong>Reference answer</strong><br />${escapeHTML(question.reference_answer || "No reference answer supplied.")}</p>${Array.isArray(question.key_concepts) && question.key_concepts.length ? `<p><strong>Key concepts</strong><br />${question.key_concepts.map(escapeHTML).join(" · ")}</p>` : ""}<a class="text-link" href="start-practice.html?topic=${encodeURIComponent(question.topic)}">Practice this topic →</a></div></details>
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

function chooseQuestion(topics, targetDifficulty, usedIds = []) {
    const topicSet = new Set(Array.isArray(topics) ? topics : [topics]);
    const used = new Set(usedIds.map(String));
    const candidates = questionBank.filter(question =>
        topicSet.has(question.topic) &&
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

function fitTopicMasteryModel(topics, sessionAnswers = []) {
    const savedAnswers = getHistory()
        .slice()
        .sort((a, b) => Date.parse(a.date || "") - Date.parse(b.date || ""))
        .flatMap(session => session.answers);
    const model = new Map();
    topics.forEach(topic => {
        // Beta(2,2) prior keeps early estimates from swinging on one response.
        let alpha = 2;
        let beta = 2;
        const evidence = [...savedAnswers, ...sessionAnswers]
            .filter(answer => answer?.topic === topic && !answer.skipped && answer.score !== null && answer.score !== undefined && Number.isFinite(Number(answer.score)))
            .slice(-12);
        evidence.forEach(answer => {
            // Each score is fractional evidence because the scorer itself is an estimate.
            const outcome = Math.max(0, Math.min(1, Number(answer.score) / 100));
            alpha += outcome;
            beta += 1 - outcome;
        });
        const strength = alpha + beta;
        model.set(topic, {
            mastery: alpha / strength,
            uncertainty: Math.sqrt((alpha * beta) / (strength * strength * (strength + 1))),
            observations: evidence.length
        });
    });
    return model;
}

function chooseAdaptiveQuestion(topics, targetDifficulty, usedIds = [], sessionAnswers = [], askedTopics = []) {
    const selectedTopics = [...new Set(topics)].filter(topic => questionBank.some(question => question.topic === topic));
    const used = new Set(usedIds.map(String));
    const selected = selectedTopics.filter(topic => questionBank.some(question =>
        question.topic === topic && ADAPTIVE_LEVELS.includes(question.difficulty) && !used.has(String(question.id))
    ));
    if (!selected.length) return null;
    const alreadyAsked = new Set(askedTopics);
    const notYetCovered = selected.filter(topic => !alreadyAsked.has(topic));
    // Re-fit from saved practice outcomes on every selection: this is the learner's
    // online topic-mastery model, with uncertainty reduced as more answers arrive.
    const masteryModel = fitTopicMasteryModel(selected, sessionAnswers);
    const priority = topic => {
        const estimate = masteryModel.get(topic);
        return (1 - estimate.mastery) + 0.25 * estimate.uncertainty;
    };
    const known = selected.filter(topic => masteryModel.get(topic).observations > 0);
    const focusTopic = known.length
        ? [...known].sort((a, b) => priority(b) - priority(a))[0]
        : null;
    const scores = new Map(selected.map(topic => [topic, masteryModel.get(topic).mastery * 100]));

    let topic;
    if (notYetCovered.length) {
        // Give every selected topic a turn before revisiting one.
        topic = notYetCovered.sort((a, b) => (scores.get(a) ?? 100) - (scores.get(b) ?? 100))[0];
    } else if (focusTopic && selected.length > 1) {
        const lastTwo = askedTopics.slice(-2);
        const mustRotate = lastTwo.length === 2 && lastTwo.every(item => item === focusTopic);
        const alternatives = selected.filter(item => item !== focusTopic);
        topic = mustRotate ? alternatives.sort((a, b) => (scores.get(a) ?? 100) - (scores.get(b) ?? 100))[0] : focusTopic;
    } else if (focusTopic) {
        topic = focusTopic;
    } else {
        topic = selected[Math.floor(Math.random() * selected.length)];
    }

    let targetIndex = Math.max(0, ADAPTIVE_LEVELS.indexOf(targetDifficulty));
    if (focusTopic && topic !== focusTopic) {
        // Keep other topics in rotation, but challenge the learner more there.
        targetIndex = Math.min(ADAPTIVE_LEVELS.length - 1, targetIndex + 1);
    } else if (focusTopic && topic === focusTopic && scores.get(topic) < 40) {
        targetIndex = Math.max(0, targetIndex - 1);
    }
    return chooseQuestion([topic], ADAPTIVE_LEVELS[targetIndex], usedIds);
}

function buildMcqOptions(question) {
    const correct = String(question.reference_answer || "").trim();
    if (!correct) return [];
    const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const distractors = questionBank
        .filter(item => item.id !== question.id && item.topic === question.topic && item.reference_answer && normalize(item.reference_answer) !== normalize(correct))
        .sort((a, b) => {
            const hash = item => String(item.id).split("").reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 100003, Number(question.id) || 0);
            return hash(a) - hash(b);
        })
        .map(item => String(item.reference_answer).trim());
    const choices = [correct, ...[...new Set(distractors)].slice(0, 3)];
    const correctIndex = (Number(question.id) || 0) % choices.length;
    const answer = choices.shift();
    choices.splice(correctIndex, 0, answer);
    return choices.map((text, index) => ({ text, correct: normalize(text) === normalize(correct), index }));
}

function connectSession() {
    let questions = getActiveQuestions();
    const sessionId = sessionStorage.getItem(STORAGE.sessionId);
    if (!sessionId) {
        document.querySelector(".session-panel").innerHTML = `<article class="card">${renderEmpty("Start a practice session first. No questions were loaded for this session.")}</article>`;
        return;
    }
    const topic = sessionStorage.getItem(STORAGE.topic) || questions[0]?.topic;
    const savedTopics = readJSON(sessionStorage, STORAGE.topics, topic ? [topic] : []);
    const selectedTopics = Array.isArray(savedTopics) ? savedTopics : topic ? [topic] : [];
    const isMock = sessionStorage.getItem(STORAGE.mode) === "mock";
    const role = sessionStorage.getItem(STORAGE.role) || "";
    const topicLabel = selectedTopics.length > 1 ? "Mixed-topic practice" : selectedTopics[0] || topic;
    const difficulty = sessionStorage.getItem(STORAGE.difficulty) || "Intermediate";
    const questionType = sessionStorage.getItem(STORAGE.questionType) || "descriptive";
    const plannedCount = Math.max(1, Number(sessionStorage.getItem(STORAGE.count)) || 5);
    if (!selectedTopics.length) {
        document.querySelector(".session-panel").innerHTML = `<article class="card">${renderEmpty("Choose a topic and start a session first.")}</article>`;
        return;
    }
    if (!questions.length) {
        const firstQuestion = chooseQuestion(selectedTopics, difficultyValue(difficulty));
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
    const mcqOptionsElement = document.getElementById("mcq-options");
    const descriptiveField = document.getElementById("descriptive-answer-field");
    const feedback = document.getElementById("answer-status");

    function drawQuestion() {
        const question = questions[index];
        document.getElementById("session-label").textContent = isMock ? `${role} · AI interviewer` : `${topicLabel} · ${questionType === "mcq" ? "Multiple choice" : "Descriptive practice"}`;
        document.getElementById("session-position").textContent = `Question ${index + 1} of up to ${plannedCount}`;
        document.getElementById("session-progress-bar").style.width = `${Math.min(100, ((index + 1) / plannedCount) * 100)}%`;
        document.getElementById("question-meta").textContent = `${question.subtopic || question.topic} · ${question.difficulty || "Unspecified"}`;
        questionText.textContent = question.question;
        const isMcq = questionType === "mcq";
        mcqOptionsElement.hidden = !isMcq;
        descriptiveField.hidden = isMcq;
        answerInput.value = isMcq ? "" : (answers[index]?.answer || "");
        if (isMcq) {
            const choices = buildMcqOptions(question);
            mcqOptionsElement.innerHTML = `<legend>Select one answer</legend>${choices.map(option => `<label class="mcq-option"><input type="radio" name="mcq-answer" value="${option.index}" ${answers[index]?.answer === option.text ? "checked" : ""}><span>${escapeHTML(option.text)}</span></label>`).join("")}`;
        }
        document.getElementById("previous-question").disabled = index === 0;
        document.getElementById("skip-question").textContent = index + 1 >= plannedCount ? "Skip and finish" : "Skip";
        document.getElementById("submit-answer").textContent = index + 1 >= plannedCount ? "Save and finish" : "Save and continue →";
        feedback.textContent = answers[index]?.submitted ? `Saved score: ${answers[index].score}% (${answers[index].method === "mcq" ? "multiple choice" : answers[index].method === "ml_model" ? "ML model" : "keyword estimate"}). You can edit and save this answer again.` : "";
    }

    function saveState() {
        sessionStorage.setItem(STORAGE.answers, JSON.stringify(answers));
        sessionStorage.setItem(STORAGE.questionIndex, String(index));
        sessionStorage.setItem(STORAGE.questionIds, JSON.stringify(questions.map(question => question.id)));
    }

    function advanceToNext(targetDifficulty) {
        if (index + 1 >= plannedCount) {
            finishSession(topicLabel, difficulty, answers);
            return;
        }
        const usedIds = questions.slice(0, index + 1).map(question => question.id);
        // If the learner edits an earlier answer, discard the old future path and adapt it again.
        questions = questions.slice(0, index + 1);
        answers = answers.slice(0, index + 1);
        const nextQuestion = chooseAdaptiveQuestion(
            selectedTopics,
            targetDifficulty,
            usedIds,
            answers,
            questions.map(question => question.topic)
        );
        if (!nextQuestion) {
            sessionStorage.setItem(STORAGE.answers, JSON.stringify(answers));
            finishSession(topicLabel, difficulty, answers);
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
        const isMcq = questionType === "mcq";
        const text = isMcq
            ? (mcqOptionsElement.querySelector('input[name="mcq-answer"]:checked') ? buildMcqOptions(question)[Number(mcqOptionsElement.querySelector('input[name="mcq-answer"]:checked').value)]?.text || "" : "")
            : answerInput.value.trim();
        if (!text) {
            feedback.textContent = isMcq ? "Select an option or choose Skip before moving on." : "Write an answer or choose Skip before moving on.";
            if (isMcq) mcqOptionsElement.querySelector('input[name="mcq-answer"]')?.focus();
            else answerInput.focus();
            return;
        }
        document.getElementById("submit-answer").disabled = true;
        feedback.textContent = isMcq ? "Checking your choice…" : "Scoring answer…";
        const priorScores = answers.slice(0, index).filter(answer => answer?.submitted && !answer.skipped).map(answer => Number(answer.score));
        const result = isMcq
            ? (() => {
                const correct = buildMcqOptions(question).find(option => option.correct)?.text;
                const isCorrect = text === correct;
                const score = isCorrect ? 100 : 0;
                return {
                    score,
                    method: "mcq",
                    matchedConcepts: isCorrect ? (question.key_concepts || []) : [],
                    recommendedDifficulty: recommendDifficulty(score, question.difficulty, priorScores),
                    note: isCorrect ? "Correct choice." : "That choice is incorrect. Review the reference answer."
                };
            })()
            : await scoreAnswer(question, text, question.difficulty, priorScores);
        answers[index] = {
            questionId: question.id,
            question: question.question,
            topic: question.topic,
            answer: text,
            questionType,
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
            questionType: answer.questionType || sessionStorage.getItem(STORAGE.questionType) || "descriptive",
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
    const record = {
        id,
        topic,
        difficulty,
        mode: sessionStorage.getItem(STORAGE.mode) || "practice",
        role: sessionStorage.getItem(STORAGE.role) || "",
        date: new Date().toISOString(),
        answers: completed
    };
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
    const safePages = new Set(["index.html", "start-practice.html", "prepare.html", "mock-interview.html", "practice-by-topic.html", "practice-session.html", "feedback.html", "question-bank.html", "short-notes.html", "topic-notes.html", "performance-report.html", "skill-gaps.html", "profile-settings.html"]);
    const next = safePages.has(requested) ? requested : "index.html";
    location.replace(`login.html?next=${encodeURIComponent(next)}`);
} else if (page !== "login") {
    loadQuestionBank().then(render).catch(showLoadError);
}
