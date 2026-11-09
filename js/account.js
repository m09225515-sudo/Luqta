
import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const accountName = document.getElementById("account-name");
const accountEmail = document.getElementById("account-email");
const userAvatar = document.getElementById("user-avatar");
const reportCount = document.getElementById("report-count");
const reportsContainer = document.getElementById("my-reports-container");

function showUserInfo(user) {
    const name = user.displayName || "مستخدم لُقطة";

    accountName.textContent = name;
    accountEmail.textContent = user.email || "لا يوجد بريد إلكتروني";
    userAvatar.textContent = name.charAt(0);
}

// تنسيق أزرار إدارة البلاغ
function createActionButton(text, background, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = text;

    button.style.cssText = `
        border: none;
        background: ${background};
        color: white;
        padding: 9px 13px;
        border-radius: 9px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
    `;

    button.addEventListener("click", onClick);

    return button;
}

// إنشاء بطاقة البلاغ
function createReportCard(report, reportId) {
    const card = document.createElement("article");

    card.style.cssText = `
        background: var(--surface);
        color: var(--text);
        padding: 20px;
        border-radius: 15px;
        box-shadow: var(--shadow);
        border: 1px solid var(--border);
        transition: background 0.3s ease, color 0.3s ease;
    `;

    const typeLabel = report.type === "lost"
        ? "غرض مفقود"
        : "غرض موجود";

    const typeColor = report.type === "lost"
        ? "#d35b70"
        : "#23865a";

    const typeBackground = report.type === "lost"
        ? "rgba(211, 91, 112, 0.12)"
        : "rgba(35, 134, 90, 0.12)";

    const type = document.createElement("span");
    type.textContent = typeLabel;
    type.style.cssText = `
        display: inline-block;
        color: ${typeColor};
        background: ${typeBackground};
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        margin-bottom: 12px;
    `;

    const title = document.createElement("h3");
    title.textContent = report.itemName || "بدون اسم";
    title.style.cssText = `
        color: var(--text);
        font-size: 18px;
        margin-bottom: 10px;
    `;

    const description = document.createElement("p");
    description.textContent = report.description || "لا يوجد وصف.";
    description.style.cssText = `
        color: var(--muted);
        font-size: 14px;
        line-height: 1.8;
        margin-bottom: 10px;
    `;

    const location = document.createElement("p");
    location.textContent = "📍 " + (report.location || "غير محدد");
    location.style.cssText = `
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 7px;
    `;

    const category = document.createElement("p");
    category.textContent = "التصنيف: " + (report.category || "غير محدد");
    category.style.cssText = `
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 16px;
    `;

    const actions = document.createElement("div");
    actions.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
    `;

    const resolveButton = createActionButton(
        "تم حل البلاغ",
        "#23865a",
        async () => {
            const confirmed = confirm(
                "هل أنتِ متأكدة إن البلاغ تم حله؟"
            );

            if (!confirmed) return;

            resolveButton.disabled = true;

            try {
                await updateDoc(doc(db, "reports", reportId), {
                    status: "resolved"
                });

                alert("تم تحديث البلاغ بنجاح.");
                await loadMyReports(auth.currentUser);

            } catch (error) {
                console.error("Resolve report error:", error);
                alert("تعذر تحديث البلاغ. حاولي مرة أخرى.");
                resolveButton.disabled = false;
            }
        }
    );

    const deleteButton = createActionButton(
        "حذف البلاغ",
        "#d34d61",
        async () => {
            const confirmed = confirm(
                "هل أنتِ متأكدة من حذف هذا البلاغ نهائياً؟"
            );

            if (!confirmed) return;

            deleteButton.disabled = true;

            try {
                await deleteDoc(doc(db, "reports", reportId));

                alert("تم حذف البلاغ بنجاح.");
                await loadMyReports(auth.currentUser);

            } catch (error) {
                console.error("Delete report error:", error);
                alert("تعذر حذف البلاغ. حاولي مرة أخرى.");
                deleteButton.disabled = false;
            }
        }
    );

    actions.append(resolveButton, deleteButton);

    card.append(type, title, description, location, category, actions);

    return card;
}

// تحميل بلاغات المستخدم
async function loadMyReports(user) {
    reportsContainer.innerHTML = "";

    const loading = document.createElement("div");
    loading.className = "empty-message";
    loading.textContent = "جاري تحميل بلاغاتك...";
    reportsContainer.appendChild(loading);

    try {
        const reportsQuery = query(
            collection(db, "reports"),
            where("ownerUid", "==", user.uid),
            where("status", "==", "active")
        );

        const snapshot = await getDocs(reportsQuery);

        reportCount.textContent = snapshot.size;
        reportsContainer.innerHTML = "";

        if (snapshot.empty) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "empty-message";
            emptyMessage.textContent =
                "ما عندكش بلاغات نشطة حالياً.";
            reportsContainer.appendChild(emptyMessage);
            return;
        }

        const reports = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data()
        }));

        reports.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
        });

        reports.forEach((report) => {
            reportsContainer.appendChild(
                createReportCard(report, report.id)
            );
        });

    } catch (error) {
        console.error("Loading reports error:", error);

        reportCount.textContent = "—";
        reportsContainer.innerHTML = "";

        const errorMessage = document.createElement("div");
        errorMessage.className = "empty-message";
        errorMessage.textContent =
            "تعذر تحميل البلاغات. تأكدي من الاتصال بالإنترنت وقواعد Firestore.";

        reportsContainer.appendChild(errorMessage);
    }
}

// متابعة تسجيل الدخول
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    showUserInfo(user);
    await loadMyReports(user);
});
