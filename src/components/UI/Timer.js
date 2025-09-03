import React, { useState, useEffect, useRef } from "react";

const Timer = ({ startTime, className = "" }) => {
  const [displayTime, setDisplayTime] = useState("00:00");
  const intervalRef = useRef(null);

  const calculateElapsedTime = (startTimestamp) => {
    if (!startTimestamp) return "00:00";

    const now = Date.now();
    const elapsed = Math.floor((now - startTimestamp) / 1000); // 總秒數

    const totalMinutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // 如果超過1小時，顯示 H:MM 格式
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}`;
    }
    // 否則顯示 MM:SS 格式
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!startTime) return;
    const updateTimer = () => {
      const elapsed = calculateElapsedTime(startTime);
      setDisplayTime(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [startTime]);

  // 只依賴 startTime
  if (!startTime) {
    return null;
  }

  return (
    <div
      className={`text-xs font-mono bg-gray-100 px-2 py-1 rounded ${className}`}
    >
      {displayTime}
    </div>
  );
};

export default Timer;
