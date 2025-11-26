import api from "./api";

/**
 * Fetch Historical Stream Data for a specific topic
 * POST /get-stream-data/<deviceId>/<topic>
 * Topics: temp, moisture, humidity, battery, light
 */
export const getStreamDataByTopic = async (deviceId, topic) => {
  try {
    console.log(`📊 Fetching stream data for ${deviceId}/${topic}`);

    const response = await api.post(`/get-stream-data/${deviceId}/${topic}`);

    if (response.data.status === "Success") {
      console.log(
        `✅ Successfully fetched ${topic} data:`,
        response.data.data?.length || 0,
        "records"
      );
      return response.data.data || [];
    }

    console.warn(`⚠️ Non-success status for ${topic}:`, response.data);
    return [];
  } catch (error) {
    console.error(`❌ Error fetching ${topic} stream data:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      url: error.config?.url,
    });
    throw error;
  }
};

/**
 * Fetch State Details for a specific device and topic
 * POST /get-state-details/device/topic
 * Topics can include: temp5/new, moisture, humidity, battery, light, motor status, etc.
 * Example: getStateDetails("device0000", "temp5/new")
 */
export const getStateDetails = async (deviceId, topic) => {
  try {
    console.log(`📊 Fetching state details for ${deviceId}/${topic}`);

    const payload = {
      deviceId: deviceId,
      topic: topic,
    };

    const response = await api.post(`/get-state-details/device/topic`, payload);

    if (response.data.status === "Success") {
      console.log(
        `✅ Successfully fetched state details for ${topic}:`,
        response.data.data
      );
      return response.data.data;
    }

    console.warn(`⚠️ Non-success status for ${topic}:`, response.data);
    return null;
  } catch (error) {
    console.error(`❌ Error fetching state details for ${topic}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      url: error.config?.url,
    });
    throw error;
  }
};

/**
 * Fetch all historical stream data for a device
 * Fetches data from all topics: temp, moisture, humidity, battery, light
 * Returns combined data formatted for chart display
 */
export const getAllStreamData = async (deviceId) => {
  const topics = ["temp", "moisture", "humidity", "battery", "light"];

  try {
    console.log(`📊 Fetching all stream data for device: ${deviceId}`);

    // Fetch all topics in parallel
    const results = await Promise.allSettled(
      topics.map((topic) => getStreamDataByTopic(deviceId, topic))
    );

    // Organize data by timestamp
    const dataByTimestamp = new Map();

    results.forEach((result, index) => {
      const topic = topics[index];

      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        result.value.forEach((item) => {
          const timestamp =
            item.timestamp || item.time || new Date().toISOString();

          if (!dataByTimestamp.has(timestamp)) {
            dataByTimestamp.set(timestamp, {
              timestamp,
              time: new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              moisture: null,
              temperature: null,
              humidity: null,
              light: null,
              battery: null,
            });
          }

          const dataPoint = dataByTimestamp.get(timestamp);

          // Map topic to the correct field
          if (topic === "temp") {
            dataPoint.temperature = Number(item.value || item.temperature || 0);
          } else if (topic === "moisture") {
            dataPoint.moisture = Number(item.value || item.moisture || 0);
          } else if (topic === "humidity") {
            dataPoint.humidity = Number(item.value || item.humidity || 0);
          } else if (topic === "battery") {
            dataPoint.battery = Number(item.value || item.battery || 0);
          } else if (topic === "light") {
            dataPoint.light = Number(item.value || item.light || 0);
          }
        });
      } else if (result.status === "rejected") {
        console.warn(
          `⚠️ Failed to fetch ${topic} data:`,
          result.reason?.message
        );
      }
    });

    // Convert to array and sort by timestamp
    const chartData = Array.from(dataByTimestamp.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    console.log(`✅ Combined stream data: ${chartData.length} data points`);
    return chartData;
  } catch (error) {
    console.error("❌ Error fetching all stream data:", error);
    throw error;
  }
};

/*
 Fetch Historical Stream Data for CSV Export (Legacy endpoint)
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
