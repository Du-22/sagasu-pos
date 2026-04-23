import React from "react";

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText = "確認",
  cancelText = "取消",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-ivory rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-warm-olive mb-6">{message}</p>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-warm-sand rounded-lg hover:bg-parchment text-warm-charcoal"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-terracotta text-ivory rounded-lg hover:bg-terracotta-dark"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
