import { getxml } from "./getxml";
import { getDateBP } from "./getDateBP";
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
		const url = new URL(request.url);
		if (request.method !== "GET") {
			console.warn("Método no permitido");
			return new Response("Método no permitido", { status: 405 });
		}else if (url.pathname !== "/MX/tc_barmesa/_tipo-de-cambio.html") {
			console.warn("URL no permitida");
			return new Response("URL no permitida", { status: 403 });
		}
		// Obtenemos el precio mínimo del dólar de la base de datos de clave-valor de DOF (con un tiempo de vida en caché de 1 hora)
		const precioMinimoPermitido = Number(await env.kvdof.get("precioMinimo",{ cacheTtl: 3600 }));
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
			return respuestatc(await env.kvdof.get("fecha",{ cacheTtl: 3600 }), await env.kvdof.get("precio",{ cacheTtl: 3600 }));
		}

		// El precio del dólar se encuentra entre las etiquetas de descripción asi que lo extraemos y lo convertimos a un número
		const itemContent = xmlText.substring(startIndex, endIndex + itemEndTag.length);
		const descriptionStartIndex = itemContent.indexOf(descriptionStartTag) + descriptionStartTag.length;
		const descriptionEndIndex = itemContent.indexOf(descriptionEndTag, descriptionStartIndex);
		const dolarDescription = itemContent.substring(descriptionStartIndex, descriptionEndIndex);
		const pubDateStartIndex = itemContent.indexOf(pubDateStartTag) + pubDateStartTag.length;;
		const pubDateEndIndex = itemContent.indexOf(pubDateEndTag, pubDateStartIndex);
		const pubDate = itemContent.substring(pubDateStartIndex, pubDateEndIndex);
		const fechaDolar = getDateBP(pubDate);
		var valorDolar = Number(dolarDescription);

		if (valorDolar < precioMinimoPermitido) {
			console.warn(`El valor del dólar ${valorDolar} es menor al precio mínimo permitido , Enviando ultima fecha y precio guardado en cache`);
			//TODO: Verificar que es mejor, precio minimo o ultimo precio
			return respuestatc(await env.kvdof.get("fecha",{ cacheTtl: 3600 }), await env.kvdof.get("precioMinimoPermitido",{ cacheTtl: 3600 }));
		}else{
			try {
				await env.kvdof.put("precio",valorDolar.toString());
				await env.kvdof.put("fecha",fechaDolar);
			} catch (error) {
				console.error(error);
			}
		}
		// Prepare response
		return respuestatc(fechaDolar, valorDolar);
	},
};
