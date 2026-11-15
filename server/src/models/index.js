import mongoose, { Schema } from 'mongoose';
const newId = () => new mongoose.Types.ObjectId().toHexString();
const baseOptions = {
    id: true,
    toJSON: {
        virtuals: true,
        versionKey: false,
        transform: (_doc, ret) => {
            ret.id = ret._id;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        versionKey: false,
        transform: (_doc, ret) => {
            ret.id = ret._id;
            return ret;
        },
    },
};
const userSchema = new Schema({
    _id: { type: String, default: newId },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    initials: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'TEACHER', 'GUARDIAN'], required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    phone: { type: String, default: null },
}, { ...baseOptions, timestamps: true });
const teacherProfileSchema = new Schema({
    _id: { type: String, default: newId },
    employeeCode: { type: String, required: true, unique: true },
    userId: { type: String, required: true, unique: true, ref: 'User' },
    department: { type: String, required: true },
    qualification: { type: String, default: null },
    joinedDate: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: true });
const guardianProfileSchema = new Schema({
    _id: { type: String, default: newId },
    guardianCode: { type: String, required: true, unique: true },
    userId: { type: String, required: true, unique: true, ref: 'User' },
    occupation: { type: String, default: null },
    address: { type: String, default: null },
    emergencyPhone: { type: String, default: null },
}, { ...baseOptions, timestamps: true });
const schoolClassSchema = new Schema({
    _id: { type: String, default: newId },
    name: { type: String, required: true, unique: true },
    gradeLevel: { type: Number, required: true },
    academicYear: { type: String, default: '2026-2027' },
}, { ...baseOptions, timestamps: true });
const sectionSchema = new Schema({
    _id: { type: String, default: newId },
    name: { type: String, required: true },
    room: { type: String, required: true },
    capacity: { type: Number, default: 35 },
    classId: { type: String, required: true, ref: 'SchoolClass' },
}, { ...baseOptions, timestamps: true });
sectionSchema.index({ classId: 1, name: 1 }, { unique: true });
const subjectSchema = new Schema({
    _id: { type: String, default: newId },
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    maxMarksDefault: { type: Number, default: 100 },
    passingMarksDefault: { type: Number, default: 40 },
}, { ...baseOptions, timestamps: true });
const classSubjectSchema = new Schema({
    _id: { type: String, default: newId },
    classId: { type: String, required: true, ref: 'SchoolClass' },
    subjectId: { type: String, required: true, ref: 'Subject' },
}, { ...baseOptions, timestamps: false });
classSubjectSchema.index({ classId: 1, subjectId: 1 }, { unique: true });
const teacherAssignmentSchema = new Schema({
    _id: { type: String, default: newId },
    teacherId: { type: String, required: true, ref: 'TeacherProfile' },
    classId: { type: String, required: true, ref: 'SchoolClass' },
    sectionId: { type: String, required: true, ref: 'Section' },
    subjectId: { type: String, required: true, ref: 'Subject' },
    scheduleTime: { type: String, default: '08:30' },
    scheduleRoom: { type: String, default: 'Room 101' },
    isHomeroom: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: false });
