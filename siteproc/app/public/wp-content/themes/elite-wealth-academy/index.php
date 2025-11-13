<?php
/** Main Template */
get_header(); ?>

<main id="main" role="main">
	<!-- SaaS Hero -->
	<section class="hero" aria-label="Intro">
		<div class="hero-inner">
			<div class="hero-content">
				<h1 class="hero-title">The Only <span class="hero-highlight">All In One</span> Growth System For Your Construction Business</h1>
				<p class="hero-sub">Automate lead capture, optimize operations, and track performance across bids, crews, and cash flow in one unified dashboard.</p>
				<div class="hero-actions">
					<a href="#specializations" class="btn btn-primary" aria-label="See how it works">See How It Works</a>
				</div>
				<p class="hero-note">No long-term contracts. Implementation support included.</p>
			</div>
			<div class="hero-aside">
				<div class="floating-cards">
					<div class="float-card stat">
						<div class="fc-label">Total Subscribers</div>
						<div class="fc-value">61,000</div>
					</div>
					<div class="float-card chart">
						<div class="fc-label">Revenue Growth</div>
						<div class="mini-bars">
							<span style="height:46%"></span>
							<span style="height:72%"></span>
							<span style="height:38%"></span>
							<span style="height:86%"></span>
						</div>
					</div>
					<div class="float-card analytics">
						<div class="fc-label">Data Analytics</div>
						<div class="mini-line">
							<svg viewBox="0 0 120 40" preserveAspectRatio="none"><polyline points="0,32 12,30 24,26 36,18 48,12 60,22 72,10 84,14 96,8 108,6 120,4" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>
						</div>
					</div>
					<div class="float-card visitors">
						<div class="fc-label">Daily Visitors</div>
						<div class="fc-value">800+</div>
					</div>
				</div>
			</div>
		</div>
		<div class="hero-bg" aria-hidden="true"></div>
	</section>

	<section id="results" class="section">
		<div class="container">
			<h1 class="section-title">Welcome</h1>
			<p class="section-desc">This is your theme’s main template. Header links below will scroll to their sections.</p>
			<div id="memberCount" class="metric">247,892</div>
		</div>
	</section>

	<section id="specializations" class="section">
		<div class="container">
			<h2 class="section-title">Programs</h2>
			<p class="section-desc">Add your program cards here.</p>
		</div>
	</section>

	<section id="consultation" class="section">
		<div class="container">
			<h2 class="section-title">Book a Consultation</h2>
			<p class="section-desc">Connect your booking link to the header CTA.</p>
		</div>
	</section>

	<section id="faq" class="section">
		<div class="container">
			<h2 class="section-title">FAQ</h2>
			<div class="faq-item">
				<div class="faq-question">What do I get?</div>
				<div class="faq-answer">Coaching, templates, and step-by-step systems.</div>
			</div>
		</div>
	</section>
</main>

<?php get_footer();

