import api from "./api";

/**
 * Fetch historical stream data for a single topic.
 *
 * @param {string} deviceId  - Device identifier
 * @param {string} topic     - Topic name (e.g. "pmc/temperature")
 * @param {string|null} startTime - ISO start time (default: 24 h ago)
 * @param {string|null} endTime   - ISO end time (default: now)
 * @param {number} pagination
 * @param {number} pageSize
 * @returns {Promise<Array>} Array of data records
 */
export const getStreamDataByTopic = async (
  deviceId,
  topic,
  startTime = null,
  endTime = null,
  pagination = 0,
  pageSize = 100,
) => {
  try {
    const formatISO = (d) => d.toISOString().split(".")[0] + "Z";

    const now = new Date();
    const endDate = endTime ? new Date(endTime) : now;
    const startDate = startTime
      ? new Date(startTime)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const payload = {
      deviceId,
      topic,
      startTime: formatISO(startDate),
      endTime: formatISO(endDate),
      pagination: String(pagination),
      pageSize: String(pageSize),
    };

    const response = await api.post("/get-stream-data/device/topic", payload);

    if (response.data.status === "Success") {
      return response.data.data || [];
    }
    return [];
  } catch (error) {
    console.warn(
      `[Device] Error fetching ${topic}:`,
      error.response?.data?.data || error.message,
    );
    return [];
  }
};

/**
 * Fetch latest state details for a device topic.
 *
 * @param {string} deviceId
 * @param {string} topic - e.g. "pmc/temperature", "pmc/pump"
 * @returns {Promise<any>} State data or null
 */
export const getStateDetails = async (deviceId, topic) => {
  try {
    const response = await api.post("/get-state-details/device", {
      deviceId,
      topic,
    });
    if (response.data.status === "Success") return response.data.data;
    return null;
  } catch (error) {
    console.error(`[Device] State details error (${topic}):`, error.message);
    throw error;
  }
};

/**
 * Fetch historical data for all sensor topics and combine into chart-ready format.
 *
 * @param {string} deviceId
 * @param {string|null} startTime
 * @param {string|null} endTime
 * @returns {Promise<Array>} Sorted array of { timestamp, time, moisture, temperature, ... }
 */
export const getAllStreamData = async (
  deviceId,
  startTime = null,
  endTime = null,
) => {
  const topicVariants = [
    { name: "pmc/temperature", label: "temperature" },
    { name: "pmc/moisture", label: "moisture" },
    { name: "pmc/humidity", label: "humidity" },
    { name: "pmc/battery", label: "battery" },
    { name: "pmc/light", label: "light" },
  ];

  try {
    const results = await Promise.allSettled(
      topicVariants.map((t) =>
        getStreamDataByTopic(deviceId, t.name, startTime, endTime, 0, 100),
      ),
    );

    // Organise data by timestamp
    const dataByTimestamp = new Map();

    results.forEach((result, index) => {
      const label = topicVariants[index].label;
      if (result.status !== "fulfilled" || !Array.isArray(result.value)) return;

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

        const dp = dataByTimestamp.get(timestamp);

        // Parse payload (may be JSON string, object, or flat item)
        let parsed = item;
        if (typeof item.payload === "string") {
          try {
            parsed = JSON.parse(item.payload);
          } catch (_) {
            parsed = item;
          }
        } else if (typeof item.payload === "object") {
          parsed = item.payload;
        }

        const valueMap = {
          temperature: parsed.temp || parsed.temperature || item.value,
          moisture: parsed.moisture || item.value,
          humidity: parsed.humidity || item.value,
          battery: parsed.battery || item.value,
          light: parsed.light || item.value,
        };

        if (valueMap[label] != null) dp[label] = Number(valueMap[label]);
      });
    });

    // Sort and fill gaps with last-known values
    const chartData = Array.from(dataByTimestamp.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    const lastKnown = {
      moisture: null,
      temperature: null,
      humidity: null,
      light: null,
      battery: null,
    };
    chartData.forEach((dp) => {
      Object.keys(lastKnown).forEach((key) => {
        if (dp[key] != null && dp[key] !== 0) {
          lastKnown[key] = dp[key];
        } else if (lastKnown[key] != null) {
          dp[key] = lastKnown[key];
        }
      });
    });

    return chartData;
  } catch (error) {
    console.error("[Device] Error fetching all stream data:", error);
    throw error;
  }
};

/**
 * Fetch historical data for CSV export (legacy GET endpoint).
 * @param {string} deviceId
 * @returns {Promise<Array>}
 */
export const getHistoricalData = async (deviceId) => {
  try {
    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 1);

    const response = await api.get("/get-stream-data/device", {
      params: {
        deviceId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        pagination: 0,
        pageSize: 1000,
      },
    });

    return response.data.status === "Success" ? response.data.data : [];
  } catch (error) {
    console.error("[Device] History export error:", error.message);
    throw error;
  }
};

/**
 * Update device state via POST /update-state-details.
 *
 * @param {string} deviceId
 * @param {string} topic   - e.g. "pmc/pump", "pmc/mode"
 * @param {object} payload - Key-value pairs to send
 */
export const updateDeviceState = async (deviceId, topic, payload = {}) => {
  const requestBody = { deviceId, topic, payload };

  try {
    const response = await api.post("/update-state-details", requestBody);
    return response.data;
  } catch (error) {
    console.error(
      "[Device] Update state error:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * Send a pump ON/OFF command via HTTP API.
 *
 * @param {string} deviceId
 * @param {string} status        - "ON" or "OFF"
 * @param {string} topic         - Default "pmc/pump"
 * @param {string} mode          - "auto" or "manual"
 * @param {number|null} moistureValue - Current moisture (optional context)
 */
export const updatePumpStatus = async (
  deviceId,
  status,
  topic = "pmc/pump",
  mode = "auto",
  moistureValue = null,
) => {
  const payload = { pump: status.toLowerCase() };
  if (moistureValue != null) payload.moisture = moistureValue;
  return updateDeviceState(deviceId, topic, payload);
};

/**
 * Send a mode change (auto / manual) via HTTP API.
 *
 * @param {string} deviceId
 * @param {string} mode - "auto" or "manual"
 */
export const updateDeviceMode = async (deviceId, mode) => {
  return updateDeviceState(deviceId, "pmc/mode", { mode: mode.toLowerCase() });
};
