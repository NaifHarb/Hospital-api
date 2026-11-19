INSERT INTO departments (name,code) VALUES ('الطوارئ','ER'),('العناية المركزة','ICU'),('الباطنية','MED') ON CONFLICT (code) DO NOTHING;
INSERT INTO rooms (department_id,room_number,floor)
SELECT id, '101', 1 FROM departments WHERE code='ER'
ON CONFLICT (department_id,room_number) DO NOTHING;
INSERT INTO rooms (department_id,room_number,floor)
SELECT id, '201', 2 FROM departments WHERE code='ICU'
ON CONFLICT (department_id,room_number) DO NOTHING;
INSERT INTO beds (room_id,bed_number,status)
SELECT r.id, 'A', 'available' FROM rooms r JOIN departments d ON d.id=r.department_id WHERE d.code='ER' AND r.room_number='101'
ON CONFLICT (room_id,bed_number) DO NOTHING;
INSERT INTO beds (room_id,bed_number,status)
SELECT r.id, 'B', 'cleaning' FROM rooms r JOIN departments d ON d.id=r.department_id WHERE d.code='ER' AND r.room_number='101'
ON CONFLICT (room_id,bed_number) DO NOTHING;
INSERT INTO beds (room_id,bed_number,status)
SELECT r.id, 'A', 'maintenance' FROM rooms r JOIN departments d ON d.id=r.department_id WHERE d.code='ICU' AND r.room_number='201'
ON CONFLICT (room_id,bed_number) DO NOTHING;
