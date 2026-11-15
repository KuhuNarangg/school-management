import mongoose, { type Model } from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import {
  UserModel,
  TeacherProfileModel,
  GuardianProfileModel,
  SchoolClassModel,
  SectionModel,
  SubjectModel,
  ClassSubjectModel,
  TeacherAssignmentModel,
  StudentModel,
  StudentGuardianModel,
  AttendanceRecordModel,
  ExamModel,
  ExamSubjectModel,
  MarkEntryModel,
  GradeBandModel,
  FeeCategoryModel,
  FeeStructureModel,
  FeeInvoiceModel,
  FeePaymentModel,
  AuditLogModel,
  SchoolSettingModel,
} from './models/index'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') })

let connectionPromise: Promise<typeof mongoose> | null = null
let indexesSynced = false

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }
  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI || process.env.DATABASE_URL
    if (!uri || !uri.startsWith('mongodb')) {
      throw new Error('MONGODB_URI environment variable is not set or invalid.')
    }
    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 20,
      })
      .then(async (m) => {
        if (!indexesSynced) {
          indexesSynced = true
          const models = [
            UserModel,
            TeacherProfileModel,
            GuardianProfileModel,
            SchoolClassModel,
            SectionModel,
            SubjectModel,
            ClassSubjectModel,
            TeacherAssignmentModel,
            StudentModel,
            StudentGuardianModel,
            AttendanceRecordModel,
            ExamModel,
            ExamSubjectModel,
            MarkEntryModel,
            GradeBandModel,
            FeeCategoryModel,
            FeeStructureModel,
            FeeInvoiceModel,
            FeePaymentModel,
            AuditLogModel,
            SchoolSettingModel,
          ]
          await FeePaymentModel.collection.dropIndex('reversedPaymentId_1').catch(() => null)
          await Promise.all(models.map((mod) => mod.init().catch(() => null)))
        }
        return m
      })
      .catch((err) => {
        connectionPromise = null
        throw err
      })
  }
  return connectionPromise
}

type RelationType = 'belongsTo' | 'hasOne' | 'hasMany'

interface RelationDef {
  type: RelationType
  target: ModelName
  localField: string
  foreignField: string
}

type ModelName =
  | 'user'
  | 'teacherProfile'
  | 'guardianProfile'
  | 'schoolClass'
  | 'section'
  | 'subject'
  | 'classSubject'
  | 'teacherAssignment'
  | 'student'
  | 'studentGuardian'
  | 'attendanceRecord'
  | 'exam'
  | 'examSubject'
  | 'markEntry'
  | 'gradeBand'
  | 'feeCategory'
  | 'feeStructure'
  | 'feeInvoice'
  | 'feePayment'
  | 'auditLog'
  | 'schoolSetting'

const MODELS: Record<ModelName, any> = {
  user: UserModel,
  teacherProfile: TeacherProfileModel,
  guardianProfile: GuardianProfileModel,
  schoolClass: SchoolClassModel,
  section: SectionModel,
  subject: SubjectModel,
  classSubject: ClassSubjectModel,
  teacherAssignment: TeacherAssignmentModel,
  student: StudentModel,
  studentGuardian: StudentGuardianModel,
  attendanceRecord: AttendanceRecordModel,
  exam: ExamModel,
  examSubject: ExamSubjectModel,
  markEntry: MarkEntryModel,
  gradeBand: GradeBandModel,
  feeCategory: FeeCategoryModel,
  feeStructure: FeeStructureModel,
  feeInvoice: FeeInvoiceModel,
  feePayment: FeePaymentModel,
  auditLog: AuditLogModel,
  schoolSetting: SchoolSettingModel,
}

