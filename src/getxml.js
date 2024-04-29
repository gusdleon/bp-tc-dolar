/**
 * Obtiene los datos XML de la URL proporcionada.
 * @returns {Promise<string>} Los datos XML en formato de texto.
 */
export async function getxml() {
	try {
		// Realizamos una solicitud para obtener los datos XML de la URL proporcionada
		// y configuramos el tiempo de vida en caché de la respuesta a 1 hora
		const xml = await fetch('https://www.dof.gob.mx/indicadores.xml', {
			cf: {
				cacheTtl: 3600,
				cacheEverything: true,
			},
		});
		if (!xml.ok) {
			// Si la solicitud falla, lanzamos un error
			throw new Error(`Failed to fetch XML data ${xml.status} - ${xml.statusText}`);
		}
		console.log("Datos XML obtenidos exitosamente");
		return await xml.text(); // Convertimos los datos XML en texto
	} catch (error) {
		// Si ocurre un error, lo imprimimos en la consola
		console.error(error); // y devolvemos una cadena vacía
		return '';
	}
}
