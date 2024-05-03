/**
 * Guarda el valor del dólar y la fecha en el entorno especificado.
 * @param {Object} env - El entorno en el que se guardarán los valores.
 * @param {number} valorDolar - El valor del dólar a guardar.
 * @param {string} fechaDolar - La fecha del valor del dólar a guardar.
 * @returns {Promise<void>} - Una promesa que se resuelve cuando los valores se guardan correctamente.
 */
export async function saveDolar(env, valorDolar, fechaDolar) {
	try {
		await env.kvdof.put("precio", valorDolar.toString());
		await env.kvdof.put("fecha", fechaDolar);
	} catch (error) {
		console.error(error);
	}
}
