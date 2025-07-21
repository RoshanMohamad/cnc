"use client";

import { WebSocketStatus } from "@/components/WebSocketStatus";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">
        CNC Pro Studio - WebSocket Test
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">
          WebSocket Connection Status
        </h2>
        <WebSocketStatus />
      </div>

      <div className="mt-8 bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Debug Information</h3>
        <p>Check the browser console for WebSocket connection logs.</p>
        <p>The WebSocket server should be running on port 8080.</p>
      </div>
    </div>
  );
}