const RELATIONS: Record<ModelName, Record<string, RelationDef>> = {
  user: {
    teacherProfile: { type: 'hasOne', target: 'teacherProfile', localField: 'id', foreignField: 'userId' },
    guardianProfile: { type: 'hasOne', target: 'guardianProfile', localField: 'id', foreignField: 'userId' },
    studentProfile: { type: 'hasOne', target: 'student', localField: 'id', foreignField: 'userId' },
  },
  teacherProfile: {
    user: { type: 'belongsTo', target: 'user', localField: 'userId', foreignField: 'id' },
    assignments: { type: 'hasMany', target: 'teacherAssignment', localField: 'id', foreignField: 'teacherId' },
  },
  guardianProfile: {
    user: { type: 'belongsTo', target: 'user', localField: 'userId', foreignField: 'id' },
    students: { type: 'hasMany', target: 'studentGuardian', localField: 'id', foreignField: 'guardianId' },
  },
  schoolClass: {
    sections: { type: 'hasMany', target: 'section', localField: 'id', foreignField: 'classId' },
    classSubjects: { type: 'hasMany', target: 'classSubject', localField: 'id', foreignField: 'classId' },
    students: { type: 'hasMany', target: 'student', localField: 'id', foreignField: 'classId' },
    assignments: { type: 'hasMany', target: 'teacherAssignment', localField: 'id', foreignField: 'classId' },
    examSubjects: { type: 'hasMany', target: 'examSubject', localField: 'id', foreignField: 'classId' },
    feeStructures: { type: 'hasMany', target: 'feeStructure', localField: 'id', foreignField: 'classId' },
  },
  section: {
    schoolClass: { type: 'belongsTo', target: 'schoolClass', localField: 'classId', foreignField: 'id' },
    students: { type: 'hasMany', target: 'student', localField: 'id', foreignField: 'sectionId' },
    assignments: { type: 'hasMany', target: 'teacherAssignment', localField: 'id', foreignField: 'sectionId' },
    attendance: { type: 'hasMany', target: 'attendanceRecord', localField: 'id', foreignField: 'sectionId' },
  },
  subject: {
    classSubjects: { type: 'hasMany', target: 'classSubject', localField: 'id', foreignField: 'subjectId' },
    assignments: { type: 'hasMany', target: 'teacherAssignment', localField: 'id', foreignField: 'subjectId' },
    examSubjects: { type: 'hasMany', target: 'examSubject', localField: 'id', foreignField: 'subjectId' },
  },
  classSubject: {
    schoolClass: { type: 'belongsTo', target: 'schoolClass', localField: 'classId', foreignField: 'id' },
    subject: { type: 'belongsTo', target: 'subject', localField: 'subjectId', foreignField: 'id' },
  },
  teacherAssignment: {
    teacher: { type: 'belongsTo', target: 'teacherProfile', localField: 'teacherId', foreignField: 'id' },
    schoolClass: { type: 'belongsTo', target: 'schoolClass', localField: 'classId', foreignField: 'id' },
    section: { type: 'belongsTo', target: 'section', localField: 'sectionId', foreignField: 'id' },
    subject: { type: 'belongsTo', target: 'subject', localField: 'subjectId', foreignField: 'id' },
  },
  student: {
    schoolClass: { type: 'belongsTo', target: 'schoolClass', localField: 'classId', foreignField: 'id' },
    section: { type: 'belongsTo', target: 'section', localField: 'sectionId', foreignField: 'id' },
    user: { type: 'belongsTo', target: 'user', localField: 'userId', foreignField: 'id' },
    guardians: { type: 'hasMany', target: 'studentGuardian', localField: 'id', foreignField: 'studentId' },
    attendance: { type: 'hasMany', target: 'attendanceRecord', localField: 'id', foreignField: 'studentId' },
    marks: { type: 'hasMany', target: 'markEntry', localField: 'id', foreignField: 'studentId' },
    invoices: { type: 'hasMany', target: 'feeInvoice', localField: 'id', foreignField: 'studentId' },
  },
  studentGuardian: {
    student: { type: 'belongsTo', target: 'student', localField: 'studentId', foreignField: 'id' },
    guardian: { type: 'belongsTo', target: 'guardianProfile', localField: 'guardianId', foreignField: 'id' },
  },
  attendanceRecord: {
    student: { type: 'belongsTo', target: 'student', localField: 'studentId', foreignField: 'id' },
    section: { type: 'belongsTo', target: 'section', localField: 'sectionId', foreignField: 'id' },
    markedBy: { type: 'belongsTo', target: 'user', localField: 'markedById', foreignField: 'id' },
  },
  exam: {
    createdBy: { type: 'belongsTo', target: 'user', localField: 'createdById', foreignField: 'id' },
    examSubjects: { type: 'hasMany', target: 'examSubject', localField: 'id', foreignField: 'examId' },
  },
  examSubject: {
    exam: { type: 'belongsTo', target: 'exam', localField: 'examId', foreignField: 'id' },
    schoolClass: { type: 'belongsTo', target: 'schoolClass', localField: 'classId', foreignField: 'id' },
    subject: { type: 'belongsTo', target: 'subject', localField: 'subjectId', foreignField: 'id' },
    marks: { type: 'hasMany', target: 'markEntry', localField: 'id', foreignField: 'examSubjectId' },
  },
  markEntry: {
    examSubject: { type: 'belongsTo', target: 'examSubject', localField: 'examSubjectId', foreignField: 'id' },
    student: { type: 'belongsTo', target: 'student', localField: 'studentId', foreignField: 'id' },
    enteredBy: { type: 'belongsTo', target: 'user', localField: 'enteredById', foreignField: 'id' },
  },
  gradeBand: {},
  feeCategory: {
    structures: { type: 'hasMany', target: 'feeStructure', localField: 'id', foreignField: 'categoryId' },
  },
  feeStructure: {
    category: { type: 'belongsTo', target: 'feeCategory', localField: 'categoryId', foreignField: 'id' },
    schoolClass: { type: 'belongsTo', target: 'schoolClass', localField: 'classId', foreignField: 'id' },
    invoices: { type: 'hasMany', target: 'feeInvoice', localField: 'id', foreignField: 'structureId' },
  },
  feeInvoice: {
    student: { type: 'belongsTo', target: 'student', localField: 'studentId', foreignField: 'id' },
    structure: { type: 'belongsTo', target: 'feeStructure', localField: 'structureId', foreignField: 'id' },
    payments: { type: 'hasMany', target: 'feePayment', localField: 'id', foreignField: 'invoiceId' },
  },
  feePayment: {
    invoice: { type: 'belongsTo', target: 'feeInvoice', localField: 'invoiceId', foreignField: 'id' },
    recordedBy: { type: 'belongsTo', target: 'user', localField: 'recordedById', foreignField: 'id' },
    reversedPayment: { type: 'belongsTo', target: 'feePayment', localField: 'reversedPaymentId', foreignField: 'id' },
    reversalEntry: { type: 'hasOne', target: 'feePayment', localField: 'id', foreignField: 'reversedPaymentId' },
  },
  auditLog: {
    actor: { type: 'belongsTo', target: 'user', localField: 'actorId', foreignField: 'id' },
  },
  schoolSetting: {},
}

