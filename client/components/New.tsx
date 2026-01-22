"use client"

import { useState } from "react";
import { X, CirclePlus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"


export function New({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const router = useRouter();
    const pathname = usePathname();

    const createClicked = () => {
        if (!inputValue.trim()) return;

        const newPath = `${pathname.replace(/\/$/, "")}/${encodeURIComponent(inputValue.trim())}`;
        setIsOpen(false);
        setInputValue("");
        router.push(newPath);
    };

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "bg-blue-600 text-white hover:bg-blue-700",
                    className
                )}

            >
                <CirclePlus size={16} />
                New
            </Button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-accent rounded shadow-lg w-full max-w-md p-4 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-lg font-semibold mb-4">Create New Path</h2>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Enter path..."
                            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={createClicked}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
