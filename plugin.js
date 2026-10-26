/**
 * Plugin de TMDB para Kino TV
 */

// Función principal de catálogo y búsqueda
async function catalog(params, settings) {
    const query = params && params.query ? params.query : "";
    const apiKey = (settings && settings.tmdb_api_key && settings.tmdb_api_key !== "9d185627a7959b27ea6c2b6acfe308a1") 
        ? settings.tmdb_api_key 
        : "";

    if (!apiKey) {
        return [{
            id: "error-key",
            title: "Configura tu API Key de TMDB",
            description: "Ve a los ajustes del plugin e ingresa tu llave de TMDB.",
            url: "https://www.themoviedb.org/"
        }];
    }

    if (!query) {
        return [];
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

            let availabilityText = 'No disponible en línea';
            try {
                const providersUrl = `https://api.themoviedb.org/3/${item.media_type}/${id}/watch/providers?api_key=${apiKey}`;
                const provResponse = await fetch(providersUrl);
                const provData = await provResponse.json();

                let streamingInfo = [];

                if (provData.results) {
                    // Prioridad México (MX)
                    const mxData = provData.results['MX'];
                    if (mxData && mxData.flatrate && mxData.flatrate.length > 0) {
                        mxData.flatrate.forEach(p => {
                            streamingInfo.push(`${p.provider_name} (MX)`);
                        });
                    }

                    // Si no hay en México, buscar en otros países
                    if (streamingInfo.length === 0) {
                        for (const [countryCode, cData] of Object.entries(provData.results)) {
                            if (cData.flatrate && cData.flatrate.length > 0) {
                                cData.flatrate.forEach(p => {
                                    streamingInfo.push(`${p.provider_name} (${countryCode})`);
                                });
                                break;
                            }
                        }
                    }
                }

                if (streamingInfo.length > 0) {
                    availabilityText = `Disponible en: ${streamingInfo.join(', ')}`;
                }
            } catch (e) {
                // Silenciar errores de red secundarios
            }

            const externalLink = `https://www.themoviedb.org/${item.media_type}/${id}`;

            items.push({
                id: `${item.media_type}-${id}`,
                title: `${title} (${year}) - ⭐ ${vote}`,
                description: `${availabilityText}\n\n${overview}`,
                image: poster,
                url: externalLink,
                isExternal: true
            });
        }

        return items;
    } catch (error) {
        return [{
            id: "error-fetch",
            title: "Error al conectar con TMDB",
            description: error.toString(),
            url: "https://www.themoviedb.org/"
        }];
    }
}

// Exportar para el motor de Kino
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { catalog };
}