const COMPOUND_UNIQUE_KEYS: string[] = [
  'classId_name',
  'classId_subjectId',
  'sectionId_subjectId',
  'studentId_guardianId',
  'studentId_date_session',
  'examId_classId_subjectId',
  'examSubjectId_studentId',
]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeDoc(raw: any): any {
  if (!raw) return null
  const obj = typeof raw.toObject === 'function' ? raw.toObject() : { ...raw }
  if (obj._id !== undefined) {
    obj.id = String(obj._id)
  }
  return obj
}

function normalizeMongoError(err: any): never {
  if (err && typeof err === 'object' && (err.code === 11000 || err.code === 11001)) {
    const target = Object.keys(err.keyPattern || err.keyValue || {})
    const pErr: any = new Error(`Unique constraint failed on the fields: (${target.join(', ')})`)
    pErr.code = 'P2002'
    pErr.meta = { target }
    throw pErr
  }
  throw err
}

function flattenCompoundWhere(where: Record<string, any> | undefined): Record<string, any> {
  if (!where) return {}
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue
    if (COMPOUND_UNIQUE_KEYS.includes(k) && v && typeof v === 'object') {
      Object.assign(out, v)
    } else {
      out[k] = v
    }
  }
  return out
}

function hasRelationalFilter(modelName: ModelName, where: Record<string, any> | undefined): boolean {
  if (!where) return false
  const rels = RELATIONS[modelName] || {}
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue
    if (k in rels) return true
    if ((k === 'OR' || k === 'AND') && Array.isArray(v)) {
      if (v.some((item) => hasRelationalFilter(modelName, item))) return true
    }
  }
  return false
}

function collectRelationalWhereIncludes(
  modelName: ModelName,
  where: Record<string, any> | undefined,
): Record<string, any> {
  if (!where) return {}
  const rels = RELATIONS[modelName] || {}
  const inc: Record<string, any> = {}
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue
    if (k in rels && v && typeof v === 'object') {
      const subInc = collectRelationalWhereIncludes(rels[k].target, v)
      inc[k] = Object.keys(subInc).length > 0 ? { include: subInc } : true
    } else if ((k === 'OR' || k === 'AND') && Array.isArray(v)) {
      for (const item of v) {
        const sub = collectRelationalWhereIncludes(modelName, item)
        for (const [sk, sv] of Object.entries(sub)) {
          if (!inc[sk] || inc[sk] === true) inc[sk] = sv
        }
      }
    }
  }
  return inc
}

function collectRelationalOrderIncludes(
  modelName: ModelName,
  orderBy: any,
): Record<string, any> {
  if (!orderBy) return {}
  const rels = RELATIONS[modelName] || {}
  const list = Array.isArray(orderBy) ? orderBy : [orderBy]
  const inc: Record<string, any> = {}
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    for (const [k, v] of Object.entries(item)) {
      if (k in rels && v && typeof v === 'object') {
        const sub = collectRelationalOrderIncludes(rels[k].target, v)
        inc[k] = Object.keys(sub).length > 0 ? { include: sub } : true
      }
    }
  }
  return inc
}

