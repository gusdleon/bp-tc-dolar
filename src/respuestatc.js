/**
 * Genera una respuesta con la fecha y valor del dólar proporcionados.
 * @param {string} dolarDate - La fecha del valor del dólar.
 * @param {number} dolarvalue - El valor del dólar.
 * @returns {Response} - La respuesta generada.
 */
export function respuestatc(dolarDate, dolarvalue) {
	const responseBody = `<div class="col-md-12">`+
		`\n\t<p class="tc-date">${dolarDate}</p>`+
		`\n\t<p class="tc-value">$${dolarvalue}</p>`+
	`\n</div>\n`;
	const init = {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Vary': 'Accept-Encoding',
			'Cache-Control': 'no-store, must-revalidate',
		},
	};
	return new Response(responseBody, init);
}
