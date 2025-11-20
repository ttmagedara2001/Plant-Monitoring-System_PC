import api from './api';

/**
 * Fetch Historical Stream Data
 * Source 50: /get-stream-data/device
 */
export const getHistoricalData = async (deviceId, startTime, endTime) => {
  try {
    const response = await api.get('/get-stream-data/device', {
      params: {
        deviceId: deviceId,
        startTime: startTime.toISOString(), // Must be ISO-8601 (Source 80)
        endTime: endTime.toISOString(),
        pagination: 0,
        pageSize: 100 // Adjust based on needs
      }
    });

    if (response.data.status === "Success") {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
};

/**
 * Control Device (Update State)
 * Source 159: /update-state-details
 */
export const updateDeviceState = async (deviceId, topic, payload) => {
  try {
    const response = await api.post('/update-state-details', {
      deviceId: deviceId,
      topic: topic, // e.g., "motor/paddy"
      payload: payload // e.g., { "power": "on" }
    });
    
    return response.data;
  } catch (error) {
    console.error("Error updating state:", error);
    throw error;
  }
};