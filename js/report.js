
import { auth, db } from "./firebase.js";

import {
    collection,
    doc,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

import { onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const form = document.getElementById("report-form");
const message = document.getElementById("form-message");
const submitButton = form?.querySelector(".submit-btn");

const imageInput = document.getElementById("item-image");
const fileName = document.getElementById("file-name");

let currentUser = null;

// =====================================
// LOGIN REQUIRED NOTICE
// =====================================

function createLoginNotice() {
    const notice = document.createElement("section");
    notice.className = "auth-required-notice";

    notice.style.cssText = `
        padding: 30px 22px;
        margin-top: 25px;
        border: 1px solid var(--border);
        border-radius: 22px;
        background: var(--surface);
        box-shadow: var(--shadow);
        text-align: center;
    `;

    const icon = document.createElement("div");
    icon.textContent = "🔐";
    icon.style.cssText = `
        font-size: 42px;
        margin-bottom: 12px;
    `;

    const title = document.createElement("h2");
    title.textContent = "تسجيل الدخول مطلوب";
    title.style.cssText = `
        color: var(--text);
        font-size: 21px;
        font-weight: 900;
        margin-bottom: 10px;
    `;

    const description = document.createElement("p");
    description.textContent =
        "لإضافة بلاغ عن غرض مفقود أو موجود، يجب تسجيل الدخول إلى حسابك أولاً.";

    description.style.cssText = `
        color: var(--muted);
        font-size: 13px;
        line-height: 2;
        margin-bottom: 20px;
    `;

    const loginLink = document.createElement("a");

    // حفظ صفحة الإبلاغ كوجهة للعودة بعد تسجيل الدخول
    loginLink.href = "auth.html?redirect=report.html";

    loginLink.textContent = "تسجيل الدخول أو إنشاء حساب";

    loginLink.style.cssText = `
        display: inline-flex;
        justify-content: center;
        align-items: center;
        padding: 13px 24px;
        border-radius: 13px;
        color: white;
        background: var(--primary);
        font-family: inherit;
        font-size: 13px;
        font-weight: 900;
        text-decoration: none;
    `;

    notice.append(icon, title, description, loginLink);

    return notice;
}

const loginNotice = createLoginNotice();

// =====================================
// AUTHENTICATION CHECK
// =====================================

// إخفاء النموذج قبل التحقق من حالة الحساب
if (form) {
    form.hidden = true;

    const heading = document.querySelector(".report-heading");

    if (heading) {
        heading.insertAdjacentElement("afterend", loginNotice);
    }
}

// التحقق من حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (!form) return;

    if (user) {
        form.hidden = false;
        loginNotice.hidden = true;

        console.log("Authenticated user:", user.uid);

    } else {
        form.hidden = true;
        loginNotice.hidden = false;

        console.log("Login required before creating a report.");
    }
});

// =====================================
// IMAGE FILE NAME
// =====================================

if (imageInput && fileName) {
    imageInput.addEventListener("change", function () {
        fileName.textContent = this.files.length
            ? this.files[0].name
            : "لم يتم اختيار صورة";
    });
}

// =====================================
// SUBMIT REPORT
// =====================================

if (form) {
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (message) {
            message.textContent = "";
            message.style.color = "";
        }

        // التحقق من تسجيل الدخول قبل النشر
        if (!currentUser) {
            form.hidden = true;
            loginNotice.hidden = false;
            return;
        }

        const user = currentUser;
        const formData = new FormData(form);

        const allowEmailContact =
            formData.get("allowEmailContact") === "on";

        if (allowEmailContact && !user.email) {
            message.textContent =
                "تعذر العثور على بريد حسابك. سجلي الدخول مرة أخرى.";

            message.style.color = "#c0392b";
            return;
        }

        const report = {
            type: formData.get("reportType"),
            itemName: formData.get("itemName").trim(),
            category: formData.get("category"),
            reportDate: formData.get("reportDate"),
            description: formData.get("description").trim(),
            location: formData.get("location"),
            status: "active",
            ownerUid: user.uid,
            createdAt: serverTimestamp()
        };

        try {
            submitButton.disabled = true;
            submitButton.textContent = "جاري نشر البلاغ...";

            // إنشاء معرف للبلاغ
            const reportRef = doc(collection(db, "reports"));

            // تجهيز عملية الحفظ
            const batch = writeBatch(db);

            // حفظ بيانات البلاغ العامة
            batch.set(reportRef, report);

            // حفظ البريد عند موافقة صاحب البلاغ فقط
            if (allowEmailContact) {
                const contactRef = doc(
                    db,
                    "reportContacts",
                    reportRef.id
                );

                batch.set(contactRef, {
                    email: user.email,
                    ownerUid: user.uid,
                    allowEmailContact: true
                });
            }

            // تنفيذ الحفظ
            await batch.commit();

            message.textContent = "تم نشر البلاغ بنجاح! 🎉";
            message.style.color = "#16834a";

            form.reset();

            if (fileName) {
                fileName.textContent = "لم يتم اختيار صورة";
            }

        } catch (error) {
            console.error("Report error:", error);

            if (error.code === "permission-denied") {
                message.textContent =
                    "تعذّر النشر بسبب صلاحيات قاعدة البيانات. راجعي قواعد الحماية.";
            } else {
                message.textContent =
                    "حدث خطأ أثناء نشر البلاغ. حاولي مرة أخرى.";
            }

            message.style.color = "#c0392b";

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "نشر البلاغ ←";
        }
    });
}
