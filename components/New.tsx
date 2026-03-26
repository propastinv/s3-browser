"use client"

import { useState } from "react";
import { CirclePlus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
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
                className={cn(className)}
            >
                <CirclePlus className="size-4" />
                New
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Path</DialogTitle>
                    </DialogHeader>
                    <Input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Enter path..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                createClicked();
                            }
                        }}
                    />
                    <DialogFooter>
                        <Button onClick={createClicked}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