function buildScalarMongoFilter(modelName: ModelName, rawWhere: Record<string, any> | undefined): Record<string, any> {
  const where = flattenCompoundWhere(rawWhere)
  const rels = RELATIONS[modelName] || {}
  const filter: Record<string, any> = {}

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue
    if (key in rels) continue // handled after population

    if (key === 'OR' && Array.isArray(val)) {
      // Only push to Mongo $or if NONE of the branches are relational
      if (!val.some((b) => hasRelationalFilter(modelName, b))) {
        filter.$or = val.map((b) => buildScalarMongoFilter(modelName, b))
      }
      continue
    }

    if (key === 'AND' && Array.isArray(val)) {
      const scalarBranches = val.filter((b) => !hasRelationalFilter(modelName, b))
      if (scalarBranches.length > 0) {
        filter.$and = scalarBranches.map((b) => buildScalarMongoFilter(modelName, b))
      }
      continue
    }

    const mongoKey = key === 'id' ? '_id' : key

    if (val === null || typeof val !== 'object' || val instanceof Date) {
      filter[mongoKey] = val
    } else if ('not' in val) {
      filter[mongoKey] = { $ne: val.not }
    } else if ('in' in val && Array.isArray(val.in)) {
      filter[mongoKey] = { $in: val.in }
    } else if ('notIn' in val && Array.isArray(val.notIn)) {
      filter[mongoKey] = { $nin: val.notIn }
    } else if ('contains' in val && typeof val.contains === 'string') {
      filter[mongoKey] = new RegExp(escapeRegex(val.contains), val.mode === 'insensitive' ? 'i' : '')
    } else if ('equals' in val && typeof val.equals === 'string') {
      filter[mongoKey] =
        val.mode === 'insensitive' ? new RegExp(`^${escapeRegex(val.equals)}$`, 'i') : val.equals
    } else if ('gt' in val || 'gte' in val || 'lt' in val || 'lte' in val) {
      const range: Record<string, any> = {}
      if (val.gt !== undefined) range.$gt = val.gt
      if (val.gte !== undefined) range.$gte = val.gte
      if (val.lt !== undefined) range.$lt = val.lt
      if (val.lte !== undefined) range.$lte = val.lte
      filter[mongoKey] = range
    } else {
      filter[mongoKey] = val
    }
  }

  return filter
}

function matchesFieldCondition(actual: any, cond: any): boolean {
  if (cond === undefined) return true
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) {
    if (actual instanceof Date && cond instanceof Date) {
      return actual.getTime() === cond.getTime()
    }
    if (actual instanceof Date || cond instanceof Date) {
      return new Date(actual).getTime() === new Date(cond).getTime()
    }
    return actual === cond
  }
  if ('in' in cond && Array.isArray(cond.in)) {
    return cond.in.includes(actual)
  }
  if ('not' in cond) {
    return actual !== cond.not
  }
  if ('notIn' in cond && Array.isArray(cond.notIn)) {
    return !cond.notIn.includes(actual)
  }
  if ('contains' in cond && typeof cond.contains === 'string') {
    if (typeof actual !== 'string') return false
    if (cond.mode === 'insensitive') {
      return actual.toLowerCase().includes(cond.contains.toLowerCase())
    }
    return actual.includes(cond.contains)
  }
  if ('equals' in cond) {
    if (typeof actual === 'string' && typeof cond.equals === 'string' && cond.mode === 'insensitive') {
      return actual.toLowerCase() === cond.equals.toLowerCase()
    }
    return actual === cond.equals
  }
  if ('gt' in cond && !(actual > cond.gt)) return false
  if ('gte' in cond && !(actual >= cond.gte)) return false
  if ('lt' in cond && !(actual < cond.lt)) return false
  if ('lte' in cond && !(actual <= cond.lte)) return false
  return true
}

function matchesWhere(modelName: ModelName, doc: any, rawWhere: Record<string, any> | undefined): boolean {
  if (!rawWhere) return true
  if (!doc) return false
  const where = flattenCompoundWhere(rawWhere)
  const rels = RELATIONS[modelName] || {}

  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue
    if (key === 'OR' && Array.isArray(cond)) {
      if (!cond.some((branch) => matchesWhere(modelName, doc, branch))) return false
      continue
    }
    if (key === 'AND' && Array.isArray(cond)) {
      if (!cond.every((branch) => matchesWhere(modelName, doc, branch))) return false
      continue
    }
    if (key in rels) {
      const relDef = rels[key]
      const relVal = doc[key]
      if (relDef.type === 'hasMany') {
        if (!Array.isArray(relVal) || !relVal.some((item) => matchesWhere(relDef.target, item, cond))) {
          return false
        }
      } else {
        if (!matchesWhere(relDef.target, relVal, cond)) return false
      }
      continue
    }
    const actual = key === 'id' ? doc.id ?? doc._id : doc[key]
    if (!matchesFieldCondition(actual, cond)) return false
  }
  return true
}

function compareValues(a: any, b: any, dir: 'asc' | 'desc'): number {
  const mult = dir === 'desc' ? -1 : 1
  if (a === b) return 0
  if (a === null || a === undefined) return 1 * mult
  if (b === null || b === undefined) return -1 * mult
  const aVal = a instanceof Date ? a.getTime() : a
  const bVal = b instanceof Date ? b.getTime() : b
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    return aVal.localeCompare(bVal) * mult
  }
  return (aVal < bVal ? -1 : 1) * mult
}

function resolveSortSpec(doc: any, spec: Record<string, any>): { val: any; dir: 'asc' | 'desc' } {
  const [key, val] = Object.entries(spec)[0] || []
  if (!key) return { val: null, dir: 'asc' }
  if (val === 'asc' || val === 'desc') {
    return { val: doc?.[key], dir: val }
  }
  if (val && typeof val === 'object') {
    return resolveSortSpec(doc?.[key], val)
  }
  return { val: doc?.[key], dir: 'asc' }
}

