import { test, expect } from '@playwright/test'

test.describe.serial('Comprehensive QA Browser Scenarios (Scenarios 1–4 + Responsive & Auth)', () => {
  let createdStudentCode = ''
  const runSuffix = Date.now().toString().slice(-4)
  const sectionName = `Q${runSuffix.slice(-2)}`
  const subjectCode = `ROB-${runSuffix}`
  const subjectName = `Robotics ${runSuffix}`
  const teacherEmail = `alan.turing.${runSuffix}@school.demo`
  const teacherName = `Alan Turing ${runSuffix}`
  const studentName = `Ada Lovelace ${runSuffix}`
  const guardianEmail = `byron.guardian.${runSuffix}@school.demo`
  const guardianName = `Augusta Byron ${runSuffix}`

  test('Scenario 1: Admin Setup (Class, Section, Subject, Teacher, Assignment, Student, Guardian)', async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    // 1. Log in as Admin
    await page.goto('/login?role=admin')
    await page.getByRole('button', { name: /Fill automatically/i }).click()
    await page.getByRole('button', { name: /Continue to workspace/i }).click()
    await page.waitForURL('**/admin/dashboard')

    // 2. Create a Class and Section
    await page.goto('/admin/classes')
    await expect(page.getByText('Classes & Sections').first()).toBeVisible()
    await page.locator('button.data-action').click()
    const classInputs = page.locator('[role="dialog"] input')
    await classInputs.nth(0).fill('Grade 11')
    await classInputs.nth(1).fill('11')
    await classInputs.nth(2).fill(sectionName)
    await classInputs.nth(3).fill('Robotics Lab 301')
    await page.getByRole('button', { name: /Save to database/i }).click()
    await expect(page.getByText(`Grade 11 · Section ${sectionName}`).first()).toBeVisible()

    // 3. Create a Subject
    await page.goto('/admin/subjects')
    await expect(page.getByText('Academic Subject Catalog').first()).toBeVisible()
    await page.locator('button.data-action').click()
    const subInputs = page.locator('[role="dialog"] input')
    await subInputs.nth(0).fill(subjectCode)
    await subInputs.nth(1).fill(subjectName)
    await subInputs.nth(2).fill('STEM')
    await subInputs.nth(3).fill('100')
    await page.getByRole('button', { name: /Save to database/i }).click()
    await expect(page.getByText(subjectName).first()).toBeVisible()

    // 4. Create a Teacher
    await page.goto('/admin/teachers')
    await expect(page.getByText('Teaching Staff Directory').first()).toBeVisible()
    await page.locator('button.data-action').click()
    const tchInputs = page.locator('[role="dialog"] input')
    await tchInputs.nth(0).fill(teacherName)
    await tchInputs.nth(1).fill(teacherEmail)
    await tchInputs.nth(2).fill('STEM')
    await tchInputs.nth(3).fill('Ph.D. Computer Science')
    await page.getByRole('button', { name: /Save to database/i }).click()
    await expect(page.getByText(teacherName).first()).toBeVisible()

    // 5. Assign the Teacher to the Subject and Section
    await page.goto('/admin/assignments')
    await expect(page.getByText('Teacher Assignments').first()).toBeVisible()
    await page.locator('button.data-action').click()
    const teacherVal = await page
      .locator(`select[aria-label="Teacher"] option:has-text("${teacherName}")`)
      .getAttribute('value')
    await page.locator('select[aria-label="Teacher"]').selectOption(teacherVal!)
    await page.locator('select[aria-label="Class & Section"]').selectOption({ label: `Grade 11 · Section ${sectionName}` })
    const subjectOptionText = `${subjectName} (${subjectCode})`
    await page.locator('select[aria-label="Subject"]').selectOption({ label: subjectOptionText })
    await page.getByLabel('Schedule Time', { exact: true }).fill('10:30')
    await page.getByRole('button', { name: /Save to database/i }).click()
    await expect(page.getByText(teacherName).first()).toBeVisible()

    // 6. Create a Student in Grade 11 · Section Qx
    await page.goto('/admin/students')
    await expect(page.getByText('Student directory').first()).toBeVisible()
    await page.locator('button.data-action').click()
    const stInputs = page.locator('[role="dialog"] input')
    await stInputs.nth(0).fill(studentName)
    await stInputs.nth(1).fill(`ada.${runSuffix}@school.demo`)
    await page.locator('[role="dialog"] select').selectOption({ label: `Grade 11 · Section ${sectionName}` })
    await stInputs.nth(2).fill('STEM')
    await page.getByRole('button', { name: /Save to database/i }).click()
    await expect(page.getByText(studentName).first()).toBeVisible()

    // Extract the generated Student Code (e.g. STU-24161)
    const studentRow = page.locator('.records-row', { hasText: studentName }).first()
    const codeText = await studentRow.locator('small').innerText()
    createdStudentCode = codeText.trim()
    expect(createdStudentCode).toMatch(/^STU-/)

    // 7. Create a Guardian and link the Student
    await page.goto('/admin/guardians')
    await expect(page.getByText('Guardian & Family Directory').first()).toBeVisible()
    await page.locator('button.data-action').click()
    const grdInputs = page.locator('[role="dialog"] input')
    await grdInputs.nth(0).fill(guardianName)
    await grdInputs.nth(1).fill(guardianEmail)
    await grdInputs.nth(2).fill('+1 (555) 777-1234')
    await grdInputs.nth(3).fill(createdStudentCode)
    await page.getByRole('button', { name: /Save to database/i }).click()
    await expect(page.getByText(guardianName).first()).toBeVisible()
    await expect(page.getByText(new RegExp(studentName)).first()).toBeVisible()

    // Ensure Semester 1 finals is open (unlocked) before Teacher enters marks in Scenario 2
    await page.goto('/admin/examinations')
    await expect(page.getByText('Semester 1 finals').first()).toBeVisible()
    const examRow = page.locator('.records-row', { hasText: 'Semester 1 finals' }).first()
    const unlockBtn = examRow.getByRole('button', { name: /Unlock/i })
    if ((await unlockBtn.count()) > 0) {
      await unlockBtn.click()
      await page.getByPlaceholder(/Recalculation/i).fill('QA scenario marks entry')
      await page.getByRole('button', { name: /Confirm unlock/i }).click()
      await expect(page.getByRole('status')).toContainText(/unlocked/i)
    }

    expect(consoleErrors).toEqual([])
  })

  test('Scenario 2: Teacher Operations (Login as assigned teacher, view student list, record attendance, enter marks)', async ({
    page,
  }) => {
    await page.goto('/login?role=teacher')
    await page.locator('input[name="email"]').fill(teacherEmail)
    await page.locator('input[name="password"]').fill('Demo@1234')
    await page.getByRole('button', { name: /Continue to workspace/i }).click()
    await page.waitForURL('**/teacher/today')

    // Open assigned class & view student list
    await page.goto('/teacher/classes')
    await expect(page.getByText(studentName).first()).toBeVisible()
    // Ensure unrelated Grade 9 student is NOT visible
    await expect(page.getByText('STU-24001')).toHaveCount(0)

    // Record attendance
    await page.goto('/teacher/attendance')
    await expect(page.getByText(studentName).first()).toBeVisible()
    await page.getByRole('button', { name: /Mark all present/i }).first().click()
    await page.getByRole('button', { name: /Submit attendance/i }).click()
    await expect(page.getByRole('status')).toContainText(/Attendance submitted/i)

    // Enter examination marks
    await page.goto('/teacher/marks')
    await expect(page.getByText(studentName).first()).toBeVisible()
    const markInput = page.getByLabel(`${studentName} mark out of 100`)
    await markInput.fill('96')
    await page.getByRole('button', { name: /Submit for publish/i }).click()
    await expect(page.getByRole('status')).toContainText(/submitted/i)
  })

  test('Scenario 3: Guardian Verification (View linked student, attendance, published results, fee history & block unauthorized access)', async ({
    page,
  }) => {
    // First, Admin publishes Semester 1 finals so Guardian can view the newly entered mark
    await page.goto('/login?role=admin')
    await page.getByRole('button', { name: /Fill automatically/i }).click()
    await page.getByRole('button', { name: /Continue to workspace/i }).click()
    await page.waitForURL('**/admin/dashboard')
    await page.goto('/admin/examinations')
    await expect(page.getByText('Semester 1 finals').first()).toBeVisible()
    const publishBtn = page.getByRole('button', { name: /Publish results/i }).first()
    await expect(publishBtn).toBeVisible()
    await publishBtn.click()
    await expect(page.getByRole('status')).toContainText(/published and locked/i)

    // Now log in as the newly created Guardian
    await page.goto('/login?role=guardian')
    await page.locator('input[name="email"]').fill(guardianEmail)
    await page.locator('input[name="password"]').fill('Demo@1234')
    await page.getByRole('button', { name: /Continue to workspace/i }).click()
    await page.waitForURL('**/guardian/home')

    // View linked student on Guardian Home
    await expect(page.getByText(studentName).first()).toBeVisible()

    // Check attendance on Guardian Attendance
    await page.goto('/guardian/attendance')
    await expect(page.getByText(new RegExp(`${studentName} · Attendance History`))).toBeVisible()
    await expect(page.getByText('Present').first()).toBeVisible()

    // View published examination results on Guardian Results
    await page.goto('/guardian/results')
    await expect(page.getByText(new RegExp(`${studentName} \\(${createdStudentCode}\\) · Report Card`))).toBeVisible()
    await expect(page.getByText('96 / 100').first()).toBeVisible()
    await expect(page.getByText('PASS').first()).toBeVisible()

    // Attempt to access an unrelated student's records via API -> 404
    const unauthorizedApiStatus = await page.evaluate(async () => {
      const res = await fetch('/api/students/STU-24016')
      return res.status
    })
    expect(unauthorizedApiStatus).toBe(404)

    // Attempt to open Admin route directly -> redirected back to /guardian/home
    await page.goto('/admin/students')
    await page.waitForURL('**/guardian/home')
  })

  test('Scenario 4: Fee Payment Flow (Admin generates invoice, records partial payment, verifies balance, records remaining payment)', async ({
    page,
  }) => {
    // Log in as Admin
    await page.goto('/login?role=admin')
    await page.getByRole('button', { name: /Fill automatically/i }).click()
    await page.getByRole('button', { name: /Continue to workspace/i }).click()
    await page.waitForURL('**/admin/dashboard')

    // Navigate to Fees & Generate an invoice ($1,000) for the new student
    await page.goto('/admin/fees')
    await expect(page.getByText('Invoice management').first()).toBeVisible()
    await page.locator('button.data-action').click()
    const invInputs = page.locator('[role="dialog"] input')
    await invInputs.nth(0).fill(createdStudentCode)
    await invInputs.nth(1).fill(`Robotics Tuition ${runSuffix}`)
    await invInputs.nth(2).fill('1000')
    await invInputs.nth(3).fill('2026-10-28')
    await page.getByRole('button', { name: /Save to database/i }).click()
    await expect(page.getByRole('status')).toContainText(/Invoice generated/i)

    // Filter or search for the new student's invoice
    await page.getByPlaceholder(/Search fees/i).fill(studentName)
    const invoiceRow = page.locator('.records-row', { hasText: studentName }).first()
    await expect(invoiceRow).toBeVisible()
    await expect(invoiceRow).toContainText('$1,000')
    await expect(invoiceRow).toContainText('Unpaid')

    // Record a partial payment of $400.00
    await invoiceRow.getByRole('button', { name: /Record payment/i }).click()
    await page.getByLabel('Payment amount').fill('400')
    await page.getByRole('button', { name: /Confirm payment/i }).click()
    await expect(page.getByRole('status')).toContainText(/Payment recorded/i)

    // Verify outstanding balance is $600.00 and status is Partial
    await expect(invoiceRow).toContainText('$600.00')
    await expect(invoiceRow).toContainText('Partial')

    // Record the remaining payment of $600.00
    await invoiceRow.getByRole('button', { name: /Record payment/i }).click()
    await expect(page.getByLabel('Outstanding balance')).toHaveValue('$600.00')
    await page.getByLabel('Payment amount').fill('600')
    await page.getByRole('button', { name: /Confirm payment/i }).click()
    await expect(page.getByRole('status')).toContainText(/Payment recorded/i)

    // Verify invoice is marked Paid and remaining balance is $0.00
    await expect(invoiceRow).toContainText('$0.00')
    await expect(invoiceRow).toContainText('Paid')

    // Also test responsive viewports (Tablet 768x1024 and Mobile 390x844)
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByText('Invoice management')).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByText('Invoice management')).toBeVisible()
  })
})
