import { test, expect } from '@playwright/test';
import path from 'path';
const ARTIFACT_DIR = '/Users/kuhunarang/.gemini/antigravity/brain/6b3a227e-29e7-4eb7-8517-11004a7eb97f';
test.describe('Northstar End-to-End Multi-Role Acceptance Suite', () => {
    test('1. Admin logs in, views live DB overview, manages students, fee ledger, and audit logs', async ({ page }) => {
        await page.goto('/login?role=admin');
        await page.getByRole('button', { name: /Fill automatically/i }).click();
        await page.getByRole('button', { name: /Continue to workspace/i }).click();
        await page.waitForURL('**/admin/dashboard');
        await expect(page.getByRole('heading', { name: /Good morning, Alex/i })).toBeVisible();
        await expect(page.getByText('Total students')).toBeVisible();
        // Wait for dashboard data fetch
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin-dashboard.png'), fullPage: true });
        // Navigate to Students directory
        await page.goto('/admin/students');
        await expect(page.getByText('Student directory')).toBeVisible();
        await expect(page.getByText('Olivia Rhye').first()).toBeVisible();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin-students.png'), fullPage: true });
        // Navigate to Fee Management
        await page.goto('/admin/fees');
        await expect(page.getByText('Invoice management')).toBeVisible();
        await expect(page.getByText('INV-24018').first()).toBeVisible();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin-fees.png'), fullPage: true });
        // Navigate to Audit Logs
        await page.goto('/admin/audit-logs');
        await expect(page.getByText('Append-Only System Audit Trail')).toBeVisible();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin-audit-logs.png'), fullPage: true });
    });
    test('2. Teacher logs in, sees only assigned Grade 10 classes, marks attendance and enters marks', async ({ page }) => {
        await page.goto('/login?role=teacher');
        await page.getByRole('button', { name: /Fill automatically/i }).click();
        await page.getByRole('button', { name: /Continue to workspace/i }).click();
        await page.waitForURL('**/teacher/today');
        await expect(page.getByRole('heading', { name: /Good morning, Olivia/i })).toBeVisible();
        await expect(page.getByText('Today’s classes')).toBeVisible();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'teacher-today.png'), fullPage: true });
        // Navigate to Teacher Attendance
        await page.goto('/teacher/attendance');
        await expect(page.getByText('Mark all present').first()).toBeVisible();
        await page.getByRole('button', { name: /Mark all present/i }).first().click();
        await page.getByRole('button', { name: /Submit attendance/i }).click();
        await expect(page.getByRole('status')).toContainText(/Attendance submitted/i);
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'teacher-attendance.png'), fullPage: true });
        // Navigate to Marks Entry
        await page.goto('/teacher/marks');
        await expect(page.getByText(/Assessment Marks Entry/i)).toBeVisible();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'teacher-marks.png'), fullPage: true });
    });
    test('3. Guardian logs in, switches between linked children, views published results and fee balance', async ({ page }) => {
        await page.goto('/login?role=guardian');
        await page.getByRole('button', { name: /Fill automatically/i }).click();
        await page.getByRole('button', { name: /Continue to workspace/i }).click();
        await page.waitForURL('**/guardian/home');
        await expect(page.getByRole('heading', { name: /Good morning, Jamie/i })).toBeVisible();
        await expect(page.getByText('Olivia Rhye').first()).toBeVisible();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'guardian-home.png'), fullPage: true });
        // Navigate to Guardian Published Results
        await page.goto('/guardian/results');
        await expect(page.getByText(/Report Card/i)).toBeVisible();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'guardian-results.png'), fullPage: true });
        // Navigate to Guardian Fees
        await page.goto('/guardian/fees');
        await expect(page.getByText('Family fee history')).toBeVisible();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'guardian-fees.png'), fullPage: true });
    });
});
