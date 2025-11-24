let activeSocket = null;

export const connectWebSocket = (jwt) => {
  // Close existing connection if it exists to prevent resource exhaustion
  if (activeSocket) {
    console.log("Closing previous WebSocket connection in service");
    activeSocket.close();
    activeSocket = null;
  }

  if (!jwt) {
    console.error("Cannot connect to WebSocket: No JWT token provided");
    return null;
  }

  console.log("JWT Token used for WebSocket:", jwt);

  // WebSocket URL with encoded token
  const wsUrl = `wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token=${encodeURIComponent(
    jwt
  )}`;

  try {
    const socket = new WebSocket(wsUrl);
    activeSocket = socket;

    socket.onopen = () => {
      console.log("WebSocket connection established successfully");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      if (activeSocket === socket) {
        activeSocket = null;
      }
    };

    return socket;
  } catch (error) {
    console.error("Failed to create WebSocket connection:", error);
    activeSocket = null;
    return null;
  }
};

export const disconnectWebSocket = () => {
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    console.log("Manually disconnecting WebSocket");
    activeSocket.close(1000, "Manual disconnect");
    activeSocket = null;
  }
};

export const isWebSocketConnected = () => {
  return activeSocket && activeSocket.readyState === WebSocket.OPEN;
};
