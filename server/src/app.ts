import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import fs from 'fs'
import { connectDB } from './db'

import * as loginRoute from './routes/auth/login/route'
import * as logoutRoute from './routes/auth/logout/route'
import * as meRoute from './routes/auth/me/route'
import * as studentsRoute from './routes/students/route'
import * as studentByIdRoute from './routes/students/[id]/route'
import * as guardiansRoute from './routes/guardians/route'
import * as teachersRoute from './routes/teachers/route'
import * as classesRoute from './routes/classes/route'
import * as subjectsRoute from './routes/subjects/route'
import * as assignmentsRoute from './routes/assignments/route'
import * as attendanceRoute from './routes/attendance/route'
import * as examsRoute from './routes/exams/route'
import * as marksRoute from './routes/marks/route'
import * as resultsRoute from './routes/results/route'
import * as gradeBandsRoute from './routes/grade-bands/route'
import * as feeInvoicesRoute from './routes/fees/invoices/route'
import * as feePaymentsRoute from './routes/fees/payments/route'
import * as feeStructuresRoute from './routes/fees/structures/route'
import * as dashboardRoute from './routes/dashboard/route'
import * as reportsRoute from './routes/reports/route'
import * as auditLogsRoute from './routes/audit-logs/route'
import * as settingsRoute from './routes/settings/route'
import * as profileRoute from './routes/profile/route'

export const app = express()

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin || true)
    },
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

type WebRouteHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response>

function adaptWebHandler(handler: WebRouteHandler): express.RequestHandler {
  return async (req: express.Request, res: express.Response) => {
    try {
      await connectDB()
      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http'
      const host = req.headers.host || 'localhost:4000'
      const fullUrl = `${protocol}://${host}${req.originalUrl}`

      const headers = new Headers()
      for (const [key, val] of Object.entries(req.headers)) {
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item !== undefined) headers.append(key, String(item))
          }
        } else if (val !== undefined) {
          headers.set(key, String(val))
        }
      }

      const method = req.method.toUpperCase()
      const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(method)
      let bodyInit: string | undefined
      if (hasBody && req.body !== undefined && Object.keys(req.body).length > 0) {
        bodyInit = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      } else if (hasBody && typeof req.body === 'string' && req.body.length > 0) {
        bodyInit = req.body
      }

      const webRequest = new Request(fullUrl, {
        method,
        headers,
        body: bodyInit,
      })

      const paramsRecord: Record<string, string> = {}
      for (const [k, v] of Object.entries(req.params)) {
        paramsRecord[k] = Array.isArray(v) ? v[0] : String(v)
      }

      const webResponse = await handler(webRequest, {
        params: Promise.resolve(paramsRecord),
      })

      res.status(webResponse.status)

      const rawHeaders = webResponse.headers as unknown as {
        getSetCookie?: () => string[]
      }
      const setCookies = typeof rawHeaders.getSetCookie === 'function' ? rawHeaders.getSetCookie() : []
      if (setCookies.length > 0) {
        res.setHeader('Set-Cookie', setCookies)
      }

      webResponse.headers.forEach((value, key) => {
        const lower = key.toLowerCase()
        if (lower === 'set-cookie' || lower === 'content-encoding' || lower === 'transfer-encoding') {
          return
        }
        res.setHeader(key, value)
      })

      const buf = Buffer.from(await webResponse.arrayBuffer())
      res.send(buf)
    } catch (error) {
      console.error('Express API Error:', error)
      res.status(500).json({ error: 'An unexpected server error occurred.' })
    }
  }
}

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await connectDB()
    res.json({ status: 'ok', stack: 'MERN', database: 'MongoDB Atlas connected' })
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err?.message || 'Database connection failed' })
  }
})

// Auth endpoints
app.post('/api/auth/login', adaptWebHandler(loginRoute.POST))
app.post('/api/auth/logout', adaptWebHandler(logoutRoute.POST))
app.get('/api/auth/me', adaptWebHandler(meRoute.GET))

// Students
app.get('/api/students', adaptWebHandler(studentsRoute.GET))
app.post('/api/students', adaptWebHandler(studentsRoute.POST))
app.get('/api/students/:id', adaptWebHandler(studentByIdRoute.GET as unknown as WebRouteHandler))
app.patch('/api/students/:id', adaptWebHandler(studentByIdRoute.PATCH as unknown as WebRouteHandler))
app.delete('/api/students/:id', adaptWebHandler(studentByIdRoute.DELETE as unknown as WebRouteHandler))

