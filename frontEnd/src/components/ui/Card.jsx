import React from "react";

const Card = ({ children, className = "", padding = true, ...props }) => {
  return (
    <div
      className={`
        bg-dark-800 border border-dark-700 rounded-xl
        ${padding ? "p-6" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = "" }) => {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = "" }) => {
  return (
    <h3 className={`text-lg font-semibold text-dark-100 ${className}`}>
      {children}
    </h3>
  );
};

const CardDescription = ({ children, className = "" }) => {
  return <p className={`text-sm text-dark-400 ${className}`}>{children}</p>;
};

const CardContent = ({ children, className = "" }) => {
  return <div className={className}>{children}</div>;
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;

export default Card;