teacherAssignmentSchema.index({ sectionId: 1, subjectId: 1 }, { unique: true });
const studentSchema = new Schema({
    _id: { type: String, default: newId },
    studentCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    initials: { type: String, required: true },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: null },
    program: { type: String, default: 'Science' },
    status: { type: String, enum: ['ACTIVE', 'REVIEW', 'INACTIVE'], default: 'ACTIVE' },
    enrollmentDate: { type: Date, default: Date.now },
    classId: { type: String, required: true, ref: 'SchoolClass' },
    sectionId: { type: String, required: true, ref: 'Section' },
    userId: { type: String, default: null, sparse: true, ref: 'User' },
}, { ...baseOptions, timestamps: true });
const studentGuardianSchema = new Schema({
    _id: { type: String, default: newId },
    studentId: { type: String, required: true, ref: 'Student' },
    guardianId: { type: String, required: true, ref: 'GuardianProfile' },
    relationship: { type: String, default: 'Parent' },
    isPrimary: { type: Boolean, default: true },
}, { ...baseOptions, timestamps: false });
studentGuardianSchema.index({ studentId: 1, guardianId: 1 }, { unique: true });
const attendanceRecordSchema = new Schema({
    _id: { type: String, default: newId },
    studentId: { type: String, required: true, ref: 'Student' },
    sectionId: { type: String, required: true, ref: 'Section' },
    date: { type: Date, required: true },
    session: { type: String, default: 'DAILY' },
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'LATE'], default: 'PRESENT' },
    markedById: { type: String, required: true, ref: 'User' },
    editReason: { type: String, default: null },
}, { ...baseOptions, timestamps: true });
attendanceRecordSchema.index({ studentId: 1, date: 1, session: 1 }, { unique: true });
attendanceRecordSchema.index({ sectionId: 1, date: 1 });
const examSchema = new Schema({
    _id: { type: String, default: newId },
    name: { type: String, required: true },
    term: { type: String, default: 'Term 2' },
    academicYear: { type: String, default: '2026-2027' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'PUBLISHED'], default: 'DRAFT' },
    locked: { type: Boolean, default: false },
    unlockReason: { type: String, default: null },
    createdById: { type: String, required: true, ref: 'User' },
}, { ...baseOptions, timestamps: true });
const examSubjectSchema = new Schema({
    _id: { type: String, default: newId },
    examId: { type: String, required: true, ref: 'Exam' },
    classId: { type: String, required: true, ref: 'SchoolClass' },
    subjectId: { type: String, required: true, ref: 'Subject' },
    maxMarks: { type: Number, default: 100 },
    passingMarks: { type: Number, default: 40 },
    examDate: { type: Date, default: null },
}, { ...baseOptions, timestamps: false });
examSubjectSchema.index({ examId: 1, classId: 1, subjectId: 1 }, { unique: true });
const markEntrySchema = new Schema({
    _id: { type: String, default: newId },
    examSubjectId: { type: String, required: true, ref: 'ExamSubject' },
    studentId: { type: String, required: true, ref: 'Student' },
    marksObtained: { type: Number, required: true },
    remarks: { type: String, default: null },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'PUBLISHED'], default: 'DRAFT' },
    enteredById: { type: String, required: true, ref: 'User' },
    unlockReason: { type: String, default: null },
}, { ...baseOptions, timestamps: true });
markEntrySchema.index({ examSubjectId: 1, studentId: 1 }, { unique: true });
const gradeBandSchema = new Schema({
    _id: { type: String, default: newId },
    grade: { type: String, required: true, unique: true },
    minPercentage: { type: Number, required: true },
    maxPercentage: { type: Number, required: true },
    gpaPoints: { type: Number, required: true },
    isPassing: { type: Boolean, default: true },
    sortOrder: { type: Number, required: true },
}, { ...baseOptions, timestamps: false });
const feeCategorySchema = new Schema({
    _id: { type: String, default: newId },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
}, { ...baseOptions, timestamps: false });
const feeStructureSchema = new Schema({
    _id: { type: String, default: newId },
    name: { type: String, required: true },
    categoryId: { type: String, required: true, ref: 'FeeCategory' },
    classId: { type: String, default: null, ref: 'SchoolClass' },
    amountCents: { type: Number, required: true },
    academicTerm: { type: String, default: 'Term 2' },
    dueDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: false });
