
import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

// =====================================
// عناصر الصفحة
// =====================================

const form = document.getElementById("auth-form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const nameGroup = document.getElementById("name-group");
const title = document.getElementById("form-title");
const subtitle = document.getElementById("form-subtitle");
const submitButton = document.getElementById("submit-btn");
const message = document.getElementById("message");

const signupTab = document.getElementById("signup-tab");
const loginTab = document.getElementById("login-tab");

// =====================================
// وجهة التحويل بعد تسجيل الدخول
// =====================================

// نسمح بالعودة إلى صفحة الإبلاغ فقط.
// أي قيمة أخرى تحول المستخدم إلى الرئيسية.
const redirectParameter =
    new URLSearchParams(window.location.search).get("redirect");

const redirectAfterAuth =
    redirectParameter === "report.html"
        ? "report.html"
        : "index.html";

let currentMode = "signup";

// =====================================
// عرض الرسائل
// =====================================

function showMessage(text, color = "#d93025") {
    message.textContent = text;
    message.style.color = color;
}

// =====================================
// التبديل بين إنشاء الحساب وتسجيل الدخول
// =====================================

function switchMode(mode) {
    currentMode = mode;

    form.reset();
    showMessage("");

    if (mode === "signup") {
        title.textContent = "إنشاء حساب";
        subtitle.textContent =
            "انضمي إلى مجتمع لُقطة وابدئي رحلتك معنا.";

        submitButton.textContent = "إنشاء حساب";

        nameGroup.style.display = "block";
        nameInput.required = true;

        signupTab.classList.add("active");
        loginTab.classList.remove("active");

    } else {
        title.textContent = "تسجيل الدخول";
        subtitle.textContent =
            "سجّلي الدخول للمتابعة إلى حسابك.";

        submitButton.textContent = "تسجيل الدخول";

        nameGroup.style.display = "none";
        nameInput.required = false;

        loginTab.classList.add("active");
        signupTab.classList.remove("active");
    }
}

signupTab.addEventListener("click", () => {
    switchMode("signup");
});

loginTab.addEventListener("click", () => {
    switchMode("login");
});

// =====================================
// ترجمة أخطاء Firebase
// =====================================

function getArabicError(errorCode) {
    const errors = {
        "auth/email-already-in-use":
            "هذا البريد الإلكتروني مسجل بالفعل.",

        "auth/invalid-email":
            "البريد الإلكتروني غير صحيح.",

        "auth/weak-password":
            "كلمة المرور ضعيفة، استخدمي 6 أحرف على الأقل.",

        "auth/user-not-found":
            "لا يوجد حساب بهذا البريد الإلكتروني.",

        "auth/wrong-password":
            "كلمة المرور غير صحيحة.",

        "auth/invalid-credential":
            "البريد الإلكتروني أو كلمة المرور غير صحيحة.",

        "auth/too-many-requests":
            "محاولات كثيرة، حاولي مرة أخرى لاحقاً.",

        "auth/network-request-failed":
            "تأكدي من اتصالك بالإنترنت."
    };

    return errors[errorCode] || "حدث خطأ، حاولي مرة أخرى.";
}

// =====================================
// إنشاء الحساب أو تسجيل الدخول
// =====================================

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const name = nameInput.value.trim();

    if (currentMode === "signup" && !name) {
        showMessage("يرجى إدخال الاسم الكامل.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "يرجى الانتظار...";

    showMessage("");

    try {
        if (currentMode === "signup") {

            // إنشاء حساب جديد
            const result = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // حفظ اسم المستخدم في الملف الشخصي
            await updateProfile(result.user, {
                displayName: name
            });

            showMessage(
                "تم إنشاء حسابك بنجاح! جاري تحويلك...",
                "#16834a"
            );

        } else {

            // تسجيل الدخول
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            showMessage(
                "تم تسجيل الدخول بنجاح! جاري تحويلك...",
                "#16834a"
            );
        }

        // العودة إلى الصفحة المطلوبة
        // أو الرئيسية إذا لم توجد وجهة محددة
        setTimeout(() => {
            window.location.href = redirectAfterAuth;
        }, 1200);

    } catch (error) {

        console.error("Authentication error:", error);

        showMessage(getArabicError(error.code));

    } finally {

        submitButton.disabled = false;

        submitButton.textContent =
            currentMode === "signup"
                ? "إنشاء حساب"
                : "تسجيل الدخول";
    }
});
