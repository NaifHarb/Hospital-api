import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z, ZodError } from 'zod';
import { pool, transaction } from './db.js';
import { reservations } from './reservations.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));

const statuses = ['available','occupied','reserved','cleaning','maintenance'];
const uuid = z.string().uuid();
const bedSchema = z.object({ roomId: uuid, label: z.string().trim().min(1).max(50) });
const statusSchema = z.object({ status: z.enum(statuses), reason: z.string().trim().min(3).max(500) });

app.get('/api/health', async (_req, res, next) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch (error) { next(error); }
});
app.get('/api/departments', async (_req, res, next) => {
  try { const { rows } = await pool.query('SELECT id, name, code FROM departments ORDER BY name'); res.json(rows); }
  catch (error) { next(error); }
});
app.get('/api/rooms', async (req, res, next) => {
  try {
    const departmentId = req.query.departmentId ? uuid.parse(req.query.departmentId) : null;
    const { rows } = await pool.query('SELECT id, department_id AS "departmentId", name FROM rooms WHERE ($1::uuid IS NULL OR department_id=$1) ORDER BY name', [departmentId]);
    res.json(rows);
  } catch (error) { next(error); }
});
app.get('/api/beds', async (req, res, next) => {
  try {
    const departmentId = req.query.departmentId ? uuid.parse(req.query.departmentId) : null;
    const { rows } = await pool.query(`SELECT b.id, b.room_id AS "roomId", b.label, b.status, r.name AS "roomName", d.name AS "departmentName"
      FROM beds b JOIN rooms r ON r.id=b.room_id JOIN departments d ON d.id=r.department_id
      WHERE ($1::uuid IS NULL OR d.id=$1) ORDER BY d.name, r.name, b.label`, [departmentId]);
    res.json(rows);
  } catch (error) { next(error); }
});
app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='available')::int AS available,
      COUNT(*) FILTER (WHERE status='occupied')::int AS occupied,
      COUNT(*) FILTER (WHERE status='reserved')::int AS reserved,
      COUNT(*) FILTER (WHERE status='cleaning')::int AS cleaning,
      COUNT(*) FILTER (WHERE status='maintenance')::int AS maintenance FROM beds`);
    const data = rows[0];
    res.json({ ...data, occupancyRate: data.total ? Math.round(data.occupied / data.total * 10000) / 100 : 0 });
  } catch (error) { next(error); }
});

// Prototype-only mutation endpoints. Disabled by default until authentication/RBAC is implemented.
function requirePrototypeWrites(_req, res, next) {
  if (process.env.ENABLE_UNSAFE_DEMO_WRITES !== 'true' || process.env.NODE_ENV === 'production')
    return res.status(403).json({ error: 'Writes disabled until authentication and RBAC are implemented' });
  next();
}
app.post('/api/beds', requirePrototypeWrites, async (req, res, next) => {
  try {
    const data = bedSchema.parse(req.body);
    const { rows } = await pool.query('INSERT INTO beds(room_id,label) VALUES ($1,$2) RETURNING id, room_id AS "roomId", label, status', [data.roomId, data.label]);
    res.status(201).json(rows[0]);
  } catch (error) { next(error); }
});
app.patch('/api/beds/:id/status', requirePrototypeWrites, async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id), data = statusSchema.parse(req.body);
    const result = await transaction(async client => {
      const locked = await client.query('SELECT id, status FROM beds WHERE id=$1 FOR UPDATE', [id]);
      if (!locked.rowCount) return null;
      const oldStatus = locked.rows[0].status;
      if (!['available','cleaning','maintenance'].includes(oldStatus) || !['available','cleaning','maintenance'].includes(data.status)) {
        const error = new Error('Use reservation/admission workflows for allocated beds'); error.status = 409; throw error;
      }
      const { rows } = await client.query('UPDATE beds SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING id, status', [id, data.status]);
      await client.query('INSERT INTO bed_status_history(bed_id,old_status,new_status,reason) VALUES ($1,$2,$3,$4)', [id, oldStatus, data.status, data.reason]);
      return rows[0];
    });
    if (!result) return res.status(404).json({ error: 'Bed not found' });
    res.json(result);
  } catch (error) { next(error); }
});
app.use('/api/reservations', reservations);

app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ error: 'Invalid input', details: error.flatten() });
  if (error.code === '23505') return res.status(409).json({ error: 'Duplicate record' });
  if (error.code === '23503') return res.status(400).json({ error: 'Referenced record not found' });
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});
