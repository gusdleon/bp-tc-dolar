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
	 * @returns {Promise<Response>} - La respuesta HTTP con el valor del dólar.
	 */
	async fetch(request, env, ctx) {
		// #region Validaciones de la solicitud
		/** Se verifica que el método de la solicitud sea GET
		 * y que la ruta sea "/MX/tc_barmesa/_tipo-de-cambio.html".
		 * Si no cumple con las validaciones, se devuelve una respuesta
		 * con el código de estado correspondiente.
		 */
		const {respuestatc} = await import("./respuestatc"); // Importación dinámica de la función respuestatc
		const url = new URL(request.url);
		if (request.method !== "GET") {
			console.warn("Método no permitido");
			return new Response("Método no permitido", { status: 405 });
		}
		const kvdata = await env.tc.get("data", { cacheTtl: 3600 })
		const data = JSON.parse( kvdata );
		if(request.headers.get("If-Modified-Since") != null){
			console.log("Solicitud con If-Modified-Since");
			const kVUltAct = data.ultimaAct;
			const fecha = new Date(kVUltAct);
			const fechaMod = new Date(request.headers.get("If-Modified-Since"));
			if(fecha.getTime() <= fechaMod.getTime()){
				console.log("Sin cambios");
				return new Response(null, { status: 304, headers: {'Vary': 'Accept-Encoding','Cache-Control': 'no-store',} });
			}
		}
		if (url.pathname !== "/MX/tc_barmesa/_tipo-de-cambio.html") {
			if(url.pathname == "/" || url.pathname == "" || url.pathname == "/MX/tc_barmesa/_tipo-de-cambio"){
				console.log("Redireccionando a /MX/tc_barmesa/_tipo-de-cambio.html");
				if(url.port == ""){
					return Response.redirect(`${url.protocol}${url.hostname}/MX/tc_barmesa/_tipo-de-cambio.html`, 302);
				}else{
					return Response.redirect(`${url.protocol}${url.hostname}:${url.port}/MX/tc_barmesa/_tipo-de-cambio.html`, 302);
				}
			}
			if (url.pathname == "/MX/tc_barmesa/_tipo-de-cambio.json"){
				return new Response(kvdata,{
					headers:{
						'status': '200',
						'Content-Type': 'application/json; charset=utf-8'
					}
				});
			}
			if(url.pathname == "/favicon.ico"){
				const fav = await env.tc.get("favicon", { cacheTtl: 3600, type: "stream"});
				return new Response(fav, { headers: { "Content-Type": "image/png" } });
			}
			console.warn("URL no permitida");
			return new Response("URL no permitida", { status: 403 });
		}
		// #endregion

		// Se obtiene el valor del dólar guardado en la caché
		// y se devuelve una respuesta con el valor del dólar y la fecha
		return respuestatc(data);
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
		const { getxml } = await import("./getxml"); // Importación dinámica de la función getxml
		const precioMinimoPermitido = Number(await env.tc.get("precioMinimoPermitido", { cacheTtl: 3600 })).toFixed(4);
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

		const { getDateBP } = await import("./getDateBP"); // Importación dinámica de la función getDateBP
		const { saveDolar } = await import("./saveDolar"); // Importación dinámica de la función saveDolar
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
