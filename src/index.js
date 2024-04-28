/**
 * @typedef {Object} Env
 */

export default {
	/**
	 * @param {Request} request
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, ctx) {
		const response = await fetch('https://www.dof.gob.mx/indicadores.xml')
		const xmlText = await response.text()
		console.log(xmlText);

  		// Parse XML manually
  		const itemStartTag = '<item>'
  		const itemEndTag = '</item>'
  		const titleStartTag = '<title>'
  		const titleEndTag = '</title>'
  		const descriptionStartTag = '<description>'
  		const descriptionEndTag = '</description>'

  		// Find the index of the start and end of the item with title "DOLAR"
  		const startIndex = xmlText.indexOf('DOLAR')
  		const endIndex = xmlText.indexOf(itemEndTag, startIndex)

  		if (startIndex === -1 || endIndex === -1) {
			return new Response('Item not found', { status: 404 })
  		}

  		// Extract the description value
  		const itemContent = xmlText.substring(startIndex, endIndex + itemEndTag.length)
  		const descriptionStartIndex = itemContent.indexOf(descriptionStartTag) + descriptionStartTag.length
  		const descriptionEndIndex = itemContent.indexOf(descriptionEndTag, descriptionStartIndex)
  		const dolarDescription = itemContent.substring(descriptionStartIndex, descriptionEndIndex)
		var dolarvalue = Number(dolarDescription)

		console.log(dolarvalue < 17.15)

  		// Prepare response
  		const responseBody = `<div class="col-md-12">
	  		<p class="tc-date">VIERNES 26 / ABRIL / 2024</p>
			<p class="tc-value">$${dolarvalue}</p>
			</div>`;
		const init = {
    		headers: {
      			'Content-Type': 'text/html; charset=utf-8',
    		},
  		}
  		return new Response(responseBody, init)
	},
};
