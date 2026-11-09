
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
const submitButton = form.querySelector(".submit-btn");

const imageInput = document.getElementById("item-image");
const fileName = document.getElementById("file-name");

// عرض اسم الصورة المختارة
imageInput.addEventListener("change", function () {
    fileName.textContent = this.files.length
        ? this.files[0].name
        : "لم يتم اختيار صورة";
});

// انتظار معرفة حالة تسجيل الدخول
function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// إرسال البلاغ
form.addEventListener("submit", async function (event) {
    event.preventDefault();

    message.textContent = "";
    message.style.color = "";

    const user = await getCurrentUser();

    if (!user) {
        message.textContent = "يجب تسجيل الدخول أولاً قبل نشر البلاغ.";
        message.style.color = "#c0392b";

        setTimeout(() => {
            window.location.href = "auth.html";
        }, 1800);

        return;
    }

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

        // حفظ البريد في مجموعة منفصلة عند الموافقة فقط
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

        // تنفيذ الحفظ في عملية واحدة
        await batch.commit();

        message.textContent = "تم نشر البلاغ بنجاح! 🎉";
        message.style.color = "#16834a";

        form.reset();
        fileName.textContent = "لم يتم اختيار صورة";

    } catch (error) {
        console.error("Report error:", error);

        if (error.code === "permission-denied") {
            message.textContent =
                "تعذّر النشر بسبب صلاحيات قاعدة البيانات. نحتاج إلى تحديث قواعد الحماية.";
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
