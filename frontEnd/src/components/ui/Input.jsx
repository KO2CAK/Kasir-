import React, { forwardRef } from "react";

const Input = forwardRef(
  (
    { label, error, icon: Icon, className = "", type = "text", ...props },
    ref,
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-4 w-4 text-dark-400" />
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={`
              w-full rounded-lg border bg-dark-800 text-dark-100
              placeholder-dark-500 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
              ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 text-sm
              ${
                error
                  ? "border-red-500 focus:ring-red-500/40 focus:border-red-500"
                  : "border-dark-600 hover:border-dark-500"
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
