// src/components/UI/Header.js
import React from "react";
import { ArrowLeft, Coffee } from "lucide-react";

const Header = ({ title, subtitle, showBackButton, onBackClick }) => (
  <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between">
    <div className="flex items-center space-x-4">
      {showBackButton && (
        <button
          onClick={onBackClick}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
    <div className="flex items-center space-x-2">
      {subtitle && (
        <>
          <Coffee className="w-5 h-5" />
          <span className="text-sm text-gray-600">{subtitle}</span>
        </>
      )}
    </div>
  </div>
);

export default Header;
