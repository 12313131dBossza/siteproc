    <!-- Footer -->
    <footer>
        <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>. All rights reserved.</p>
        <div>
            <a href="<?php echo esc_url(home_url('/terms')); ?>">Terms of Service</a>
            <a href="<?php echo esc_url(home_url('/privacy')); ?>">Privacy Policy</a>
            <a href="<?php echo esc_url(home_url('/contact')); ?>">Contact</a>
        </div>
    </footer>

    <!-- Email Capture Modal -->
    <div class="modal" id="emailModal">
        <div class="modal-content">
            <span class="modal-close" onclick="closeModal()">&times;</span>
            <h2>Join Elite Wealth Academy</h2>
            <p style="color: #FFFFFF; margin-bottom: 20px;">Enter your email to get started</p>
            <form id="emailForm" onsubmit="handleSubmit(event)">
                <input type="email" id="emailInput" placeholder="your.email@example.com" required>
                <button type="submit" class="cta-button">GET INSTANT ACCESS</button>
            </form>
        </div>
    </div>

    <?php wp_footer(); ?>
</body>
</html>