function sortDocs(docs: any[], orderBy: any): any[] {
  if (!orderBy || docs.length <= 1) return docs
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy]
  return [...docs].sort((a, b) => {
    for (const spec of specs) {
      const left = resolveSortSpec(a, spec)
      const right = resolveSortSpec(b, spec)
      const cmp = compareValues(left.val, right.val, left.dir)
      if (cmp !== 0) return cmp
    }
    return 0
  })
}

function applySelect(doc: any, select: Record<string, any> | undefined): any {
  if (!doc || !select) return doc
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(select)) {
    if (v) {
      out[k] = k === 'id' ? doc.id ?? doc._id : doc[k]
    }
  }
  return out
}

function mergeIncludeMaps(
  a: Record<string, any> | undefined,
  b: Record<string, any> | undefined,
): Record<string, any> | undefined {
  if (!a && !b) return undefined
  const out: Record<string, any> = { ...(a || {}) }
  for (const [k, v] of Object.entries(b || {})) {
    if (!out[k]) {
      out[k] = v
    } else if (typeof out[k] === 'object' && typeof v === 'object') {
      out[k] = {
        ...out[k],
        ...v,
        include: mergeIncludeMaps(out[k].include, v.include),
      }
    }
  }
  return out
}

async function populateDocs(
  modelName: ModelName,
  docs: any[],
  include?: Record<string, any>,
  select?: Record<string, any>,
): Promise<any[]> {
  if (docs.length === 0) return []
  const rels = RELATIONS[modelName] || {}
  const effectiveInclude: Record<string, any> = { ...(include || {}) }

  // Also check if `select` requests any relations or `_count`
  if (select) {
    for (const [k, v] of Object.entries(select)) {
      if (v && (k in rels || k === '_count')) {
        effectiveInclude[k] = v
      }
    }
  }

  for (const [relKey, relOpts] of Object.entries(effectiveInclude)) {
    if (!relOpts) continue

    if (relKey === '_count' && typeof relOpts === 'object' && relOpts.select) {
      for (const doc of docs) {
        doc._count = doc._count || {}
      }
      for (const [countRelKey, enabled] of Object.entries(relOpts.select)) {
        if (!enabled) continue
        const rDef = rels[countRelKey]
        if (!rDef) continue
        const localVals = Array.from(new Set(docs.map((d) => d[rDef.localField]).filter(Boolean)))
        const fkField = rDef.foreignField === 'id' ? '_id' : rDef.foreignField
        const relatedDocs = await MODELS[rDef.target]
          .find({ [fkField]: { $in: localVals } })
          .select(fkField)
          .lean()
        const counts = new Map<string, number>()
        for (const r of relatedDocs) {
          const k = String((r as any)[fkField])
          counts.set(k, (counts.get(k) || 0) + 1)
        }
        for (const doc of docs) {
          doc._count[countRelKey] = counts.get(String(doc[rDef.localField])) || 0
        }
      }
      continue
    }

    const rDef = rels[relKey]
    if (!rDef) continue

    const subArgs = typeof relOpts === 'object' ? relOpts : {}
    const localVals = Array.from(new Set(docs.map((d) => d[rDef.localField]).filter(Boolean)))

    if (localVals.length === 0) {
      for (const doc of docs) {
        doc[relKey] = rDef.type === 'hasMany' ? [] : null
      }
      continue
    }

    const fkField = rDef.foreignField
    const combinedWhere = subArgs.where
      ? { AND: [{ [fkField]: { in: localVals } }, subArgs.where] }
      : { [fkField]: { in: localVals } }

    const childSelect = subArgs.select
      ? { ...subArgs.select, [rDef.foreignField]: true }
      : undefined

    const fetched = await executeFindMany(rDef.target, {
      where: combinedWhere,
      include: subArgs.include,
      select: childSelect,
      orderBy: subArgs.orderBy,
    })

    if (rDef.type === 'hasMany') {
      const grouped = new Map<string, any[]>()
      for (const item of fetched) {
        const keyVal = String(item[rDef.foreignField])
        const arr = grouped.get(keyVal) || []
        arr.push(item)
        grouped.set(keyVal, arr)
      }
      for (const doc of docs) {
        let list = grouped.get(String(doc[rDef.localField])) || []
        if (subArgs.skip) list = list.slice(subArgs.skip)
        if (subArgs.take) list = list.slice(0, subArgs.take)
        doc[relKey] = list
      }
    } else {
      const byKey = new Map<string, any>()
      for (const item of fetched) {
        const keyVal = String(item[rDef.foreignField])
        if (!byKey.has(keyVal)) byKey.set(keyVal, item)
      }
      for (const doc of docs) {
        doc[relKey] = byKey.get(String(doc[rDef.localField])) || null
      }
    }
  }

  if (select) {
    return docs.map((d) => applySelect(d, select))
  }
  return docs
}