// Guardians
app.get('/api/guardians', adaptWebHandler(guardiansRoute.GET))
app.post('/api/guardians', adaptWebHandler(guardiansRoute.POST))
app.patch('/api/guardians', adaptWebHandler(guardiansRoute.PATCH))
app.delete('/api/guardians', adaptWebHandler(guardiansRoute.DELETE))

// Teachers
app.get('/api/teachers', adaptWebHandler(teachersRoute.GET))
app.post('/api/teachers', adaptWebHandler(teachersRoute.POST))
app.patch('/api/teachers', adaptWebHandler(teachersRoute.PATCH))
app.delete('/api/teachers', adaptWebHandler(teachersRoute.DELETE))

// Classes & Sections
app.get('/api/classes', adaptWebHandler(classesRoute.GET))
app.post('/api/classes', adaptWebHandler(classesRoute.POST))
app.patch('/api/classes', adaptWebHandler(classesRoute.PATCH))
app.delete('/api/classes', adaptWebHandler(classesRoute.DELETE))

// Subjects
app.get('/api/subjects', adaptWebHandler(subjectsRoute.GET))
app.post('/api/subjects', adaptWebHandler(subjectsRoute.POST))
app.patch('/api/subjects', adaptWebHandler(subjectsRoute.PATCH))
app.delete('/api/subjects', adaptWebHandler(subjectsRoute.DELETE))

// Teacher Assignments
app.get('/api/assignments', adaptWebHandler(assignmentsRoute.GET))
app.post('/api/assignments', adaptWebHandler(assignmentsRoute.POST))
app.delete('/api/assignments', adaptWebHandler(assignmentsRoute.DELETE))

// Attendance
app.get('/api/attendance', adaptWebHandler(attendanceRoute.GET))
app.post('/api/attendance', adaptWebHandler(attendanceRoute.POST))
app.patch('/api/attendance', adaptWebHandler(attendanceRoute.PATCH))

// Exams, Marks, Results & Grade Bands
app.get('/api/exams', adaptWebHandler(examsRoute.GET))
app.post('/api/exams', adaptWebHandler(examsRoute.POST))
app.patch('/api/exams', adaptWebHandler(examsRoute.PATCH))
app.get('/api/marks', adaptWebHandler(marksRoute.GET))
app.post('/api/marks', adaptWebHandler(marksRoute.POST))
app.get('/api/results', adaptWebHandler(resultsRoute.GET))
app.get('/api/grade-bands', adaptWebHandler(gradeBandsRoute.GET))
app.post('/api/grade-bands', adaptWebHandler(gradeBandsRoute.POST))

// Fees: Invoices, Payments & Structures
app.get('/api/fees/invoices', adaptWebHandler(feeInvoicesRoute.GET))
app.post('/api/fees/invoices', adaptWebHandler(feeInvoicesRoute.POST))
app.post('/api/fees/payments', adaptWebHandler(feePaymentsRoute.POST))
app.get('/api/fees/structures', adaptWebHandler(feeStructuresRoute.GET))
app.post('/api/fees/structures', adaptWebHandler(feeStructuresRoute.POST))

// Dashboards, Reports, Audit Logs, Settings & Profile
app.get('/api/dashboard', adaptWebHandler(dashboardRoute.GET))
app.get('/api/reports', adaptWebHandler(reportsRoute.GET))
app.get('/api/audit-logs', adaptWebHandler(auditLogsRoute.GET))
app.put('/api/audit-logs', adaptWebHandler(auditLogsRoute.PUT))
app.patch('/api/audit-logs', adaptWebHandler(auditLogsRoute.PATCH))
app.delete('/api/audit-logs', adaptWebHandler(auditLogsRoute.DELETE))
app.get('/api/settings', adaptWebHandler(settingsRoute.GET))
app.patch('/api/settings', adaptWebHandler(settingsRoute.PATCH))
app.get('/api/profile', adaptWebHandler(profileRoute.GET))
app.patch('/api/profile', adaptWebHandler(profileRoute.PATCH))

// Serve built React Vite SPA if present
const clientDistCandidates = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../client/dist'),
]
const clientDistPath = clientDistCandidates.find((p) => fs.existsSync(p))
if (clientDistPath) {
  app.use(express.static(clientDistPath))
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'))
  })
}

export default app
