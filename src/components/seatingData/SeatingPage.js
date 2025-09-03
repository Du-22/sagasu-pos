import React from "react";
import Header from "../UI/Header";
import FloorTabs from "../UI/FloorTabs";
import SeatingArea from "./SeatingArea";
import Timer from "../UI/Timer";

const SeatingPage = ({
  currentFloor,
  orders,
  takeoutOrders,
  onFloorChange,
  onTableClick,
  timers,
  onTakeoutClick,
  onNewTakeout,
  onMenuSelect,
}) => (
  <div className="min-h-screen bg-gray-100 flex flex-col">
    <Header
      title="Sagasu POS系統"
      subtitle="座位管理"
      currentPage="seating"
      onMenuSelect={onMenuSelect}
    />

    <FloorTabs currentFloor={currentFloor} onFloorChange={onFloorChange} />
    <div className="mb-6"></div>
    <SeatingArea
      currentFloor={currentFloor}
      orders={orders}
      takeoutOrders={takeoutOrders}
      onTableClick={onTableClick}
      onTakeoutClick={onTakeoutClick}
      timers={timers}
      onNewTakeout={onNewTakeout}
    />
  </div>
);

export default SeatingPage;
