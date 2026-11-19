-- Synthetic demo departments, rooms and beds. Never use real patient data.
INSERT INTO departments(name,code) VALUES ('الطوارئ','ER'),('العناية المركزة','ICU'),('التنويم','IP') ON CONFLICT (code) DO NOTHING;
INSERT INTO rooms(department_id,name)
SELECT id, 'غرفة 101' FROM departments WHERE code='ER'
ON CONFLICT (department_id,name) DO NOTHING;
INSERT INTO rooms(department_id,name)
SELECT id, 'غرفة 201' FROM departments WHERE code='ICU'
ON CONFLICT (department_id,name) DO NOTHING;
INSERT INTO rooms(department_id,name)
SELECT id, 'غرفة 301' FROM departments WHERE code='IP'
ON CONFLICT (department_id,name) DO NOTHING;
INSERT INTO beds(room_id,label)
SELECT r.id, b.label FROM rooms r CROSS JOIN (VALUES ('B1'),('B2'),('B3')) AS b(label)
ON CONFLICT (room_id,label) DO NOTHING;