async function executeFindMany(
  modelName: ModelName,
  args: {
    where?: Record<string, any>
    include?: Record<string, any>
    select?: Record<string, any>
    orderBy?: any
    skip?: number
    take?: number
  } = {},
): Promise<any[]> {
  await connectDB()
  const Model = MODELS[modelName]
  const mongoFilter = buildScalarMongoFilter(modelName, args.where)
  const whereIncludes = collectRelationalWhereIncludes(modelName, args.where)
  const orderIncludes = collectRelationalOrderIncludes(modelName, args.orderBy)
  const preIncludes = mergeIncludeMaps(whereIncludes, orderIncludes)
  const canPushDownPagination =
    (!whereIncludes || Object.keys(whereIncludes).length === 0) &&
    (!orderIncludes || Object.keys(orderIncludes).length === 0) &&
    !hasRelationalFilter(modelName, args.where)

  let query = Model.find(mongoFilter)
  if (canPushDownPagination && args.orderBy) {
    const specs = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]
    const sortObj: Record<string, 1 | -1> = {}
    for (const s of specs) {
      const [k, v] = Object.entries(s)[0] || []
      if (k && (v === 'asc' || v === 'desc')) {
        sortObj[k === 'id' ? '_id' : k] = v === 'desc' ? -1 : 1
      }
    }
    if (Object.keys(sortObj).length > 0) {
      query = query.sort(sortObj)
    }
  }
  if (canPushDownPagination) {
    if (args.skip !== undefined && args.skip > 0) {
      query = query.skip(args.skip)
    }
    if (args.take !== undefined && args.take >= 0) {
      query = query.limit(args.take)
    }
  }

  const rawDocs = await query.lean()
  let docs = rawDocs.map(normalizeDoc)

  if (!canPushDownPagination) {
    if (preIncludes && Object.keys(preIncludes).length > 0) {
      docs = await populateDocs(modelName, docs, preIncludes)
    }

    if (args.where) {
      docs = docs.filter((d) => matchesWhere(modelName, d, args.where))
    }

    if (args.orderBy) {
      docs = sortDocs(docs, args.orderBy)
    }

    if (args.skip !== undefined && args.skip > 0) {
      docs = docs.slice(args.skip)
    }
    if (args.take !== undefined && args.take >= 0) {
      docs = docs.slice(0, args.take)
    }
  }

  if (args.include || args.select) {
    docs = await populateDocs(modelName, docs, args.include, args.select)
  }

  return docs
}

async function verifyForeignKeysOnWrite(modelName: ModelName, data: Record<string, any>) {
  const rels = RELATIONS[modelName] || {}
  for (const rDef of Object.values(rels)) {
    if (rDef.type === 'belongsTo') {
      const fkVal = data[rDef.localField]
      if (fkVal !== undefined && fkVal !== null && fkVal !== '') {
        const exists = await MODELS[rDef.target].exists({ _id: fkVal })
        if (!exists) {
          const fkErr: any = new Error(
            `Foreign key constraint failed on the field: \`${rDef.localField}\``,
          )
          fkErr.code = 'P2003'
          throw fkErr
        }
      }
    }
  }
}

async function executeCreate(
  modelName: ModelName,
  args: { data: Record<string, any>; include?: Record<string, any>; select?: Record<string, any> },
): Promise<any> {
  await connectDB()
  const Model = MODELS[modelName]
  const rels = RELATIONS[modelName] || {}

  const scalarData: Record<string, any> = {}
  const nestedCreates: Array<{ relKey: string; relDef: RelationDef; payload: any }> = []

  for (const [k, v] of Object.entries(args.data || {})) {
    if (v === undefined) continue
    if (k === 'id') {
      scalarData._id = v
    } else if (k in rels && v && typeof v === 'object' && 'create' in v) {
      nestedCreates.push({ relKey: k, relDef: rels[k], payload: v.create })
    } else {
      scalarData[k] = v
    }
  }

  await verifyForeignKeysOnWrite(modelName, scalarData)

  let createdDoc: any
  try {
    const raw = await Model.create(scalarData)
    createdDoc = normalizeDoc(raw)
  } catch (err) {
    normalizeMongoError(err)
  }

  for (const nc of nestedCreates) {
    const items = Array.isArray(nc.payload) ? nc.payload : [nc.payload]
    for (const item of items) {
      await executeCreate(nc.relDef.target, {
        data: {
          ...item,
          [nc.relDef.foreignField]: createdDoc[nc.relDef.localField],
        },
      })
    }
  }

  if (args.include || args.select) {
    const [populated] = await populateDocs(modelName, [createdDoc], args.include, args.select)
    return populated
  }
  return createdDoc
}

