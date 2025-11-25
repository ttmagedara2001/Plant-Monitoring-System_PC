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
    console.error("Error fetching history for export:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      url: error.config?.url,
    });
    throw error;
  }
};

/*
  Update Device State (Pump/Thresholds) - Fixed to match API documentation
 */
export const updateDeviceState = async (deviceId, payload) => {
  try {
    console.log("Updating device state:", { deviceId, payload });

    // Try different payload structures for device state updates
    const updatePayload = {
      deviceId: deviceId,
      ...payload,
    };

    console.log("Sending update payload:", updatePayload);

    const response = await api.post(`/update-state-details`, updatePayload);

    console.log("Device state update response:", response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 405) {
      console.error(
        "❌ Method not allowed for update-state-details. Server may not support POST."
      );
      console.error(
        "Allowed methods:",
        error.response.headers?.allow || "Unknown"
      );

      // Try PUT method as alternative
      try {
        console.log("🔄 Trying PUT method as alternative...");
        const putResponse = await api.put(`/update-state-details`, {
          deviceId: deviceId,
          ...payload,
        });
        console.log("PUT method successful:", putResponse.data);
        return putResponse.data;
      } catch (putError) {
        console.error("PUT method also failed:", putError.response?.data);
      }
    }

    if (error.response?.status === 400) {
      console.error("🔍 Device Update 400 Error Analysis:", {
        endpoint: "/update-state-details",
        sentPayload: { deviceId, ...payload },
        serverResponse: error.response.data,
        possibleCauses: [
          "Invalid deviceId format",
          "Unrecognized setting fields",
          "Out of range values",
          "Missing required parameters",
        ],
      });
    }

    console.error("Error updating device state:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
    });
    throw error;
  }
};
