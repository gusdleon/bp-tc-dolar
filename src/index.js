import { getxml } from "./getxml";
import { getDateBP } from "./getDateBP";
import { saveDolar } from "./saveDolar";
import { respuestatc } from "./respuestatc";

export default {
	/**
	 * Realiza una solicitud para obtener datos XML de la URL proporcionada y devuelve una respuesta con un valor de dólar específico.
	 * @param {Request} request - La solicitud de la función fetch.
	 * @param {any} env - El entorno de ejecución.
	 * @param {any} ctx - El contexto de ejecución.
	 * @returns {Response} - La respuesta que contiene el valor del dólar en formato HTML.
	 */
	async fetch(request, env, ctx) {
		// Verificamos que la solicitud sea un método GET y que la URL sea la correcta
		// #region Validaciones de la solicitud
		const url = new URL(request.url);
		if (request.method !== "GET") {
			console.warn("Método no permitido");
			return new Response("Método no permitido", { status: 405 });
		} else if (url.pathname !== "/MX/tc_barmesa/_tipo-de-cambio.html") {
			console.warn("URL no permitida");
			return new Response("URL no permitida", { status: 403 });
		}
		// #endregion
		// Obtenemos el precio mínimo del dólar de la base de datos de clave-valor de DOF (con un tiempo de vida en caché de 1 hora)
		const kVFecha = await env.kvdof.get("fecha", { cacheTtl: 3600 });
		//console.log(`Fecha guardada: ${kVFecha}`);
		const kVPrecio = Number(await env.kvdof.get("precio", { cacheTtl: 3600 })).toFixed(4);
		//console.log(`Precio guardado: ${kVPrecio}`);
		return respuestatc(kVFecha, kVPrecio);
	},
	async scheduled(event, env, ctx) {
		const precioMinimoPermitido = Number(await env.kvdof.get("precioMinimo", { cacheTtl: 3600 })).toFixed(4);
		console.log(`Precio minimo permitido: ${precioMinimoPermitido}`);
		var xmlText = '';
		// Intentamos obtener los datos XML de la URL proporcionada
		xmlText = await getxml();

		//  Definimos las etiquetas de inicio y fin para extraer el valor del dólar
		const itemEndTag = '</item>';
		const descriptionStartTag = '<description>';
		const descriptionEndTag = '</description>';
		const pubDateStartTag = '<pubDate>';
		const pubDateEndTag = '</pubDate>';

		// Buscamos el índice de la primera ocurrencia de la etiqueta de inicio del ítem
		const startIndex = xmlText.indexOf('<title>DOLAR');
		const endIndex = xmlText.indexOf(itemEndTag, startIndex);

		if (startIndex === -1 || endIndex === -1) {
			console.warn('No se encontró el valor del dólar en el XML del DOF, Enviando ultima fecha y precio guardado en cache');
			return; // Terminate the execution without returning anything
		}

		// El precio del dólar se encuentra entre las etiquetas de descripción asi que lo extraemos y lo convertimos a un número
		const itemContent = xmlText.substring(startIndex, endIndex + itemEndTag.length);
		const descriptionStartIndex = itemContent.indexOf(descriptionStartTag) + descriptionStartTag.length;
		const descriptionEndIndex = itemContent.indexOf(descriptionEndTag, descriptionStartIndex);
		const dolarDescription = itemContent.substring(descriptionStartIndex, descriptionEndIndex);
		const pubDateStartIndex = itemContent.indexOf(pubDateStartTag) + pubDateStartTag.length;
		const pubDateEndIndex = itemContent.indexOf(pubDateEndTag, pubDateStartIndex);
		const pubDate = itemContent.substring(pubDateStartIndex, pubDateEndIndex);
		const fechaDolar = getDateBP(pubDate);
		const valorDolar = Number(dolarDescription).toFixed(4);

		if (valorDolar < precioMinimoPermitido) {
			console.warn(`El valor del dólar ${valorDolar} es menor al precio mínimo permitido , Enviando fecha y precio minimo`);
			await saveDolar(env, precioMinimoPermitido, fechaDolar);
			return;
		}
		console.log(`Guardando valor del dolar: ${valorDolar} con fecha: ${fechaDolar}`);
		await saveDolar(env, valorDolar, fechaDolar);
	},
};
