import React from "react";

const FloorTabs = ({ currentFloor, onFloorChange }) => (
  <div className="bg-ivory border-b border-warm-cream">
    <div className="flex">
      {["1F", "2F"].map((floor) => (
        <button
          key={floor}
          onClick={() => onFloorChange(floor)}
          className={`px-6 py-3 font-medium border-r border-warm-cream transition-colors ${
            currentFloor === floor
              ? "bg-terracotta text-ivory"
              : "bg-ivory text-warm-charcoal hover:bg-parchment"
          }`}
        >
          {floor}
        </button>
      ))}
    </div>
  </div>
);

export default FloorTabs;
