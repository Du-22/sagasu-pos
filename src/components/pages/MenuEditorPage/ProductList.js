import React from "react";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";

/**
 * ProductList
 *
 * 原始程式碼：MenuEditorPage.js 行 819-871
 * 功能效果：可拖拉排序的商品列表，使用 @dnd-kit 實作
 * 用途：獨立商品列表 UI，包含 DnD 容器
 */
const ProductList = ({
  selectedCategory,
  currentCategoryItems,
  sensors,
  onDragEnd,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="mb-6 bg-ivory rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="font-bold flex items-center">
          <span className="mr-2">📋</span>
          產品列表 - {selectedCategory}
          <span className="ml-2 text-sm text-warm-stone">(拖拉調整順序)</span>
        </h3>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="p-4 min-h-[200px]">
          {currentCategoryItems.length === 0 ? (
            <div className="text-warm-stone text-center py-8">此類別暫無商品</div>
          ) : (
            <SortableContext
              items={currentCategoryItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {currentCategoryItems.map((item, index) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={index}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </DndContext>
    </div>
  );
};

export default ProductList;
