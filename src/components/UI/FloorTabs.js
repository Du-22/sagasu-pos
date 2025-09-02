import React from "react";

const FloorTabs = ({ currentFloor, onFloorChange }) => (
  <div className="bg-white border-b">
    <div className="flex">
      {["1F", "2F"].map((floor) => (
        <button
          key={floor}
          onClick={() => onFloorChange(floor)}
          className={`px-6 py-3 font-medium border-r ${
            currentFloor === floor
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {floor}
        </button>
      ))}
    </div>
  </div>
);

export default FloorTabs;
