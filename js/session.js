
import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

// متابعة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {

    const loginLinks = document.querySelectorAll(".login-btn");
    const signupLinks = document.querySelectorAll(".signup-btn");

    // تحديث زر تسجيل الدخول أو حسابي
    loginLinks.forEach((link) => {
        if (user) {
            link.textContent = "حسابي";
            link.href = "account.html";
        } else {
            link.textContent = "تسجيل الدخول";
            link.href = "auth.html";
        }
    });

    // إخفاء إنشاء الحساب عند تسجيل الدخول
    signupLinks.forEach((link) => {
        link.hidden = !!user;
    });

});

// تسجيل الخروج
window.logoutLuqta = async function () {
    try {
        await signOut(auth);
        window.location.href = "index.html";

    } catch (error) {
        console.error("Logout error:", error);
        alert("تعذر تسجيل الخروج، حاولي مرة أخرى.");
    }
};
