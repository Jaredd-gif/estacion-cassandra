CREATE KEYSPACE IF NOT EXISTS estacion
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE estacion;

CREATE TABLE IF NOT EXISTS sensores (
  id text PRIMARY KEY,
  nombre text,
  ubicacion text,
  tipo text,
  temp_max float
);

CREATE TABLE IF NOT EXISTS lecturas_por_sensor_dia (
  sensor text,
  dia date,
  hora timestamp,
  temperatura float,
  humedad int,
  PRIMARY KEY ((sensor, dia), hora)
) WITH CLUSTERING ORDER BY (hora DESC);

CREATE TABLE IF NOT EXISTS ultima_lectura (
  sensor text PRIMARY KEY,
  hora timestamp,
  temperatura float,
  humedad int
);

CREATE TABLE IF NOT EXISTS alertas_por_dia (
  dia date,
  hora timestamp,
  sensor text,
  temperatura float,
  mensaje text,
  PRIMARY KEY ((dia), hora, sensor)
) WITH CLUSTERING ORDER BY (hora DESC, sensor ASC);

CREATE TABLE IF NOT EXISTS conteo_por_dia (
  sensor text,
  dia date,
  lecturas counter,
  PRIMARY KEY ((sensor), dia)
) WITH CLUSTERING ORDER BY (dia DESC);

INSERT INTO sensores (id, nombre, ubicacion, tipo, temp_max) VALUES ('uthh-01', 'Biblioteca', 'Edificio A, planta alta', 'interior', 30);
INSERT INTO sensores (id, nombre, ubicacion, tipo, temp_max) VALUES ('uthh-02', 'Cafeteria', 'Edificio C', 'interior', 32);
INSERT INTO sensores (id, nombre, ubicacion, tipo, temp_max) VALUES ('uthh-03', 'Explanada', 'Patio central', 'exterior', 35);
