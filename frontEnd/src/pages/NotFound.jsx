import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-dark-700 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-dark-200 mb-2">
          Page Not Found
        </h2>
        <p className="text-dark-500 mb-8 max-w-md mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button icon={Home} onClick={() => navigate("/")}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
