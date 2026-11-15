import bcrypt from 'bcryptjs'
import { prisma, connectDB } from './db'

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'NS'
}

export async function seedDatabase() {
  console.log('🌱 Starting Northstar Academy MongoDB Atlas seed...')
  await connectDB()

  // Clean all collections in parallel
  await Promise.all([
    prisma.auditLog.deleteMany(),
    prisma.feePayment.deleteMany(),
    prisma.feeInvoice.deleteMany(),
    prisma.feeStructure.deleteMany(),
    prisma.feeCategory.deleteMany(),
    prisma.markEntry.deleteMany(),
    prisma.examSubject.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.gradeBand.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.studentGuardian.deleteMany(),
    prisma.student.deleteMany(),
    prisma.teacherAssignment.deleteMany(),
    prisma.classSubject.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.section.deleteMany(),
    prisma.schoolClass.deleteMany(),
    prisma.guardianProfile.deleteMany(),
    prisma.teacherProfile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.schoolSetting.deleteMany(),
  ])

  const passwordHash = await bcrypt.hash('Demo@1234', 10)

  // 0. School Settings
  await prisma.schoolSetting.create({
    data: {
      id: 'default',
      schoolName: 'Northstar Academy',
      city: 'Springfield, IL',
      academicYear: '2026-2027',
      currentTerm: 'Term 2',
      attendanceLockAfterDays: 0,
      contactEmail: 'hello@northstar.school',
    },
  })

  // 1. Grade Bands (Configurable DB Rules)
  const gradeBandsData = [
    { grade: 'A+', minPercentage: 95, maxPercentage: 100, gpaPoints: 4.0, isPassing: true, sortOrder: 1 },
    { grade: 'A', minPercentage: 90, maxPercentage: 94.99, gpaPoints: 4.0, isPassing: true, sortOrder: 2 },
    { grade: 'A−', minPercentage: 85, maxPercentage: 89.99, gpaPoints: 3.7, isPassing: true, sortOrder: 3 },
    { grade: 'B+', minPercentage: 80, maxPercentage: 84.99, gpaPoints: 3.3, isPassing: true, sortOrder: 4 },
    { grade: 'B', minPercentage: 70, maxPercentage: 79.99, gpaPoints: 3.0, isPassing: true, sortOrder: 5 },
    { grade: 'C', minPercentage: 55, maxPercentage: 69.99, gpaPoints: 2.0, isPassing: true, sortOrder: 6 },
    { grade: 'D', minPercentage: 40, maxPercentage: 54.99, gpaPoints: 1.0, isPassing: true, sortOrder: 7 },
    { grade: 'F', minPercentage: 0, maxPercentage: 39.99, gpaPoints: 0.0, isPassing: false, sortOrder: 8 },
  ]
  await prisma.gradeBand.createMany({ data: gradeBandsData })

  // 2. Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@school.demo',
      passwordHash,
      name: 'Alex Rivera',
      initials: 'AR',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+1 (555) 100-0001',
    },
  })

  // 3. 5 Teachers (teacher@school.demo + 4 more)
  const teachersSpec = [
    { email: 'teacher@school.demo', name: 'Olivia Rhye', code: 'TCH-1001', dept: 'Science', qual: 'M.Sc. Biology' },
    { email: 'teacher2@school.demo', name: 'Marcus Vance', code: 'TCH-1002', dept: 'Mathematics', qual: 'M.Sc. Mathematics' },
    { email: 'teacher3@school.demo', name: 'Elena Rostova', code: 'TCH-1003', dept: 'Humanities', qual: 'M.A. English Literature' },
    { email: 'teacher4@school.demo', name: 'David Kim', code: 'TCH-1004', dept: 'Science', qual: 'M.Sc. Physics & Chemistry' },
    { email: 'teacher5@school.demo', name: 'Sophia Patel', code: 'TCH-1005', dept: 'Technology', qual: 'M.Tech Computer Science' },
  ]

  const teachers = []
  for (const t of teachersSpec) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        passwordHash,
        name: t.name,
        initials: initialsFromName(t.name),
        role: 'TEACHER',
        status: 'ACTIVE',
        phone: `+1 (555) 200-${t.code.slice(-4)}`,
        teacherProfile: {
          create: {
            employeeCode: t.code,
            department: t.dept,
            qualification: t.qual,
          },
        },
      },
      include: { teacherProfile: true },
    })
    teachers.push(user)
  }

  // 4. 3 Classes with 2 Sections each (Grade 9 A/B, Grade 10 A/B, Grade 11 A/B)
  const classesSpec = [
    { name: 'Grade 9', gradeLevel: 9, rooms: ['Room 101', 'Room 102'] },
    { name: 'Grade 10', gradeLevel: 10, rooms: ['Science lab', 'Room 204'] },
    { name: 'Grade 11', gradeLevel: 11, rooms: ['Room 301', 'Room 302'] },
  ]

  const schoolClasses: Array<{
    id: string
    name: string
    gradeLevel: number
    sections: Array<{ id: string; name: string; room: string; classId: string }>
  }> = []

  for (const c of classesSpec) {
    const created = await prisma.schoolClass.create({
      data: {
        name: c.name,
        gradeLevel: c.gradeLevel,
        academicYear: '2026-2027',
        sections: {
          create: [
            { name: 'A', room: c.rooms[0], capacity: 35 },
            { name: 'B', room: c.rooms[1], capacity: 35 },
          ],
        },
      },
      include: { sections: { orderBy: { name: 'asc' } } },
    })
    schoolClasses.push(created)
  }

  // 5. 6 Subjects
  const subjectsSpec = [
    { code: 'BIO-101', name: 'Biology', department: 'Science' },
    { code: 'MAT-101', name: 'Mathematics', department: 'Mathematics' },
    { code: 'ENG-101', name: 'English Literature', department: 'Humanities' },
    { code: 'PHY-101', name: 'Physics', department: 'Science' },
    { code: 'HIS-101', name: 'World History', department: 'Humanities' },
    { code: 'CSC-101', name: 'Computer Science', department: 'Technology' },
  ]

  const subjects = []
  for (const s of subjectsSpec) {
    const sub = await prisma.subject.create({
      data: {
        code: s.code,
        name: s.name,
        department: s.department,
        maxMarksDefault: 100,
        passingMarksDefault: 40,
      },
    })
    subjects.push(sub)
  }

  // Map all 6 subjects to all 3 classes
  const classSubjectsBatch = []
  for (const cls of schoolClasses) {
    for (const sub of subjects) {
      classSubjectsBatch.push({
        classId: cls.id,
        subjectId: sub.id,
      })
    }
  }
  await prisma.classSubject.createMany({ data: classSubjectsBatch })

  // 6. Teacher Assignments
  const g9 = schoolClasses[0]
  const g10 = schoolClasses[1]
  const g11 = schoolClasses[2]

  const [bio, math, eng, phy, his, csc] = subjects
  const [t1, t2, t3, t4, t5] = teachers.map((t) => t.teacherProfile!)

  const assignmentsData = [
    { teacherId: t1.id, classId: g10.id, sectionId: g10.sections[0].id, subjectId: bio.id, scheduleTime: '08:30', scheduleRoom: 'Science lab', isHomeroom: true },
    { teacherId: t1.id, classId: g10.id, sectionId: g10.sections[1].id, subjectId: bio.id, scheduleTime: '10:15', scheduleRoom: 'Room 204', isHomeroom: false },
    { teacherId: t1.id, classId: g10.id, sectionId: g10.sections[0].id, subjectId: phy.id, scheduleTime: '11:45', scheduleRoom: 'Room 108', isHomeroom: false },
    { teacherId: t1.id, classId: g10.id, sectionId: g10.sections[1].id, subjectId: phy.id, scheduleTime: '01:30', scheduleRoom: 'Science lab', isHomeroom: false },

    { teacherId: t2.id, classId: g9.id, sectionId: g9.sections[0].id, subjectId: math.id, scheduleTime: '08:30', scheduleRoom: 'Room 101', isHomeroom: true },
    { teacherId: t2.id, classId: g9.id, sectionId: g9.sections[1].id, subjectId: math.id, scheduleTime: '09:30', scheduleRoom: 'Room 102', isHomeroom: false },
    { teacherId: t2.id, classId: g10.id, sectionId: g10.sections[0].id, subjectId: math.id, scheduleTime: '10:30', scheduleRoom: 'Room 204', isHomeroom: false },
    { teacherId: t2.id, classId: g10.id, sectionId: g10.sections[1].id, subjectId: math.id, scheduleTime: '11:30', scheduleRoom: 'Room 204', isHomeroom: true },
    { teacherId: t2.id, classId: g11.id, sectionId: g11.sections[0].id, subjectId: math.id, scheduleTime: '01:00', scheduleRoom: 'Room 301', isHomeroom: false },
    { teacherId: t2.id, classId: g11.id, sectionId: g11.sections[1].id, subjectId: math.id, scheduleTime: '02:00', scheduleRoom: 'Room 302', isHomeroom: false },

    { teacherId: t3.id, classId: g9.id, sectionId: g9.sections[0].id, subjectId: eng.id, scheduleTime: '10:00', scheduleRoom: 'Room 101', isHomeroom: false },
    { teacherId: t3.id, classId: g9.id, sectionId: g9.sections[1].id, subjectId: eng.id, scheduleTime: '11:00', scheduleRoom: 'Room 102', isHomeroom: true },
    { teacherId: t3.id, classId: g10.id, sectionId: g10.sections[0].id, subjectId: eng.id, scheduleTime: '09:30', scheduleRoom: 'Room 201', isHomeroom: false },
    { teacherId: t3.id, classId: g10.id, sectionId: g10.sections[1].id, subjectId: eng.id, scheduleTime: '12:30', scheduleRoom: 'Room 204', isHomeroom: false },
    { teacherId: t3.id, classId: g11.id, sectionId: g11.sections[0].id, subjectId: his.id, scheduleTime: '08:30', scheduleRoom: 'Room 301', isHomeroom: true },
    { teacherId: t3.id, classId: g11.id, sectionId: g11.sections[1].id, subjectId: his.id, scheduleTime: '09:30', scheduleRoom: 'Room 302', isHomeroom: false },

    { teacherId: t4.id, classId: g9.id, sectionId: g9.sections[0].id, subjectId: bio.id, scheduleTime: '11:30', scheduleRoom: 'Room 101', isHomeroom: false },
    { teacherId: t4.id, classId: g9.id, sectionId: g9.sections[1].id, subjectId: bio.id, scheduleTime: '01:00', scheduleRoom: 'Room 102', isHomeroom: false },
    { teacherId: t4.id, classId: g11.id, sectionId: g11.sections[0].id, subjectId: phy.id, scheduleTime: '10:15', scheduleRoom: 'Room 301', isHomeroom: false },
    { teacherId: t4.id, classId: g11.id, sectionId: g11.sections[1].id, subjectId: phy.id, scheduleTime: '11:15', scheduleRoom: 'Room 302', isHomeroom: true },

    { teacherId: t5.id, classId: g9.id, sectionId: g9.sections[0].id, subjectId: csc.id, scheduleTime: '02:00', scheduleRoom: 'Lab 1', isHomeroom: false },
    { teacherId: t5.id, classId: g10.id, sectionId: g10.sections[0].id, subjectId: csc.id, scheduleTime: '02:30', scheduleRoom: 'Lab 1', isHomeroom: false },
    { teacherId: t5.id, classId: g11.id, sectionId: g11.sections[0].id, subjectId: csc.id, scheduleTime: '03:00', scheduleRoom: 'Lab 1', isHomeroom: false },
  ]
  await prisma.teacherAssignment.createMany({ data: assignmentsData })

  // 7. 60 Students
  const featuredStudents = [
    { name: 'Olivia Rhye', code: 'STU-24018', clsIdx: 1, secIdx: 0, program: 'Science', status: 'ACTIVE' as const },
    { name: 'Phoenix Baker', code: 'STU-24017', clsIdx: 0, secIdx: 1, program: 'Arts', status: 'ACTIVE' as const },
    { name: 'Lana Steiner', code: 'STU-24016', clsIdx: 2, secIdx: 0, program: 'Commerce', status: 'REVIEW' as const },
    { name: 'Demi Wilkinson', code: 'STU-24015', clsIdx: 0, secIdx: 0, program: 'Science', status: 'ACTIVE' as const },
    { name: 'Emma Thompson', code: 'STU-24014', clsIdx: 0, secIdx: 0, program: 'Science', status: 'ACTIVE' as const },
    { name: 'Avery Johnson', code: 'STU-24013', clsIdx: 1, secIdx: 1, program: 'Arts', status: 'ACTIVE' as const },
  ]

  const firstNames = [
    'Noah', 'Liam', 'Mason', 'Ethan', 'Lucas', 'Aiden', 'Caleb', 'Nathan', 'Owen', 'Julian',
    'Sophia', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Ella', 'Scarlett', 'Grace', 'Chloe',
    'Zoe', 'Lily', 'Hannah', 'Aria', 'Nora', 'Riley', 'Hazel', 'Violet', 'Aurora', 'Savannah',
    'Leo', 'Isaac', 'Gabriel', 'Anthony', 'Dylan', 'Lincoln', 'Thomas', 'Charles', 'Ezra', 'Hudson',
    'Claire', 'Skylar', 'Lucy', 'Paisley', 'Everly', 'Anna', 'Caroline', 'Nova', 'Genesis', 'Emilia',
    'Kennedy', 'Samantha', 'Maya', 'Willow', 'Kinsley', 'Naomi', 'Aaliyah', 'Elena', 'Sarah', 'Ariana',
  ]
  const lastNames = [
    'Anderson', 'Martinez', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'White', 'Harris',
    'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
    'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Hall', 'Rivera',
  ]
  const programs = ['Science', 'Arts', 'Commerce']

  const allSections: Array<{ id: string; name: string; classId: string; className: string }> = []
  for (const cls of schoolClasses) {
    for (const sec of cls.sections) {
      allSections.push({ id: sec.id, name: sec.name, classId: cls.id, className: cls.name })
    }
  }

  const studentsToCreate = []
  for (let i = 0; i < 60; i++) {
    let name: string
    let studentCode: string
    let sectionObj: { id: string; name: string; classId: string; className: string }
    let program: string
    let status: 'ACTIVE' | 'REVIEW'

    if (i < featuredStudents.length) {
      const f = featuredStudents[i]
      name = f.name
      studentCode = f.code
      const cls = schoolClasses[f.clsIdx]
      const sec = cls.sections[f.secIdx]
      sectionObj = { id: sec.id, name: sec.name, classId: cls.id, className: cls.name }
      program = f.program
      status = f.status
    } else {
      const fn = firstNames[i % firstNames.length]
      const ln = lastNames[i % lastNames.length]
      name = `${fn} ${ln}`
      studentCode = `STU-${24019 + i}`
      sectionObj = allSections[i % allSections.length]
      program = programs[i % programs.length]
      status = i % 9 === 0 ? 'REVIEW' : 'ACTIVE'
    }

    const emailSlug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${i + 1}@student.northstar.demo`
    studentsToCreate.push({
      id: `student-${i + 1}`,
      studentCode,
      name,
      email: i < 6 ? `${name.toLowerCase().replaceAll(' ', '.')}@school.demo` : emailSlug,
      initials: initialsFromName(name),
      dateOfBirth: new Date(2010 - (i % 3), (i * 2) % 12, (i % 27) + 1),
      gender: i % 2 === 0 ? 'Female' : 'Male',
      program,
      status,
      classId: sectionObj.classId,
      sectionId: sectionObj.id,
      createdAt: new Date(Date.now() - (60 - i) * 60000),
    })
  }
  await prisma.student.createMany({ data: studentsToCreate })
  const createdStudents = studentsToCreate

  // 8. 45 Guardians
  const guardianNames = [
    'Jamie Morgan', 'Robert Steiner', 'Claire Wilkinson', 'Michael Thompson', 'Patricia Johnson',
    'Daniel Anderson', 'Laura Martinez', 'Steven Taylor', 'Rachel Moore', 'Kevin Jackson',
    'Angela Martin', 'Brian Lee', 'Melissa Perez', 'Jason White', 'Rebecca Harris',
  ]

  const guardianUsersBatch = []
  const guardianProfilesBatch = []
  const studentGuardianBatch = []

  for (let g = 0; g < 45; g++) {
    const gName =
      g < guardianNames.length
        ? guardianNames[g]
        : `Guardian ${firstNames[(g + 15) % firstNames.length]} ${lastNames[g % lastNames.length]}`
    const gEmail =
      g === 0
        ? 'guardian@school.demo'
        : g === 1
          ? 'guardian2@school.demo'
          : g === 2
            ? 'guardian3@school.demo'
            : `guardian${g + 1}@school.demo`
    const gCode = `GRD-${3001 + g}`
    const userId = `guardian-user-${g + 1}`
    const profileId = `guardian-profile-${g + 1}`

    guardianUsersBatch.push({
      id: userId,
      email: gEmail,
      passwordHash,
      name: gName,
      initials: initialsFromName(gName),
      role: 'GUARDIAN',
      status: 'ACTIVE',
      phone: `+1 (555) 300-${String(1000 + g)}`,
    })

    guardianProfilesBatch.push({
      id: profileId,
      guardianCode: gCode,
      userId,
      occupation: g % 3 === 0 ? 'Software Engineer' : g % 3 === 1 ? 'Physician' : 'Architect',
      address: `${100 + g} Maple Avenue, Springfield, IL`,
      emergencyPhone: `+1 (555) 900-${String(1000 + g)}`,
    })

    if (g < 15) {
      const child1 = createdStudents[g * 2]
      const child2 = createdStudents[g * 2 + 1]
      studentGuardianBatch.push(
        { studentId: child1.id, guardianId: profileId, relationship: 'Parent', isPrimary: true },
        { studentId: child2.id, guardianId: profileId, relationship: 'Parent', isPrimary: true },
      )
    } else {
      const child = createdStudents[30 + (g - 15)]
      studentGuardianBatch.push({
        studentId: child.id,
        guardianId: profileId,
        relationship: 'Parent',
        isPrimary: true,
      })
    }
  }

  await prisma.user.createMany({ data: guardianUsersBatch })
  await prisma.guardianProfile.createMany({ data: guardianProfilesBatch })
  await prisma.studentGuardian.createMany({ data: studentGuardianBatch })

  // 9. 30 Days of Attendance
  const schoolDays: Date[] = []
  const baseDate = new Date()
  baseDate.setUTCHours(0, 0, 0, 0)

  let cursor = new Date(baseDate)
  cursor.setUTCDate(cursor.getUTCDate() - 1)
  while (schoolDays.length < 30) {
    const dow = cursor.getUTCDay()
    if (dow !== 0 && dow !== 6) {
      schoolDays.push(new Date(cursor))
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  const attendanceBatch: Array<{
    studentId: string
    sectionId: string
    date: Date
    session: string
    status: 'PRESENT' | 'ABSENT' | 'LATE'
    markedById: string
  }> = []

  for (let dIdx = 0; dIdx < schoolDays.length; dIdx++) {
    const day = schoolDays[dIdx]
    for (let sIdx = 0; sIdx < createdStudents.length; sIdx++) {
      const st = createdStudents[sIdx]
      let status: 'PRESENT' | 'ABSENT' | 'LATE' = 'PRESENT'
      if (st.studentCode === 'STU-24016') {
        if (dIdx % 8 === 0) status = 'ABSENT'
        else if (dIdx % 9 === 0) status = 'LATE'
      } else if (st.studentCode === 'STU-24018') {
        if (dIdx === 14) status = 'LATE'
      } else if (st.studentCode === 'STU-24017') {
        if (dIdx === 7 || dIdx === 21) status = 'ABSENT'
      } else {
        const hash = (sIdx * 17 + dIdx * 31) % 100
        if (hash < 4) status = 'ABSENT'
        else if (hash < 7) status = 'LATE'
      }

      attendanceBatch.push({
        studentId: st.id,
        sectionId: st.sectionId,
        date: day,
        session: 'DAILY',
        status,
        markedById: teachers[0].id,
      })
    }
  }

  await prisma.attendanceRecord.createMany({ data: attendanceBatch })

  // 10. Exams: 1 PUBLISHED exam ("Midterm assessments") and 1 DRAFT exam ("Semester 1 finals")
  const publishedExam = await prisma.exam.create({
    data: {
      name: 'Midterm assessments',
      term: 'Term 2',
      academicYear: '2026-2027',
      startDate: new Date('2026-10-28T00:00:00.000Z'),
      endDate: new Date('2026-11-04T00:00:00.000Z'),
      status: 'PUBLISHED',
      locked: true,
      createdById: adminUser.id,
    },
  })

  const draftExam = await prisma.exam.create({
    data: {
      name: 'Semester 1 finals',
      term: 'Term 2',
      academicYear: '2026-2027',
      startDate: new Date('2026-12-08T00:00:00.000Z'),
      endDate: new Date('2026-12-16T00:00:00.000Z'),
      status: 'DRAFT',
      locked: false,
      createdById: adminUser.id,
    },
  })

  const coreSubjects = [bio, math, eng, phy]
  const examSubjectsBatch = []
  const marksBatch = []

  for (const exam of [publishedExam, draftExam]) {
    for (const cls of schoolClasses) {
      for (const sub of coreSubjects) {
        const examSubId = `es-${exam.id}-${cls.id}-${sub.id}`
        examSubjectsBatch.push({
          id: examSubId,
          examId: exam.id,
          classId: cls.id,
          subjectId: sub.id,
          maxMarks: 100,
          passingMarks: 40,
          examDate: exam.startDate,
        })

        const classStudents = createdStudents.filter((s) => s.classId === cls.id)
        for (let idx = 0; idx < classStudents.length; idx++) {
          const st = classStudents[idx]
          if (exam.status === 'PUBLISHED') {
            let score = 78 + ((idx * 7 + sub.name.length * 3) % 20)
            if (st.studentCode === 'STU-24018' && sub.id === bio.id) score = 88
            if (st.studentCode === 'STU-24017' && sub.id === bio.id) score = 83
            if (st.studentCode === 'STU-24016' && sub.id === math.id) score = 64
            marksBatch.push({
              examSubjectId: examSubId,
              studentId: st.id,
              marksObtained: Math.min(100, score),
              status: 'PUBLISHED',
              enteredById: teachers[0].id,
              remarks: score >= 85 ? 'Excellent mastery of concepts' : 'Good progress',
            })
          } else if (idx < 4 && cls.id === g10.id && sub.id === bio.id) {
            marksBatch.push({
              examSubjectId: examSubId,
              studentId: st.id,
              marksObtained: 85 + idx * 3,
              status: 'DRAFT',
              enteredById: teachers[0].id,
              remarks: 'Draft score',
            })
          }
        }
      }
    }
  }

  await prisma.examSubject.createMany({ data: examSubjectsBatch })
  await prisma.markEntry.createMany({ data: marksBatch })

  // 11. Fee Categories, Structures, Invoices & Payments
  const tuitionCat = await prisma.feeCategory.create({
    data: { name: 'Tuition Fee', description: 'Standard term academic tuition' },
  })
  const activityCat = await prisma.feeCategory.create({
    data: { name: 'Activity & Lab Fee', description: 'Science lab, sports, and arts activities' },
  })

  const tuitionStructure = await prisma.feeStructure.create({
    data: {
      name: 'Term 2 Tuition',
      categoryId: tuitionCat.id,
      amountCents: 125000,
      academicTerm: 'Term 2',
      dueDate: new Date('2026-10-28T00:00:00.000Z'),
    },
  })

  const activityStructure = await prisma.feeStructure.create({
    data: {
      name: 'Activity Fee',
      categoryId: activityCat.id,
      amountCents: 18000,
      academicTerm: 'Term 2',
      dueDate: new Date('2026-10-25T00:00:00.000Z'),
    },
  })

  const invoicesBatch = []
  const paymentsBatch = []

  for (let i = 0; i < 24; i++) {
    const st = createdStudents[i]
    const invoiceNo =
      i === 0
        ? 'INV-24018'
        : i === 1
          ? 'INV-24017'
          : i === 2
            ? 'INV-24016'
            : `INV-${24020 + i}`

    const isActivity = i === 1
    const totalCents = isActivity ? 18000 : 125000
    const title = isActivity ? 'Activity fee' : 'Term 2 tuition'
    const dueDate = isActivity
      ? new Date('2026-10-25T00:00:00.000Z')
      : new Date('2026-10-28T00:00:00.000Z')

    let status: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID'
    if (i === 2 || (i >= 9 && i <= 17)) status = 'PAID'
    else if (i >= 3 && i <= 8) status = 'PARTIAL'

    const invId = `invoice-${i + 1}`
    invoicesBatch.push({
      id: invId,
      invoiceNo,
      studentId: st.id,
      structureId: isActivity ? activityStructure.id : tuitionStructure.id,
      title,
      description: title,
      dueDate,
      totalCents,
      status,
    })

    if (status === 'PAID') {
      paymentsBatch.push({
        receiptNo: `RCP-${5000 + i}`,
        invoiceId: invId,
        amountCents: totalCents,
        method: i % 2 === 0 ? 'BANK_TRANSFER' : 'CARD',
        type: 'PAYMENT',
        recordedById: adminUser.id,
      })
    } else if (status === 'PARTIAL') {
      paymentsBatch.push({
        receiptNo: `RCP-${5000 + i}`,
        invoiceId: invId,
        amountCents: 50000,
        method: 'BANK_TRANSFER',
        type: 'PAYMENT',
        recordedById: adminUser.id,
      })
    }
  }

  await prisma.feeInvoice.createMany({ data: invoicesBatch })
  await prisma.feePayment.createMany({ data: paymentsBatch })

  // 12. Seed initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: adminUser.id,
        actorName: adminUser.name,
        actorRole: 'ADMIN',
        action: 'STUDENT_CREATED',
        entityType: 'Student',
        entityId: createdStudents[4].studentCode,
        beforeSummary: null,
        afterSummary: 'Enrolled Emma Thompson in Grade 9 · Section A',
      },
      {
        actorId: teachers[0].id,
        actorName: teachers[0].name,
        actorRole: 'TEACHER',
        action: 'ATTENDANCE_RECORDED',
        entityType: 'Section',
        entityId: g10.sections[0].id,
        beforeSummary: null,
        afterSummary: 'Submitted daily attendance for Grade 10 · Section A',
      },
      {
        actorId: adminUser.id,
        actorName: adminUser.name,
        actorRole: 'ADMIN',
        action: 'EXAM_PUBLISHED',
        entityType: 'Exam',
        entityId: publishedExam.id,
        beforeSummary: 'status=SUBMITTED',
        afterSummary: 'status=PUBLISHED (Midterm assessments)',
      },
      {
        actorId: adminUser.id,
        actorName: adminUser.name,
        actorRole: 'ADMIN',
        action: 'PAYMENT_RECORDED',
        entityType: 'FeeInvoice',
        entityId: 'INV-24016',
        beforeSummary: 'status=UNPAID, paid=$0.00',
        afterSummary: 'status=PAID, paid=$1,250.00 (RCP-5002)',
      },
    ],
  })

  console.log(
    '✅ MongoDB Atlas seed completed: 1 Admin, 5 Teachers, 3 Classes (6 Sections), 6 Subjects, 60 Students, 45 Guardians, 30 days Attendance, 2 Exams, Grade Bands, and Fee Invoices/Payments.',
  )
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Seed failed:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
