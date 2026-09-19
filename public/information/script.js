"use strict";


/* =========================
   MOBILE MENU
========================= */

const menuButton = document.querySelector("#menuButton");
const mobileNav = document.querySelector("#mobileNav");

if (menuButton && mobileNav) {

    menuButton.addEventListener("click", () => {

        const isOpen = mobileNav.classList.toggle("active");

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

    });


    mobileNav.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            mobileNav.classList.remove("active");

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

        });

    });

}


/* =========================
   SCROLL REVEAL
========================= */

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
    entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("visible");

            revealObserver.unobserve(entry.target);

        });

    },
    {
        threshold: 0.12
    }
);


revealElements.forEach(element => {
    revealObserver.observe(element);
});


/* =========================
   BACK TO TOP
========================= */

const backTop = document.querySelector("#backTop");

if (backTop) {

    window.addEventListener(
        "scroll",
        () => {

            if (window.scrollY > 500) {
                backTop.classList.add("visible");
            } else {
                backTop.classList.remove("visible");
            }

        },
        {
            passive: true
        }
    );


    backTop.addEventListener("click", () => {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

}


/* =========================
   HEADER SHADOW
========================= */

const header = document.querySelector(".site-header");

if (header) {

    window.addEventListener(
        "scroll",
        () => {

            if (window.scrollY > 20) {

                header.style.boxShadow =
                    "0 8px 30px rgba(11, 23, 38, .06)";

            } else {

                header.style.boxShadow = "none";

            }

        },
        {
            passive: true
        }
    );

}


/* =========================
   FAQ
========================= */

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {

    item.addEventListener("toggle", () => {

        if (!item.open) {
            return;
        }

        faqItems.forEach(otherItem => {

            if (
                otherItem !== item &&
                otherItem.open
            ) {
                otherItem.open = false;
            }

        });

    });

});