const feeInvoiceSchema = new Schema({
    _id: { type: String, default: newId },
    invoiceNo: { type: String, required: true, unique: true },
    studentId: { type: String, required: true, ref: 'Student' },
    structureId: { type: String, default: null, ref: 'FeeStructure' },
    title: { type: String, required: true },
    description: { type: String, default: null },
    dueDate: { type: Date, required: true },
    totalCents: { type: Number, required: true },
    status: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },
}, { ...baseOptions, timestamps: true });
feeInvoiceSchema.index({ studentId: 1 });
feeInvoiceSchema.index({ status: 1 });
const feePaymentSchema = new Schema({
    _id: { type: String, default: newId },
    receiptNo: { type: String, required: true, unique: true },
    invoiceId: { type: String, required: true, ref: 'FeeInvoice' },
    amountCents: { type: Number, required: true },
    method: { type: String, enum: ['BANK_TRANSFER', 'CASH', 'CARD'], default: 'BANK_TRANSFER' },
    type: { type: String, enum: ['PAYMENT', 'REVERSAL'], default: 'PAYMENT' },
    reversedPaymentId: { type: String, default: undefined, ref: 'FeePayment' },
    reversalReason: { type: String, default: null },
    recordedById: { type: String, required: true, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: false });
feePaymentSchema.index({ invoiceId: 1 });
feePaymentSchema.index({ reversedPaymentId: 1 }, { unique: true, partialFilterExpression: { reversedPaymentId: { $type: 'string' } } });
const auditLogSchema = new Schema({
    _id: { type: String, default: newId },
    actorId: { type: String, default: null, ref: 'User' },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    beforeSummary: { type: String, default: null },
    afterSummary: { type: String, default: null },
    metadata: { type: String, default: null },
    ipAddress: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: false });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
const schoolSettingSchema = new Schema({
    _id: { type: String, default: 'default' },
    schoolName: { type: String, default: 'Northstar Academy' },
    city: { type: String, default: 'Springfield, IL' },
    academicYear: { type: String, default: '2026-2027' },
    currentTerm: { type: String, default: 'Term 2' },
    attendanceLockAfterDays: { type: Number, default: 0 },
    contactEmail: { type: String, default: 'hello@northstar.school' },
}, { ...baseOptions, timestamps: { createdAt: false, updatedAt: true } });
export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
export const TeacherProfileModel = mongoose.models.TeacherProfile || mongoose.model('TeacherProfile', teacherProfileSchema);
export const GuardianProfileModel = mongoose.models.GuardianProfile || mongoose.model('GuardianProfile', guardianProfileSchema);
export const SchoolClassModel = mongoose.models.SchoolClass || mongoose.model('SchoolClass', schoolClassSchema);
export const SectionModel = mongoose.models.Section || mongoose.model('Section', sectionSchema);
export const SubjectModel = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
export const ClassSubjectModel = mongoose.models.ClassSubject || mongoose.model('ClassSubject', classSubjectSchema);
export const TeacherAssignmentModel = mongoose.models.TeacherAssignment || mongoose.model('TeacherAssignment', teacherAssignmentSchema);
export const StudentModel = mongoose.models.Student || mongoose.model('Student', studentSchema);
export const StudentGuardianModel = mongoose.models.StudentGuardian || mongoose.model('StudentGuardian', studentGuardianSchema);
export const AttendanceRecordModel = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);
export const ExamModel = mongoose.models.Exam || mongoose.model('Exam', examSchema);
export const ExamSubjectModel = mongoose.models.ExamSubject || mongoose.model('ExamSubject', examSubjectSchema);
export const MarkEntryModel = mongoose.models.MarkEntry || mongoose.model('MarkEntry', markEntrySchema);
export const GradeBandModel = mongoose.models.GradeBand || mongoose.model('GradeBand', gradeBandSchema);
export const FeeCategoryModel = mongoose.models.FeeCategory || mongoose.model('FeeCategory', feeCategorySchema);
export const FeeStructureModel = mongoose.models.FeeStructure || mongoose.model('FeeStructure', feeStructureSchema);
export const FeeInvoiceModel = mongoose.models.FeeInvoice || mongoose.model('FeeInvoice', feeInvoiceSchema);
export const FeePaymentModel = mongoose.models.FeePayment || mongoose.model('FeePayment', feePaymentSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export const SchoolSettingModel = mongoose.models.SchoolSetting || mongoose.model('SchoolSetting', schoolSettingSchema);
