#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Read the file
with open('landing-page-standalone.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the dashboard-mockup section and replace it
import re

# Define the replacement HTML
new_dashboard = '''<!-- Browser Chrome -->
                    <div class="browser-chrome">
                        <div class="chrome-dots">
                            <span class="dot" style="background: #ff5f57;"></span>
                            <span class="dot" style="background: #ffbd2e;"></span>
                            <span class="dot" style="background: #28c940;"></span>
                        </div>
                        <div class="chrome-url">
                            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 13px; color: #94a3b8;">
                                <span>🔒</span>
                                <span>siteproc.app/dashboard</span>
                            </div>
                        </div>
                    </div>

                    <!-- Dashboard Content -->
                    <div class="dashboard-content">
                        <!-- Dashboard Header -->
                        <div class="dash-header">
                            <div>
                                <div style="font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 4px;">Dashboard</div>
                                <div style="font-size: 14px; color: #94a3b8;">Welcome back! Here's your project overview.</div>
                            </div>
                            <button class="dash-button">+ New Project</button>
                        </div>

                        <!-- Stats Grid -->
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon" style="background: rgba(37, 99, 235, 0.2); color: #2563eb;">📊</div>
                                <div>
                                    <div class="stat-label">Active Projects</div>
                                    <div class="stat-value">24</div>
                                    <div class="stat-change positive">+12% from last month</div>
                                </div>
                            </div>

                            <div class="stat-card">
                                <div class="stat-icon" style="background: rgba(34, 197, 94, 0.2); color: #22c55e;">💰</div>
                                <div>
                                    <div class="stat-label">Total Budget</div>
                                    <div class="stat-value">$2.4M</div>
                                    <div class="stat-change positive">+8% this quarter</div>
                                </div>
                            </div>

                            <div class="stat-card">
                                <div class="stat-icon" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">🚚</div>
                                <div>
                                    <div class="stat-label">Deliveries</div>
                                    <div class="stat-value">156</div>
                                    <div class="stat-change positive">+24 this week</div>
                                </div>
                            </div>

                            <div class="stat-card">
                                <div class="stat-icon" style="background: rgba(168, 85, 247, 0.2); color: #a855f7;">📦</div>
                                <div>
                                    <div class="stat-label">Orders</div>
                                    <div class="stat-value">342</div>
                                    <div class="stat-change">Processing</div>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Activity Chart -->
                        <div class="activity-section">
                            <div style="font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 16px;">Recent Activity</div>
                            <div class="activity-chart">
                                <div class="chart-bar" style="height: 45%; background: linear-gradient(180deg, #2563eb, rgba(37, 99, 235, 0.6));">
                                    <div class="bar-label">Mon</div>
                                </div>
                                <div class="chart-bar" style="height: 70%; background: linear-gradient(180deg, #2563eb, rgba(37, 99, 235, 0.6));">
                                    <div class="bar-label">Tue</div>
                                </div>
                                <div class="chart-bar" style="height: 55%; background: linear-gradient(180deg, #2563eb, rgba(37, 99, 235, 0.6));">
                                    <div class="bar-label">Wed</div>
                                </div>
                                <div class="chart-bar" style="height: 85%; background: linear-gradient(180deg, #2563eb, rgba(37, 99, 235, 0.6));">
                                    <div class="bar-label">Thu</div>
                                </div>
                                <div class="chart-bar" style="height: 65%; background: linear-gradient(180deg, #2563eb, rgba(37, 99, 235, 0.6));">
                                    <div class="bar-label">Fri</div>
                                </div>
                                <div class="chart-bar" style="height: 40%; background: linear-gradient(180deg, #64748b, rgba(100, 116, 139, 0.6)); opacity: 0.5;">
                                    <div class="bar-label">Sat</div>
                                </div>
                                <div class="chart-bar" style="height: 35%; background: linear-gradient(180deg, #64748b, rgba(100, 116, 139, 0.6)); opacity: 0.5;">
                                    <div class="bar-label">Sun</div>
                                </div>
                            </div>
                        </div>
                    </div>'''

# Find and replace the dashboard-mockup section
pattern = r'<div class="dashboard-mockup">.*?</div>\s*</div>\s*</div>'
content = re.sub(pattern, new_dashboard + '\n                </div>', content, flags=re.DOTALL)

# Write back the file
with open('landing-page-standalone.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard updated successfully!")
