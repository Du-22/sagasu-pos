import React from "react";
import Header from "../UI/Header";
import FloorTabs from "../UI/FloorTabs";
import SeatingArea from "./SeatingArea";

const SeatingPage = ({
  currentFloor,
  orders,
  takeoutOrders,
  onFloorChange,
  onTableClick,
  onTakeoutClick,
  onNewTakeout,
}) => (
  <div className="min-h-screen bg-gray-100">
    <Header title="XX點餐系統" subtitle="座位管理" />
    <FloorTabs currentFloor={currentFloor} onFloorChange={onFloorChange} />
    <SeatingArea
      currentFloor={currentFloor}
      orders={orders}
      takeoutOrders={takeoutOrders}
      onTableClick={onTableClick}
      onTakeoutClick={onTakeoutClick}
      onNewTakeout={onNewTakeout}
    />
  </div>
);

export default SeatingPage;
