/**
 * Obtiene la fecha formateada en formato personalizado.
 * @param {string} pubDate - La fecha de publicación en formato de cadena.
 * @returns {string} La fecha formateada en formato personalizado.
 */
export function getDateBP(pubDate) {
	const dia = new Date(pubDate).toLocaleString('es-MX', { weekday: 'long' }).toUpperCase();
	const diaNum = new Date(pubDate).getDate();
	const mes = new Date(pubDate).toLocaleString('es-MX', { month: 'long' }).toUpperCase();
	const año = new Date(pubDate).getFullYear();
	const fecha = `${dia} ${diaNum} / ${mes} / ${año}`; // Formato personalizado
	console.log(fecha);
	return fecha;
}
