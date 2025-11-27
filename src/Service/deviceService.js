import api from "./api";

/**
 * Fetch Historical Stream Data for a specific topic
 * POST /get-stream-data/device/topic
 * Topics: temp4/new, moisture, humidity, battery, light, etc.
 * Requires: deviceId, topic, startTime, endTime, pagination, pageSize
 */
export const getStreamDataByTopic = async (
  deviceId,
  topic,
  startTime = null,
  endTime = null,
  pagination = 0,
  pageSize = 100
) => {
  try {
    // Helper function to format date to ISO-8601 without milliseconds
    const formatISODate = (date) => {
      return date.toISOString().split(".")[0] + "Z"; // Remove milliseconds
    };

    // Set default time range to last 24 hours if not provided
    const endDate = endTime ? new Date(endTime) : new Date();
    const startDate = startTime
      ? new Date(startTime)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Ensure times are in ISO-8601 format without milliseconds (API requirement)
    // Note: pagination and pageSize must be strings per API specification
    const payload = {
      deviceId: deviceId,
      topic: topic,
      startTime: formatISODate(startDate),
      endTime: formatISODate(endDate),
      pagination: String(pagination),
      pageSize: String(pageSize),
    };

    const response = await api.post(`/get-stream-data/device/topic`, payload);

    if (response.data.status === "Success") {
      const dataLength = response.data.data?.length || 0;
      if (dataLength > 0) {
        console.log(`✅ ${topic}: ${dataLength} records`);
      }
      return response.data.data || [];
    }

    return [];
  } catch (error) {
    // Silently handle common errors (device auth, no data found, etc.)
    // These are already logged by api.js interceptor
    // Return empty array instead of throwing to allow other topics to load
    return [];
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
 * Fetches data from all topics: temp4/new, moisture, humidity, battery, light
 * Returns combined data formatted for chart display
 *
 * NOTE: This endpoint may return 400 errors if:
 * - No data exists for the device yet
 * - Topics don't exist in the database
 * - Date range is invalid
 * This is normal for new devices - real-time MQTT data will still work
 */
export const getAllStreamData = async (
  deviceId,
  startTime = null,
  endTime = null
) => {
  // Use common topic naming conventions (adjust based on your device setup)
  const topics = ["temp", "moisture", "humidity", "battery", "light"];

  try {
    // Fetch all topics in parallel with time parameters
    const results = await Promise.allSettled(
      topics.map((topic) =>
        getStreamDataByTopic(deviceId, topic, startTime, endTime, 0, 100)
      )
    );

    // Count successful vs failed requests
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.length > 0
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const empty = results.filter(
      (r) => r.status === "fulfilled" && r.value.length === 0
    ).length;

    // Only log summary if there's actual data or if it's the first fetch
    if (successful > 0) {
      console.log(`📊 Loaded ${successful} topics with historical data`);
    } else if (!window.__historicalDataWarningShown) {
      console.warn(
        `ℹ️ No historical data available yet. Real-time data will still work.`
      );
      window.__historicalDataWarningShown = true;
    }

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

    if (chartData.length > 0) {
      console.log(`✅ Historical data: ${chartData.length} data points`);
    }
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
  Update Device State (Pump/Thresholds) - Matches API documentation
  POST /update-state-details
  Required: deviceId, topic, payload (as nested object with key-value pairs)
  Example: { deviceId: "device0000", topic: "temp5/new", payload: { humidity: 100 } }
 */
export const updateDeviceState = async (deviceId, topic) => {
  try {
    console.log("Updating device state:", { deviceId, topic });

    // Build request body according to API documentation
    const requestBody = {
      deviceId: deviceId,
      topic: topic,
    };

    console.log(
      "📤 Update state request body:",
      JSON.stringify(requestBody, null, 2)
    );

    const response = await api.post(`/update-state-details`, requestBody);

    console.log("✅ Device state update response:", response.data);
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
    }

    if (error.response?.status === 400) {
      console.error("🔍 Device Update 400 Error Analysis:", {
        endpoint: "/update-state-details",
        sentPayload: requestBody,
        serverResponse: error.response.data,
        possibleCauses: [
          "Invalid deviceId format",
          "Topic not found or invalid format",
          "Payload structure incorrect (should be key-value pairs)",
          "Missing required parameters (deviceId, topic, payload)",
          "Topic doesn't exist - new topic will be created automatically",
        ],
      });
    }

    console.error("❌ Error updating device state:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      requestBody: requestBody,
    });
    throw error;
  }
};

/**
 * Helper function for updating pump status
 * @param {string} deviceId - Device ID
 * @param {string} status - Pump status ('ON' or 'OFF')
 * @param {string} topic - Topic to update (default: 'pump/status')
 */
export const updatePumpStatus = async (deviceId, status, topic = "pump") => {
  return updateDeviceState(deviceId, topic, { pumpStatus: status });
};

// Note: Device settings (thresholds) are managed in frontend localStorage only
// No backend API available for settings, so no updateDeviceSettings() function needed
