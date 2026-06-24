import { useCallback, useEffect, useState } from "react";
import {
  addCommonExpenseItem,
  addExpenseRecord,
  deleteCommonExpenseItem,
  deleteExpenseRecord,
  getCommonExpenseItems,
  getExpenseRecordsByDate,
  updateCommonExpenseItem,
} from "../firebase/expenses";
import { getMonthRange, getWeekRange } from "../utils/historyUtils";

const getDateRange = (selectedDate, viewMode) => {
  if (viewMode === "weekly") {
    return getWeekRange(selectedDate);
  }

  if (viewMode === "monthly") {
    return getMonthRange(selectedDate);
  }

  return {
    start: selectedDate,
    end: selectedDate,
  };
};

/**
 * useExpenseData Hook
 *
 * 功能效果：管理支出紀錄與常用原材料的 Firebase 讀寫
 * 使用範例：const expenseData = useExpenseData(selectedDate, viewMode)
 */
const useExpenseData = (selectedDate, viewMode) => {
  const [expenseRecords, setExpenseRecords] = useState([]);
  const [commonExpenseItems, setCommonExpenseItems] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseSaving, setExpenseSaving] = useState(false);

  const fetchExpenseRecords = useCallback(async () => {
    const range = getDateRange(selectedDate, viewMode);
    setExpenseLoading(true);

    try {
      const records = await getExpenseRecordsByDate(range.start, range.end);
      setExpenseRecords(records);
    } catch (error) {
      console.error("載入支出紀錄失敗:", error);
      setExpenseRecords([]);
      throw error;
    } finally {
      setExpenseLoading(false);
    }
  }, [selectedDate, viewMode]);

  const fetchCommonExpenseItems = useCallback(async () => {
    setExpenseLoading(true);

    try {
      const items = await getCommonExpenseItems();
      setCommonExpenseItems(items);
    } catch (error) {
      console.error("載入常用原材料失敗:", error);
      setCommonExpenseItems([]);
      throw error;
    } finally {
      setExpenseLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenseRecords().catch(() => {
      window.alert("支出紀錄載入失敗，請檢查網路後再試");
    });
  }, [fetchExpenseRecords]);

  useEffect(() => {
    fetchCommonExpenseItems().catch(() => {
      window.alert("常用原材料載入失敗，請檢查網路後再試");
    });
  }, [fetchCommonExpenseItems]);

  const runSavingTask = async (task) => {
    setExpenseSaving(true);
    try {
      await task();
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleAddExpenseRecord = async (record) => {
    await runSavingTask(async () => {
      await addExpenseRecord(record);
      await fetchExpenseRecords();
    });
  };

  const handleDeleteExpenseRecord = async (recordId) => {
    await runSavingTask(async () => {
      await deleteExpenseRecord(recordId);
      await fetchExpenseRecords();
    });
  };

  const handleAddCommonExpenseItem = async (item) => {
    await runSavingTask(async () => {
      await addCommonExpenseItem(item);
      await fetchCommonExpenseItems();
    });
  };

  const handleUpdateCommonExpenseItem = async (itemId, nextItem) => {
    await runSavingTask(async () => {
      await updateCommonExpenseItem(itemId, nextItem);
      await fetchCommonExpenseItems();
    });
  };

  const handleDeleteCommonExpenseItem = async (itemId) => {
    await runSavingTask(async () => {
      await deleteCommonExpenseItem(itemId);
      await fetchCommonExpenseItems();
    });
  };

  return {
    expenseRecords,
    commonExpenseItems,
    expenseLoading,
    expenseSaving,
    handleAddExpenseRecord,
    handleDeleteExpenseRecord,
    handleAddCommonExpenseItem,
    handleUpdateCommonExpenseItem,
    handleDeleteCommonExpenseItem,
  };
};

export default useExpenseData;
