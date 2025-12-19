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
    const now = new Date();
    const endDate = endTime ? new Date(endTime) : now;
    const startDate = startTime
      ? new Date(startTime)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log(`⏰ [HTTP] Time calculation for ${topic}:`, {
      currentTime: now.toISOString(),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      rangeHours: ((endDate - startDate) / (1000 * 60 * 60)).toFixed(1),
    });

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

    // Log in exact order for verification
    console.log(`📤 [HTTP] Fetching ${topic} data:`);
    console.log(
      JSON.stringify(
        {
          deviceId: payload.deviceId,
          topic: payload.topic,
          startTime: payload.startTime,
          endTime: payload.endTime,
          pagination: payload.pagination,
          pageSize: payload.pageSize,
        },
        null,
        2
      )
    );

    const response = await api.post(`/get-stream-data/device/topic`, payload);

    console.log(`📥 [HTTP] Response for ${topic}:`, {
      status: response.data.status,
      dataLength: response.data.data?.length || 0,
    });

    if (response.data.status === "Success") {
      const dataLength = response.data.data?.length || 0;
      if (dataLength > 0) {
        console.log(`✅ ${topic}: ${dataLength} records`);
        // Log first record to see data structure
        console.log(`📋 [HTTP] Sample ${topic} record:`, response.data.data[0]);
      } else {
        console.log(`ℹ️ ${topic}: No data found in time range`);
      }
      return response.data.data || [];
    }

    return [];
  } catch (error) {
    // Extract meaningful error message from various response formats
    let errorMessage = "Unknown error";

    if (error.response?.data) {
      // Try different possible error message locations
      errorMessage =
        error.response.data.data ||
        error.response.data.message ||
        error.response.data.error ||
        (typeof error.response.data === "string"
          ? error.response.data
          : null) ||
        JSON.stringify(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Log error details for debugging
    console.warn(`⚠️ [HTTP] Error fetching ${topic}:`, {
      status: error.response?.status || "No response",
      statusText: error.response?.statusText || "N/A",
      message: errorMessage,
      fullResponse: error.response?.data,
    });

    // Return empty array instead of throwing to allow other topics to load
    return [];
  }
};

/**
 * Fetch State Details for a specific device and topic
 * POST /get-state-details/device/topic
 * Topics can include: temp, moisture, humidity, battery, light, motor status, etc.
 * Example: getStateDetails("device0000", "temp")
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
 * Fetches data from all topics with fallback to alternative topic names
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
  // Try multiple topic naming conventions
  // Format 1: Simple names (temp, moisture, humidity, battery, light)
  // Format 2: Extended names (temp4/new, temp5/new, etc.)
  const topicVariants = [
    // Try simple names first (most common)
    { name: "temp", label: "temperature" },
    { name: "moisture", label: "moisture" },
    { name: "humidity", label: "humidity" },
    { name: "battery", label: "battery" },
    { name: "light", label: "light" },
  ];

  try {
    console.log(`📊 [HTTP] Fetching historical data for ${deviceId}`);
    console.log(
      `📅 [HTTP] Time range: ${startTime || "Last 24h"} to ${endTime || "Now"}`
    );

    // Fetch all topics in parallel with time parameters
    const results = await Promise.allSettled(
      topicVariants.map((topic) =>
        getStreamDataByTopic(deviceId, topic.name, startTime, endTime, 0, 100)
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

    // Detailed logging for debugging
    console.log(`📊 [HTTP] Historical data summary:`, {
      successful: successful,
      empty: empty,
      failed: failed,
      total: topicVariants.length,
    });

    // Only log summary if there's actual data or if it's the first fetch
    if (successful > 0) {
      console.log(`✅ [HTTP] Loaded ${successful} topics with historical data`);
    } else if (!window.__historicalDataWarningShown) {
      console.warn(
        `ℹ️ [HTTP] No historical data available yet. Real-time data will still work.`
      );
      console.warn(`💡 [HTTP] Possible reasons:`);
      console.warn(
        `   1. Device recently added - ProtoNest hasn't saved MQTT data to DB yet`
      );
      console.warn(
        `   2. Topic names mismatch - check what topic names are saved in DB`
      );
      console.warn(
        `   3. Device not in your account - verify device ownership`
      );
      window.__historicalDataWarningShown = true;
    }

    // Organize data by timestamp
    const dataByTimestamp = new Map();

    results.forEach((result, index) => {
      const topicInfo = topicVariants[index];
      const topicName = topicInfo.name;
      const label = topicInfo.label;

      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        console.log(
          `🔍 [HTTP] Processing ${topicName}: ${result.value.length} records`
        );

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

          // Parse payload if it's a JSON string (ProtoNest returns payload as string)
          let parsedData = item;
          if (item.payload && typeof item.payload === "string") {
            try {
              parsedData = JSON.parse(item.payload);
            } catch (e) {
              console.warn(
                `⚠️ Failed to parse payload for ${topicName}:`,
                item.payload
              );
              parsedData = item;
            }
          } else if (item.payload && typeof item.payload === "object") {
            parsedData = item.payload;
          }

          // Map topic to the correct field using label
          if (label === "temperature" || topicName === "temp") {
            dataPoint.temperature = Number(
              parsedData.temp || parsedData.temperature || item.value || 0
            );
            console.log(
              `  📊 [${timestamp}] temperature: ${dataPoint.temperature}`
            );
          } else if (label === "moisture") {
            dataPoint.moisture = Number(parsedData.moisture || item.value || 0);
            console.log(`  📊 [${timestamp}] moisture: ${dataPoint.moisture}`);
          } else if (label === "humidity") {
            dataPoint.humidity = Number(parsedData.humidity || item.value || 0);
            console.log(`  📊 [${timestamp}] humidity: ${dataPoint.humidity}`);
          } else if (label === "battery") {
            dataPoint.battery = Number(parsedData.battery || item.value || 0);
            console.log(`  📊 [${timestamp}] battery: ${dataPoint.battery}`);
          } else if (label === "light") {
            dataPoint.light = Number(parsedData.light || item.value || 0);
            console.log(`  📊 [${timestamp}] light: ${dataPoint.light}`);
          }
        });
      } else if (result.status === "rejected") {
        console.warn(
          `⚠️ [HTTP] Failed to fetch ${topicName} data:`,
          result.reason?.message
        );
      }
    });

    // Convert to array and sort by timestamp
    const chartData = Array.from(dataByTimestamp.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Fill in missing values with last known values to create continuous lines
    const lastKnownValues = {
      moisture: null,
      temperature: null,
      humidity: null,
      light: null,
      battery: null,
    };

    chartData.forEach((dataPoint) => {
      // For each sensor, if current value is null, use last known value
      // Otherwise, update last known value
      Object.keys(lastKnownValues).forEach((key) => {
        if (
          dataPoint[key] !== null &&
          dataPoint[key] !== undefined &&
          dataPoint[key] !== 0
        ) {
          lastKnownValues[key] = dataPoint[key];
        } else if (lastKnownValues[key] !== null) {
          dataPoint[key] = lastKnownValues[key];
        }
      });
    });

    if (chartData.length > 0) {
      console.log(
        `✅ [HTTP] Historical data: ${chartData.length} data points combined`
      );
      console.log(
        `📅 [HTTP] Time range: ${chartData[0].time} to ${
          chartData[chartData.length - 1].time
        }`
      );
      console.log(
        `📊 [HTTP] Latest data point:`,
        chartData[chartData.length - 1]
      );
    }
    return chartData;
  } catch (error) {
    console.error("❌ [HTTP] Error fetching all stream data:", error);
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
export const updateDeviceState = async (deviceId, topic, payload = {}) => {
  try {
    console.log("Updating device state:", { deviceId, topic, payload });

    // Build request body according to API documentation
    const requestBody = {
      deviceId: deviceId,
      topic: topic,
      payload: payload,
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
 * Helper function for updating pump status via HTTP API
 * The backend will receive this and forward to MQTT broker
 * @param {string} deviceId - Device ID
 * @param {string} status - Pump status ('ON' or 'OFF')
 * @param {string} topic - Topic to update (default: 'pump')
 * @param {string} mode - Control mode ('auto' or 'manual', default: 'auto')
 */
export const updatePumpStatus = async (
  deviceId,
  status,
  topic = "pump",
  mode = "auto"
) => {
  // Convert status to lowercase for MQTT compatibility
  const pumpValue = status.toLowerCase(); // "ON" -> "on", "OFF" -> "off"

  console.log(`📤 Sending pump command via HTTP API:`, {
    deviceId,
    topic,
    pump: pumpValue,
    mode: mode,
  });

  // Send to HTTP API with MQTT-compatible payload
  // Backend should forward this to: protonest/<deviceId>/state/<topic>
  return updateDeviceState(deviceId, topic, {
    pump: pumpValue, // "on" or "off"
    mode: mode, // "auto" (automation triggered) or "manual" (user button)
  });
};

// Note: Device settings (thresholds) are managed in frontend localStorage only
// No backend API available for settings, so no updateDeviceSettings() function needed
