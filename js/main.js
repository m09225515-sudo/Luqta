
import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const lostContainer = document.getElementById("lost-reports-container");
const foundContainer = document.getElementById("found-reports-container");

const searchInput = document.getElementById("home-search");
const searchButton = document.getElementById("search-btn");

let allReports = [];

// ترجمة التصنيفات
const categories = {
    electronics: "إلكترونيات",
    cards: "بطاقات وهويات",
    bags: "حقائب",
    books: "كتب وملفات",
    accessories: "إكسسوارات",
    clothing: "ملابس",
    other: "أخرى"
};

// رموز تقريبية للأغراض
function getItemEmoji(category) {
    const emojis = {
        electronics: "📱",
        cards: "💳",
        bags: "🎒",
        books: "📚",
        accessories: "⌚",
        clothing: "👕",
        other: "📦"
    };

    return emojis[category] || "📦";
}

// إنشاء عنصر نصي بأمان
function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text || "";
    return element;
}

// تجهيز بطاقة البلاغ
function createReportCard(report) {
    const card = document.createElement("article");
    card.className = "report-card";

    const image = document.createElement("div");
    image.className = "report-image";

    const isLost = report.type === "lost";

    image.classList.add(
        isLost ? "phone-image" : "card-image"
    );

    const typeBadge = createTextElement(
        "span",
        `report-type ${isLost ? "lost-type" : "found-type"}`,
        isLost ? "مفقود" : "موجود"
    );

    const emoji = createTextElement(
        "span",
        "item-emoji",
        getItemEmoji(report.category)
    );

    image.append(typeBadge, emoji);

    const info = document.createElement("div");
    info.className = "report-info";

    const meta = document.createElement("div");
    meta.className = "report-meta";

    const category = createTextElement(
        "span",
        "",
        categories[report.category] || report.category || "أخرى"
    );

    const date = createTextElement(
        "span",
        "",
        report.reportDate || "تاريخ غير محدد"
    );

    meta.append(category, date);

    const title = createTextElement(
        "h3",
        "",
        report.itemName || "غرض بدون اسم"
    );

    const description = createTextElement(
        "p",
        "",
        report.description || "لا يوجد وصف لهذا الغرض."
    );

    const location = document.createElement("div");
    location.className = "report-location";

    const locationIcon = createTextElement("span", "", "📍");

    const locationName = createTextElement(
        "span",
        "",
        report.location || "الموقع غير محدد"
    );

    location.append(locationIcon, locationName);

    const link = document.createElement("a");
    link.className = "report-link";
    link.href = `details.html?id=${encodeURIComponent(report.id)}`;
    link.textContent = "عرض التفاصيل ←";

    info.append(meta, title, description, location, link);
    card.append(image, info);

    return card;
}

// عرض البلاغات في الصفحة
function displayReports(reports) {
    if (!lostContainer || !foundContainer) return;

    lostContainer.replaceChildren();
    foundContainer.replaceChildren();

    const lostReports = reports.filter(
        report => report.type === "lost"
    );

    const foundReports = reports.filter(
        report => report.type === "found"
    );

    if (lostReports.length === 0) {
        lostContainer.appendChild(
            createTextElement(
                "p",
                "loading-message",
                "لا توجد بلاغات مفقودات مطابقة حالياً."
            )
        );
    } else {
        lostReports.forEach(report => {
            lostContainer.appendChild(createReportCard(report));
        });
    }

    if (foundReports.length === 0) {
        foundContainer.appendChild(
            createTextElement(
                "p",
                "loading-message",
                "لا توجد بلاغات موجودات مطابقة حالياً."
            )
        );
    } else {
        foundReports.forEach(report => {
            foundContainer.appendChild(createReportCard(report));
        });
    }
}

