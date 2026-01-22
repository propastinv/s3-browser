import React from "react";

interface LoaderProps {
    className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ className = "" }) => {
    return (
        <div
            className={`absolute inset-0 flex items-center justify-center z-50 ${className}`}
        >
            {/* Спиннер */}
            <div className="w-16 h-16 border-4 border-t-blue-500 border-b-transparent border-l-transparent border-r-transparent rounded-full animate-spin" />
        </div>
    );
};
