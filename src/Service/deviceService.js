import api from "./api";

/*
 Fetch Historical Stream Data for CSV Export
 Retrieve data via /get-stream-data/device API
 */
export const getHistoricalData = async (deviceId) => {
  try {
    // Default to last 24 hours if not specified
    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 1);

    const response = await api.get("/get-stream-data/device", {
      params: {
        deviceId: deviceId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        pagination: 0, // 0 usually implies no pagination/all data in some APIs, or page 0
        pageSize: 1000, // Fetch a large batch for export
      },
    });

    if (response.data.status === "Success") {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching history for export:", error);
    throw error;
  }
};

/*
  Update Device State (Pump/Thresholds) - Fixed to match API documentation
 */
export const updateDeviceState = async (deviceId, payload) => {
  try {
    const response = await api.post(`/update-state-details`, {
      deviceId: deviceId,
      ...payload,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating device state:", error);
    throw error;
  }
};