async function executeUpdate(
  modelName: ModelName,
  args: {
    where: Record<string, any>
    data: Record<string, any>
    include?: Record<string, any>
    select?: Record<string, any>
  },
): Promise<any> {
  await connectDB()
  const existing = await executeFindFirst(modelName, { where: args.where })
  if (!existing) {
    const err: any = new Error('Record to update not found.')
    err.code = 'P2025'
    throw err
  }

  const Model = MODELS[modelName]
  const rels = RELATIONS[modelName] || {}
  const scalarData: Record<string, any> = {}
  const nestedUpdates: Array<{ relDef: RelationDef; payload: any }> = []

  for (const [k, v] of Object.entries(args.data || {})) {
    if (v === undefined) continue
    if (k in rels && v && typeof v === 'object' && 'update' in v) {
      nestedUpdates.push({ relDef: rels[k], payload: v.update })
    } else if (k !== 'id' && k !== '_id') {
      scalarData[k] = v
    }
  }

  await verifyForeignKeysOnWrite(modelName, scalarData)

  let updatedDoc: any
  try {
    const raw = await Model.findOneAndUpdate(
      { _id: existing.id },
      { $set: scalarData },
      { returnDocument: 'after' },
    ).lean()
    updatedDoc = normalizeDoc(raw)
  } catch (err) {
    normalizeMongoError(err)
  }

  for (const nu of nestedUpdates) {
    if (nu.relDef.type === 'belongsTo') {
      const targetId = existing[nu.relDef.localField]
      if (targetId) {
        await executeUpdate(nu.relDef.target, {
          where: { id: targetId },
          data: nu.payload,
        })
      }
    } else {
      await executeUpdate(nu.relDef.target, {
        where: { [nu.relDef.foreignField]: existing[nu.relDef.localField] },
        data: nu.payload,
      })
    }
  }

  if (args.include || args.select) {
    const [populated] = await populateDocs(modelName, [updatedDoc], args.include, args.select)
    return populated
  }
  return updatedDoc
}

async function executeDelete(
  modelName: ModelName,
  args: { where: Record<string, any> },
): Promise<any> {
  await connectDB()
  const existing = await executeFindFirst(modelName, { where: args.where })
  if (!existing) {
    const err: any = new Error('Record to delete does not exist.')
    err.code = 'P2025'
    throw err
  }

  // Handle cascade deletes matching schema referential actions
  if (modelName === 'user') {
    const tp = await MODELS.teacherProfile.findOne({ userId: existing.id }).lean()
    if (tp) {
      await MODELS.teacherAssignment.deleteMany({ teacherId: String((tp as any)._id) })
      await MODELS.teacherProfile.deleteOne({ _id: (tp as any)._id })
    }
    const gp = await MODELS.guardianProfile.findOne({ userId: existing.id }).lean()
    if (gp) {
      await MODELS.studentGuardian.deleteMany({ guardianId: String((gp as any)._id) })
      await MODELS.guardianProfile.deleteOne({ _id: (gp as any)._id })
    }
  } else if (modelName === 'student') {
    await MODELS.studentGuardian.deleteMany({ studentId: existing.id })
    await MODELS.attendanceRecord.deleteMany({ studentId: existing.id })
    await MODELS.markEntry.deleteMany({ studentId: existing.id })
    const invs = await MODELS.feeInvoice.find({ studentId: existing.id }).lean()
    const invIds = invs.map((i: any) => String(i._id))
    if (invIds.length > 0) {
      await MODELS.feePayment.deleteMany({ invoiceId: { $in: invIds } })
      await MODELS.feeInvoice.deleteMany({ _id: { $in: invIds } })
    }
  } else if (modelName === 'section') {
    await MODELS.teacherAssignment.deleteMany({ sectionId: existing.id })
    await MODELS.attendanceRecord.deleteMany({ sectionId: existing.id })
  } else if (modelName === 'subject') {
    await MODELS.classSubject.deleteMany({ subjectId: existing.id })
    await MODELS.teacherAssignment.deleteMany({ subjectId: existing.id })
    const esList = await MODELS.examSubject.find({ subjectId: existing.id }).lean()
    const esIds = esList.map((e: any) => String(e._id))
    if (esIds.length > 0) {
      await MODELS.markEntry.deleteMany({ examSubjectId: { $in: esIds } })
      await MODELS.examSubject.deleteMany({ _id: { $in: esIds } })
    }
  }

  await MODELS[modelName].deleteOne({ _id: existing.id })
  return existing
}

async function executeFindFirst(
  modelName: ModelName,
  args: {
    where?: Record<string, any>
    include?: Record<string, any>
    select?: Record<string, any>
    orderBy?: any
  } = {},
): Promise<any | null> {
  const results = await executeFindMany(modelName, {
    ...args,
    take: 1,
  })
  return results[0] || null
}

