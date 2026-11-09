
import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// مكان عرض التفاصيل
const detailsContainer = document.getElementById("details-container");

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

// رموز الأغراض
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

// عرض رسالة
function showMessage(text, className = "error-message") {
    detailsContainer.replaceChildren(
        createTextElement("div", className, text)
    );
}

// إنشاء قسم من أقسام التفاصيل
function createDetailsSection(title, value) {
    const section = document.createElement("section");
    section.className = "details-section";

    const heading = createTextElement("h3", "", title);
    const paragraph = createTextElement("p", "", value || "غير محدد");

    section.append(heading, paragraph);

    return section;
}

// عرض بيانات البلاغ
async function displayReport(report, reportId, user) {
    detailsContainer.innerHTML = "";

    const card = document.createElement("article");
    card.className = "details-card";

    const isLost = report.type === "lost";

    // رأس البلاغ
    const itemHeader = document.createElement("div");
    itemHeader.className = "item-header";

    const itemIcon = createTextElement(
        "div",
        "item-icon",
        getItemEmoji(report.category)
    );

    const itemHeading = document.createElement("div");
    itemHeading.className = "item-heading";

    const badge = createTextElement(
        "span",
        `type-badge ${isLost ? "lost-type" : "found-type"}`,
        isLost ? "غرض مفقود" : "غرض موجود"
    );

    const title = createTextElement(
        "h2",
        "",
        report.itemName || "غرض بدون اسم"
    );

    itemHeading.append(badge, title);
    itemHeader.append(itemIcon, itemHeading);

    // تفاصيل البلاغ
    const details = document.createElement("div");

    details.append(
        createDetailsSection(
            "التصنيف",
            categories[report.category] || report.category || "أخرى"
        ),
        createDetailsSection(
            "الوصف",
            report.description || "لا يوجد وصف لهذا الغرض."
        ),
        createDetailsSection(
            "الموقع",
            report.location || "غير محدد"
        ),
        createDetailsSection(
            "تاريخ البلاغ",
            report.reportDate || "غير محدد"
        )
    );

    card.append(itemHeader, details);

    // قسم التواصل
    const contactSection = document.createElement("section");
    contactSection.className = "contact-section";

    const contactTitle = createTextElement(
        "h3",
        "",
        "التواصل مع صاحب البلاغ"
    );

    const contactDescription = createTextElement(
        "p",
        "",
        "يمكنك التواصل مع صاحب البلاغ عبر البريد الإلكتروني إذا كان قد سمح بذلك."
    );

    contactSection.append(contactTitle, contactDescription);

    if (!user) {
        const loginLink = document.createElement("a");
        loginLink.href = "auth.html";
        loginLink.className = "contact-button";
        loginLink.textContent = "تسجيل الدخول للتواصل";

        contactSection.appendChild(loginLink);

    } else {
        try {
            const contactRef = doc(db, "reportContacts", reportId);
            const contactSnapshot = await getDoc(contactRef);

            if (
                contactSnapshot.exists() &&
                contactSnapshot.data().allowEmailContact === true &&
                contactSnapshot.data().email
            ) {
                const email = contactSnapshot.data().email;

                const contactButton = document.createElement("a");
                contactButton.className = "contact-button";
                contactButton.href = `mailto:${email}`;
                contactButton.textContent = "التواصل عبر البريد الإلكتروني";

                contactSection.appendChild(contactButton);

            } else {
                const noContact = createTextElement(
                    "p",
                    "",
                    "صاحب البلاغ لم يسمح بالتواصل عبر البريد الإلكتروني."
                );

                contactSection.appendChild(noContact);
            }

        } catch (error) {
            console.error("Contact loading error:", error);

            const message = error.code === "permission-denied"
                ? "صاحب البلاغ لم يسمح بالتواصل عبر البريد الإلكتروني."
                : "تعذر الاتصال بالخادم لتحميل معلومات التواصل. حاولي مرة أخرى.";

            const contactMessage = createTextElement("p", "", message);
            contactSection.appendChild(contactMessage);
        }
    }

    card.appendChild(contactSection);
    detailsContainer.appendChild(card);
}

// تحميل البلاغ
async function loadReport(user) {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("id");

    if (!reportId) {
        showMessage("لم يتم تحديد البلاغ المطلوب.");
        return;
    }

    try {
        const reportRef = doc(db, "reports", reportId);
        const reportSnapshot = await getDoc(reportRef);

        if (!reportSnapshot.exists()) {
            showMessage("هذا البلاغ غير موجود أو لم يعد متاحاً.");
            return;
        }

        const report = reportSnapshot.data();

        if (report.status !== "active") {
            showMessage("هذا البلاغ لم يعد نشطاً.");
            return;
        }

        await displayReport(report, reportId, user);

    } catch (error) {
        console.error("Loading report error:", error);

        showMessage(
            "تعذر تحميل تفاصيل البلاغ. تأكدي من الاتصال بالإنترنت وحاولي مرة أخرى."
        );
    }
}

// متابعة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
    loadReport(user);
});
