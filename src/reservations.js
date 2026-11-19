import { Router } from 'express';
import { z } from 'zod';
import { pool, transaction } from './db.js';

export const reservations = Router();
const uuid = z.string().uuid();
const createSchema = z.object({
  bedId: uuid,
  referenceCode: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9_-]+$/)
});

// Until proper authentication and role-based access are built, writes are disabled by default.
reservations.use((req, res, next) => {
  if (req.method === 'GET') return next();
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_UNSAFE_DEMO_WRITES !== 'true') {
    return res.status(403).json({ error: 'Reservation writes disabled until authentication and RBAC are implemented' });
  }
  next();
});

reservations.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, bed_id AS \"bedId\", reference_code AS \"referenceCode\", status, created_at AS \"createdAt\" FROM bed_reservations ORDER BY created_at DESC LIMIT 100"
    );
    res.json(rows);
  } catch (error) { next(error); }
});

reservations.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await transaction(async client => {
      const bed = await client.query('SELECT id, status FROM beds WHERE id=$1 FOR UPDATE', [data.bedId]);
      if (!bed.rowCount) return { code: 404, error: 'Bed not found' };
      if (bed.rows[0].status !== 'available') return { code: 409, error: 'Bed is not available' };
      const inserted = await client.query(
        'INSERT INTO bed_reservations(bed_id,reference_code) VALUES ($1,$2) RETURNING id, bed_id AS "bedId", reference_code AS "referenceCode", status',
        [data.bedId, data.referenceCode]
      );
      await client.query("UPDATE beds SET status='reserved', updated_at=now() WHERE id=$1", [data.bedId]);
      await client.query(
        "INSERT INTO bed_status_history(bed_id,old_status,new_status,reason) VALUES ($1,'available','reserved',$2)",
        [data.bedId, 'Demo reservation ' + data.referenceCode]
      );
      return { code: 201, data: inserted.rows[0] };
    });
    if (result.error) return res.status(result.code).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (error) { next(error); }
});

reservations.post('/:id/cancel', async (req, res, next) => {
  try {
    const reservationId = uuid.parse(req.params.id);
    const result = await transaction(async client => {
      const found = await client.query('SELECT id, bed_id, status FROM bed_reservations WHERE id=$1', [reservationId]);
      if (!found.rowCount) return { code: 404, error: 'Reservation not found' };
      const bedId = found.rows[0].bed_id;
      const bed = await client.query('SELECT id, status FROM beds WHERE id=$1 FOR UPDATE', [bedId]);
      // Recheck reservation after locking bed, serializing with other bed transitions.
      const current = await client.query('SELECT status FROM bed_reservations WHERE id=$1 FOR UPDATE', [reservationId]);
      if (current.rows[0].status !== 'active' || bed.rows[0].status !== 'reserved') {
        return { code: 409, error: 'Reservation is no longer active or bed status changed' };
      }
      await client.query("UPDATE bed_reservations SET status='cancelled', cancelled_at=now() WHERE id=$1", [reservationId]);
      await client.query("UPDATE beds SET status='available', updated_at=now() WHERE id=$1", [bedId]);
      await client.query(
        "INSERT INTO bed_status_history(bed_id,old_status,new_status,reason) VALUES ($1,'reserved','available','Demo reservation cancelled')",
        [bedId]
      );
      return { code: 200, data: { id: reservationId, status: 'cancelled' } };
    });
    if (result.error) return res.status(result.code).json({ error: result.error });
    res.json(result.data);
  } catch (error) { next(error); }
});