function createDelegate(modelName: ModelName) {
  return {
    findMany: (args?: any) => executeFindMany(modelName, args),
    findFirst: (args?: any) => executeFindFirst(modelName, args),
    findUnique: (args: any) => executeFindFirst(modelName, args),
    findFirstOrThrow: async (args?: any) => {
      const res = await executeFindFirst(modelName, args)
      if (!res) {
        const err: any = new Error(`No ${modelName} found`)
        err.code = 'P2025'
        throw err
      }
      return res
    },
    findUniqueOrThrow: async (args: any) => {
      const res = await executeFindFirst(modelName, args)
      if (!res) {
        const err: any = new Error(`No ${modelName} found`)
        err.code = 'P2025'
        throw err
      }
      return res
    },
    count: async (args?: { where?: Record<string, any> }) => {
      await connectDB()
      if (!args?.where || Object.keys(args.where).length === 0) {
        return MODELS[modelName].countDocuments()
      }
      if (!hasRelationalFilter(modelName, args.where)) {
        const filter = buildScalarMongoFilter(modelName, args.where)
        return MODELS[modelName].countDocuments(filter)
      }
      const list = await executeFindMany(modelName, { where: args.where })
      return list.length
    },
    create: (args: any) => executeCreate(modelName, args),
    createMany: async (args: { data: Record<string, any>[] }) => {
      await connectDB()
      const items = (args.data || []).map((d) => {
        const copy = { ...d }
        if (copy.id) {
          copy._id = copy.id
          delete copy.id
        }
        return copy
      })
      if (items.length === 0) return { count: 0 }
      try {
        const res = await MODELS[modelName].insertMany(items, { ordered: true })
        return { count: res.length }
      } catch (err) {
        normalizeMongoError(err)
      }
    },
    update: (args: any) => executeUpdate(modelName, args),
    updateMany: async (args: { where?: Record<string, any>; data: Record<string, any> }) => {
      await connectDB()
      const setPayload: Record<string, any> = {}
      const unsetPayload: Record<string, any> = {}
      for (const [k, v] of Object.entries(args.data || {})) {
        if (k === 'reversedPaymentId' && v === null) {
          unsetPayload[k] = 1
        } else {
          setPayload[k] = v
        }
      }
      const updateOp: Record<string, any> = {}
      if (Object.keys(setPayload).length > 0) updateOp.$set = setPayload
      if (Object.keys(unsetPayload).length > 0) updateOp.$unset = unsetPayload

      if (!args.where || !hasRelationalFilter(modelName, args.where)) {
        const filter = buildScalarMongoFilter(modelName, args.where)
        const res = await MODELS[modelName].updateMany(filter, updateOp)
        return { count: res.modifiedCount }
      }
      const matching = await executeFindMany(modelName, { where: args.where })
      const ids = matching.map((m) => m.id)
      if (ids.length === 0) return { count: 0 }
      const res = await MODELS[modelName].updateMany({ _id: { $in: ids } }, updateOp)
      return { count: res.modifiedCount }
    },
    upsert: async (args: {
      where: Record<string, any>
      update: Record<string, any>
      create: Record<string, any>
      include?: Record<string, any>
      select?: Record<string, any>
    }) => {
      const existing = await executeFindFirst(modelName, { where: args.where })
      if (existing) {
        return executeUpdate(modelName, {
          where: { id: existing.id },
          data: args.update,
          include: args.include,
          select: args.select,
        })
      }
      return executeCreate(modelName, {
        data: args.create,
        include: args.include,
        select: args.select,
      })
    },
    delete: (args: any) => executeDelete(modelName, args),
    deleteMany: async (args?: { where?: Record<string, any> }) => {
      await connectDB()
      if (!args?.where || Object.keys(args.where).length === 0) {
        const res = await MODELS[modelName].deleteMany({})
        return { count: res.deletedCount }
      }
      const filter = buildScalarMongoFilter(modelName, args.where)
      const res = await MODELS[modelName].deleteMany(filter)
      return { count: res.deletedCount }
    },
  }
}

// Mutex queue for serialized transactions (guarantees atomic concurrent payment checks)
let txQueue: Promise<any> = Promise.resolve()

export const db = {
  user: createDelegate('user'),
  teacherProfile: createDelegate('teacherProfile'),
  guardianProfile: createDelegate('guardianProfile'),
  schoolClass: createDelegate('schoolClass'),
  section: createDelegate('section'),
  subject: createDelegate('subject'),
  classSubject: createDelegate('classSubject'),
  teacherAssignment: createDelegate('teacherAssignment'),
  student: createDelegate('student'),
  studentGuardian: createDelegate('studentGuardian'),
  attendanceRecord: createDelegate('attendanceRecord'),
  exam: createDelegate('exam'),
  examSubject: createDelegate('examSubject'),
  markEntry: createDelegate('markEntry'),
  gradeBand: createDelegate('gradeBand'),
  feeCategory: createDelegate('feeCategory'),
  feeStructure: createDelegate('feeStructure'),
  feeInvoice: createDelegate('feeInvoice'),
  feePayment: createDelegate('feePayment'),
  auditLog: createDelegate('auditLog'),
  schoolSetting: createDelegate('schoolSetting'),
  $transaction: async <T>(fn: (tx: any) => Promise<T>, _options?: unknown): Promise<T> => {
    const run = txQueue.then(() => fn(db))
    txQueue = run.catch(() => null)
    return run
  },
  $queryRaw: async (_strings: TemplateStringsArray, ..._values: unknown[]) => {
    return []
  },
  $disconnect: async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
      connectionPromise = null
    }
  },
}

export const prisma = db
export default db
