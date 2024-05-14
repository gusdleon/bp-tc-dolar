import { getxml } from "./getxml";
import { getDateBP } from "./getDateBP";
import { saveDolar } from "./saveDolar";
import { respuestatc } from "./respuestatc";

/**
 * Módulo principal que exporta un objeto con dos funciones asincrónicas: fetch y scheduled.
 * La función fetch se encarga de manejar las solicitudes GET a la ruta "/MX/tc_barmesa/_tipo-de-cambio.html".
 * La función scheduled se ejecuta periódicamente y realiza la obtención y procesamiento de datos del dólar.
 *
 * @module index
 */

export default {
	// #region función fetch (manejo de solicitudes GET)
	/**
	 * Función asincrónica que maneja las solicitudes GET a la ruta "/MX/tc_barmesa/_tipo-de-cambio.html".
	 * Realiza validaciones de la solicitud y obtiene el valor del dólar guardado en la caché.
	 * Luego, devuelve una respuesta con el valor del dólar.
	 *
	 * @param {Request} request - La solicitud HTTP recibida.
	 * @param {Object} env - El entorno de ejecución.
	 * @param {Object} ctx - El contexto de ejecución.
	 * @returns {Response} - La respuesta HTTP con el valor del dólar.
	 */
	async fetch(request, env, ctx) {
		// #region Validaciones de la solicitud
		/** Se verifica que el método de la solicitud sea GET
		 * y que la ruta sea "/MX/tc_barmesa/_tipo-de-cambio.html".
		 * Si no cumple con las validaciones, se devuelve una respuesta
		 * con el código de estado correspondiente.
		 */
		const url = new URL(request.url);
		if (request.method !== "GET") {
			console.warn("Método no permitido");
			return new Response("Método no permitido", { status: 405 });
		} else if (url.pathname !== "/MX/tc_barmesa/_tipo-de-cambio.html") {
			console.warn("URL no permitida");
			return new Response("URL no permitida", { status: 403 });
		}
		// #endregion

		// Se obtiene el valor del dólar guardado en la caché
		// y se devuelve una respuesta con el valor del dólar y la fecha
		const kVFecha = await env.kvdof.get("fecha", { cacheTtl: 3600 });
		const kVPrecio = Number(await env.kvdof.get("precio", { cacheTtl: 3600 })).toFixed(4);
		const kVUltAct = await env.kvdof.get("ultimaAct", { cacheTtl: 3600 });
		return respuestatc(kVFecha, kVPrecio, kVUltAct);
	},
	// #endregion

	// #region función scheduled (obtención y procesamiento de datos del dólar)
	/**
	 * Función asincrónica que se ejecuta periódicamente y realiza la obtención y procesamiento de datos del dólar.
	 * Obtiene el valor mínimo permitido del dólar guardado en la caché.
	 * Luego, obtiene el XML del DOF y extrae el valor y la fecha del dólar.
	 * Si el valor del dólar es menor al mínimo permitido, guarda el mínimo permitido y la fecha en la caché.
	 * Si el valor del dólar es mayor o igual al mínimo permitido, guarda el valor y la fecha en la caché.
	 *
	 * @param {Event} event - El evento programado.
	 * @param {Object} env - El entorno de ejecución.
	 * @param {Object} ctx - El contexto de ejecución.
	 */
	async scheduled(event, env, ctx) {
		const precioMinimoPermitido = Number(await env.kvdof.get("precioMinimoPermitido", { cacheTtl: 3600 })).toFixed(4);
		console.log(`Precio minimo permitido: ${precioMinimoPermitido}`);

		// Intentamos obtener los datos XML de la URL proporcionada
		const xmlText = await getxml();

		//  Definimos las etiquetas de inicio y fin para extraer el valor del dólar y la fecha
		const itemEndTag = '</item>';
		const descriptionStartTag = '<description>';
		const descriptionEndTag = '</description>';
		const pubDateStartTag = '<pubDate>';
		const pubDateEndTag = '</pubDate>';

		// Buscamos el índice de la primera ocurrencia de la etiqueta de inicio del ítem
		const startIndex = xmlText.indexOf('<title>DOLAR');
		const endIndex = xmlText.indexOf(itemEndTag, startIndex);

		if (startIndex === -1 || endIndex === -1) {
			console.warn('No se encontró el valor del dólar en el XML del DOF, Omitiendo... y finalizando la ejecución.');
			return; // Si no se encuentra el valor del dólar, se finaliza la ejecución
		}

		// El precio del dólar se encuentra entre las etiquetas de descripción asi que lo extraemos y lo convertimos a un número
		const itemContent = xmlText.substring(startIndex, endIndex + itemEndTag.length);
		const descriptionStartIndex = itemContent.indexOf(descriptionStartTag) + descriptionStartTag.length;
		const descriptionEndIndex = itemContent.indexOf(descriptionEndTag, descriptionStartIndex);
		const valorDolar = Number(itemContent.substring(descriptionStartIndex, descriptionEndIndex)).toFixed(4);

		const pubDateStartIndex = itemContent.indexOf(pubDateStartTag) + pubDateStartTag.length;
		const pubDateEndIndex = itemContent.indexOf(pubDateEndTag, pubDateStartIndex);
		const fechaDolar = getDateBP(itemContent.substring(pubDateStartIndex, pubDateEndIndex));

		if (valorDolar < precioMinimoPermitido) {
			console.warn(`El valor del dólar ${valorDolar} es menor al precio mínimo permitido, Enviando fecha y precio minimo`);
			await saveDolar(env, precioMinimoPermitido, fechaDolar);
			return;
		}
		console.log(`Guardando valor del dolar: ${valorDolar} con fecha: ${fechaDolar}`);
		await saveDolar(env, valorDolar, fechaDolar);
	},
	// #endregion
};
