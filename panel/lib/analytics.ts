import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';

const credentialsPath = path.join(process.cwd(), 'google-credentials.json');

// Inicializa el cliente de Google Analytics con el archivo de credenciales
const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: credentialsPath,
});

export async function getAnalyticsMetrics(propertyId: string) {
  if (!propertyId) return { visitas: 0, clickPostularme: 0 };

  try {
    // Consulta 1: Total de visitas (sesiones o pageviews)
    const [visitasResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      metrics: [
        {
          name: 'screenPageViews',
        },
      ],
    });

    const visitas = parseInt(visitasResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

    // Consulta 2: Eventos de click en postularme
    // Asumimos que el evento se llama 'click_postularme'. Si tiene otro nombre, se debe cambiar aquí.
    const [eventosResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'eventName',
        },
      ],
      metrics: [
        {
          name: 'eventCount',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            value: 'click_postularme', // Ajustar al nombre real del evento
          }
        }
      }
    });

    const clickPostularme = parseInt(eventosResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

    return { visitas, clickPostularme };
  } catch (error) {
    console.error('Error fetching Google Analytics data:', error);
    return { visitas: 0, clickPostularme: 0 };
  }
}
