const cassandra = require("cassandra-driver");
const { LocalDate } = cassandra.types;
const KS = "estacion";
const ZONA = "America/Mexico_City";

function crearCliente() {
  return new cassandra.Client({
    contactPoints: ["127.0.0.1"],
    localDataCenter: "datacenter1",
  });
}

function diaLocal(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(fecha);
}

function mostrar(cql, params) {
  let i = 0;
  return cql.replace(/\?/g, () => {
    const v = params[i++];
    if (typeof v === "number") return String(v);
    if (v instanceof Date) return "'" + v.toISOString() + "'";
    return "'" + String(v) + "'";
  });
}

async function ejecutar(cliente, cql, params, bitacora) {
  if (bitacora) bitacora.push(mostrar(cql, params));
  return cliente.execute(cql, params, { prepare: true });
}

async function leerSensores(cliente, bitacora) {
  const r = await ejecutar(cliente, `SELECT id, nombre, ubicacion, tipo, temp_max FROM ${KS}.sensores`, [], bitacora);
  const mapa = {};
  for (const f of r.rows) mapa[f.id] = { id: f.id, nombre: f.nombre, ubicacion: f.ubicacion, tipo: f.tipo, temp_max: f.temp_max };
  return mapa;
}

async function guardarLectura(cliente, sensor, lectura, bitacora, historico = false) {
  const { hora, temperatura, humedad } = lectura;
  const dia = diaLocal(hora);
  const fecha = LocalDate.fromString(dia);
  const lote = [{
    query: `INSERT INTO ${KS}.lecturas_por_sensor_dia (sensor, dia, hora, temperatura, humedad) VALUES (?, ?, ?, ?, ?)`,
    params: [sensor.id, fecha, hora, temperatura, humedad],
  }];
  if (!historico) lote.push({
    query: `INSERT INTO ${KS}.ultima_lectura (sensor, hora, temperatura, humedad) VALUES (?, ?, ?, ?)`,
    params: [sensor.id, hora, temperatura, humedad],
  });
  const alerta = temperatura > sensor.temp_max;
  if (alerta) lote.push({
    query: `INSERT INTO ${KS}.alertas_por_dia (dia, hora, sensor, temperatura, mensaje) VALUES (?, ?, ?, ?, ?)`,
    params: [fecha, hora, sensor.id, temperatura, sensor.nombre + " supera " + sensor.temp_max + " °C"],
  });
  if (bitacora) bitacora.push("BEGIN BATCH", ...lote.map(l => "  " + mostrar(l.query, l.params) + ";"), "APPLY BATCH;");
  await cliente.batch(lote, { prepare: true });
  await ejecutar(cliente, `UPDATE ${KS}.conteo_por_dia SET lecturas = lecturas + 1 WHERE sensor = ? AND dia = ?`,
    [sensor.id, fecha], bitacora);
  return { dia, alerta };
}

module.exports = { KS, LocalDate, crearCliente, diaLocal, ejecutar, leerSensores, guardarLectura };
