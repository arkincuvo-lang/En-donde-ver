// Plugin de Kino TV con TMDB (Prioridad México + Proveedores Internacionales + Enlaces Externos)

async function searchCatalog(query, settings) {
    const apiKey = settings.tmdb_api_key;
    if (!apiKey) {
        return [{ title: "Error: Falta configurar la API Key de TMDB en los ajustes.", url: "" }];
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=es-MX&query=${encodedQuery}&page=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return [];
        }

        let items = [];

        for (const item of data.results) {
            if (item.media_type !== 'movie' && item.media_type !== 'tv') continue;

            const id = item.id;
            const title = item.title || item.name || 'Sin título';
            const year = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
            const vote = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
            const overview = item.overview || 'Sin sinopsis disponible.';

            // Consultar proveedores de streaming (Watch Providers) para este contenido
            const providersUrl = `https://api.themoviedb.org/3/${item.media_type}/${id}/watch/providers?api_key=${apiKey}`;
            const provResponse = await fetch(providersUrl);
            const provData = await provResponse.json();

            let streamingInfo = [];

            if (provData.results) {
                // 1. Revisar disponibilidad en México (MX) - Prioridad plana de streaming (flatrate)
                const mxData = provData.results['MX'];
                if (mxData && mxData.flatrate && mxData.flatrate.length > 0) {
                    mxData.flatrate.forEach(p => {
                        streamingInfo.push(`${p.provider_name} (MX)`);
                    });
                }

                // 2. Si no hay en México, buscar en otros países disponibles (ej. USA, ES, etc.)
                if (streamingInfo.length === 0) {
                    for (const [countryCode, cData] of Object.entries(provData.results)) {
                        if (cData.flatrate && cData.flatrate.length > 0) {
                            cData.flatrate.forEach(p => {
                                streamingInfo.push(`${p.provider_name} (${countryCode})`);
                            });
                            break; // Tomar el primer país alternativo con opciones para no saturar
                        }
                    }
                }
            }

            let availabilityText = streamingInfo.length > 0 
                ? `Disponible en: ${streamingInfo.join(', ')}` 
                : 'No disponible en línea (Solo ficha técnica)';

            // Enlace oficial hacia TMDB para abrirse externamente
            const externalLink = `https://www.themoviedb.org/${item.media_type}/${id}`;

            items.push({
                title: `${title} (${year}) - ⭐ ${vote}`,
                description: `${availabilityText}\n\nSinopsis: ${overview}`,
                image: poster,
                // Forzar apertura en aplicación externa / navegador del sistema y evitar reproductor interno
                url: externalLink,
                isExternal: true 
            });
        }

        return items;
    } catch (error) {
        return [{ title: "Error al conectar con TMDB", description: error.toString(), url: "" }];
    }
}
