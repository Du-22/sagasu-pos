import React from "react";
import Header from "../UI/Header";
import FloorTabs from "../UI/FloorTabs";
import SeatingArea from "../UI/SeatingArea";

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
  onLogout,
}) => (
  <div className="min-h-screen bg-parchment flex flex-col">
    <Header
      title="Sagasu POS系統"
      subtitle="座位管理"
      currentPage="seating"
      onMenuSelect={onMenuSelect}
      onLogout={onLogout}
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
