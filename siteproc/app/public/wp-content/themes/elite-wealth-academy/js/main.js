/**
 * Elite Wealth Academy - Main JavaScript
 * @package Elite_Wealth_Academy
 */

(function() {
    'use strict';

    // Countdown Timer
    let countdownSeconds = 10 * 60; // 10 minutes

    function updateCountdown() {
        const countdownEl = document.getElementById('countdown');
        if (!countdownEl) return;

        const minutes = Math.floor(countdownSeconds / 60);
        const seconds = countdownSeconds % 60;
        countdownEl.textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')} LEFT TO JOIN`;
        
        if (countdownSeconds > 0) {
            countdownSeconds--;
        } else {
            countdownSeconds = 10 * 60; // Reset to 10 minutes
        }
    }

    // Start countdown on page load
    if (document.getElementById('countdown')) {
        setInterval(updateCountdown, 1000);
    }

    // Testimonials Auto-Scroll
    let scrollPosition = 0;
    const track = document.getElementById('testimonialsTrack');
    let isPaused = false;

    function scrollTestimonials() {
        if (!track || isPaused) return;

        scrollPosition -= 1;
        if (Math.abs(scrollPosition) >= track.scrollWidth / 2) {
            scrollPosition = 0;
        }
        track.style.transform = `translateX(${scrollPosition}px)`;
    }

    // Clone testimonials for infinite scroll
    if (track) {
        const testimonials = track.innerHTML;
        track.innerHTML += testimonials;

        setInterval(scrollTestimonials, 30);

        // Pause on hover
        track.addEventListener('mouseenter', () => { isPaused = true; });
        track.addEventListener('mouseleave', () => { isPaused = false; });
    }

    // Member Count Animation
    let memberCount = parseInt(ewaData.memberCount.replace(/,/g, '')) || 247892;
    
    function updateMemberCount() {
        const memberCountEl = document.getElementById('memberCount');
        if (!memberCountEl) return;

        memberCount += Math.floor(Math.random() * 3) + 1;
        memberCountEl.textContent = memberCount.toLocaleString();
    }
    
    if (document.getElementById('memberCount')) {
        setInterval(updateMemberCount, 5000);
    }

    // Modal Functions
    window.openModal = function() {
        const modal = document.getElementById('emailModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    };

    window.closeModal = function() {
        const modal = document.getElementById('emailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    window.handleSubmit = function(event) {
        event.preventDefault();
        const emailInput = document.getElementById('emailInput');
        const email = emailInput.value;

        // Send AJAX request to WordPress
        const formData = new FormData();
        formData.append('action', 'capture_email');
        formData.append('email', email);
        formData.append('nonce', ewaData.nonce);

        fetch(ewaData.ajaxUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Thank you! Check ${email} for next steps.`);
                closeModal();
                
                // Redirect to checkout or payment page
                if (data.data.redirect) {
                    window.location.href = data.data.redirect;
                }
            } else {
                alert('Error: ' + (data.data.message || 'Please try again'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
    };

    // Close modal on outside click
    window.onclick = function(event) {
        const modal = document.getElementById('emailModal');
        if (event.target === modal) {
            closeModal();
        }
    };

    // Smooth scroll for anchor links
    document.addEventListener('DOMContentLoaded', function() {
        // Mobile nav toggle
        const toggle = document.querySelector('.nav-toggle');
        const menu = document.querySelector('.primary-nav');
        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                const open = menu.classList.toggle('open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href !== '#' && href !== '#checkout') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                        if (menu && menu.classList.contains('open')) menu.classList.remove('open');
                    }
                }
            });
        });

        // FAQ accordion toggles
        document.querySelectorAll('.faq-item').forEach(item => {
            const q = item.querySelector('.faq-question');
            const a = item.querySelector('.faq-answer');
            if (!q || !a) return;
            a.style.display = 'none';
            q.addEventListener('click', () => {
                const visible = a.style.display === 'block';
                document.querySelectorAll('.faq-answer').forEach(el => el.style.display = 'none');
                a.style.display = visible ? 'none' : 'block';
            });
            q.setAttribute('role', 'button');
            q.setAttribute('tabindex', '0');
            q.addEventListener('keypress', (ev) => { if (ev.key === 'Enter') q.click(); });
        });

        // Wins marquee auto-scroll
    const marquee = document.getElementById('winsMarquee');
    if (marquee && !prefersReduced) {
            // Clone children for seamless loop
            const clones = Array.from(marquee.children).map(el => el.cloneNode(true));
            clones.forEach(c => marquee.appendChild(c));
            let offset = 0;
            let pause = false;
            const speed = 0.5; // px per frame
            const totalWidth = Array.from(marquee.children).reduce((w, el) => w + el.getBoundingClientRect().width + 20, 0); // 20px gap

            function tick() {
                if (!pause) {
                    offset -= speed;
                    if (Math.abs(offset) >= totalWidth / 2) offset = 0;
                    marquee.style.transform = `translateX(${offset}px)`;
                }
                requestAnimationFrame(tick);
            }
            marquee.addEventListener('mouseenter', () => pause = true);
            marquee.addEventListener('mouseleave', () => pause = false);
            requestAnimationFrame(tick);
        }
    });

    // In-view animation (respects reduced motion)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.transform = 'translateY(0)';
                    entry.target.style.opacity = '1';
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.card, .glass, .campus-card, .testimonial-img').forEach(el => {
            el.style.transform = 'translateY(14px)';
            el.style.opacity = '0';
            el.style.transition = 'all .6s ease';
            observer.observe(el);
        });
    }

})();