// الانتقال تلقائياً إلى قسم نتائج البحث
function scrollToSearchResults(reports) {
    const hasLostReports = reports.some(
        report => report.type === "lost"
    );

    const hasFoundReports = reports.some(
        report => report.type === "found"
    );

    let targetSection;

    if (hasLostReports) {
        targetSection = document.getElementById("lost");
    } else if (hasFoundReports) {
        targetSection = document.getElementById("found");
    } else {
        targetSection = document.getElementById("lost");
    }

    if (targetSection) {
        targetSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

// ترتيب البلاغات من الأحدث إلى الأقدم
function sortReports(reports) {
    return reports.sort((a, b) => {
        const dateA = a.createdAt?.toMillis
            ? a.createdAt.toMillis()
            : 0;

        const dateB = b.createdAt?.toMillis
            ? b.createdAt.toMillis()
            : 0;

        return dateB - dateA;
    });
}

// تحميل البلاغات من Firestore
async function loadReports() {
    if (!lostContainer || !foundContainer) return;

    try {
        const reportsQuery = query(
            collection(db, "reports"),
            where("status", "==", "active")
        );

        const snapshot = await getDocs(reportsQuery);

        allReports = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        allReports = sortReports(allReports);

        displayReports(allReports);

    } catch (error) {
        console.error("Error loading reports:", error);

        const errorMessage =
            error.code === "permission-denied"
                ? "لا توجد صلاحية لقراءة البلاغات. راجعي قواعد Firestore."
                : "تعذر تحميل البلاغات. تأكدي من الاتصال بقاعدة البيانات.";

        lostContainer.textContent = errorMessage;
        foundContainer.textContent = errorMessage;
    }
}

// البحث في البلاغات
function searchReports(shouldScroll = false) {
    if (!searchInput) return;

    const searchText = searchInput.value.trim().toLowerCase();

    if (!searchText) {
        displayReports(allReports);
        return;
    }

    const filteredReports = allReports.filter(report => {
        const searchableText = [
            report.itemName,
            report.description,
            report.location,
            categories[report.category],
            report.category
        ].join(" ").toLowerCase();

        return searchableText.includes(searchText);
    });

    displayReports(filteredReports);

    // الانتقال للنتائج عند الضغط على زر البحث أو Enter فقط
    if (shouldScroll) {
        scrollToSearchResults(filteredReports);
    }
}

// تشغيل البحث عند الضغط على الزر
if (searchButton) {
    searchButton.addEventListener("click", () => {
        searchReports(true);
    });
}

// البحث المباشر أثناء الكتابة
if (searchInput) {
    searchInput.addEventListener("input", () => {
        searchReports(false);
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchReports(true);
        }
    });
}

// =====================================
// DARK MODE / LIGHT MODE
// =====================================

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

const THEME_KEY = "luqta-theme";

// تطبيق الوضع وتحديث رمز الزر
function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";

    document.documentElement.setAttribute(
        "data-theme",
        selectedTheme
    );

    if (themeIcon) {
        themeIcon.textContent =
            selectedTheme === "dark" ? "☀" : "☾";
    }

    if (themeToggle) {
        themeToggle.setAttribute(
            "aria-label",
            selectedTheme === "dark"
                ? "تفعيل الوضع الفاتح"
                : "تفعيل الوضع الداكن"
        );

        themeToggle.setAttribute(
            "title",
            selectedTheme === "dark"
                ? "الوضع الفاتح"
                : "الوضع الداكن"
        );
    }
}

// استرجاع الوضع المحفوظ
function getSavedTheme() {
    try {
        return localStorage.getItem(THEME_KEY) || "light";
    } catch (error) {
        console.warn("تعذر قراءة الوضع المحفوظ:", error);
        return "light";
    }
}

// حفظ الوضع المختار
function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
        console.warn("تعذر حفظ الوضع:", error);
    }
}

// تشغيل الوضع المحفوظ عند فتح الصفحة
applyTheme(getSavedTheme());

// تشغيل زر التبديل
if (themeToggle) {
    themeToggle.addEventListener("click", event => {
        event.preventDefault();

        const currentTheme =
            document.documentElement.getAttribute("data-theme") || "light";

        const newTheme =
            currentTheme === "dark" ? "light" : "dark";

        applyTheme(newTheme);
        saveTheme(newTheme);
    });
} else {
    console.warn("لم يتم العثور على زر تغيير المظهر: theme-toggle");
}

// بدء تحميل البلاغات
loadReports();
