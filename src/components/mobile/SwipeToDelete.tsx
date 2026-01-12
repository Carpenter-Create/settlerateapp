/**
 * SwipeToDelete — iOS-style swipe-to-reveal delete action
 * 
 * Design Standard (docs/MOBILE_STANDARD.md):
 * - Native iOS interaction pattern
 * - Swipe left to reveal destructive action
 * - Spring animation for natural feel
 * - Threshold-based action triggering
 * 
 * Usage:
 * - Comparisons list on mobile
 * - Any deletable list item on mobile
 */

import { useState, useRef, useCallback, ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeToDeleteProps {
  /** The content to display (should be the card/row) */
  children: ReactNode;
  /** Called when delete action is triggered */
  onDelete: () => void;
  /** Optional custom delete label */
  deleteLabel?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

const DELETE_THRESHOLD = 80; // pixels to trigger action reveal
const FULL_DELETE_WIDTH = 80; // width of delete action area

export function SwipeToDelete({
  children,
  onDelete,
  deleteLabel = "Delete",
  disabled = false,
  className,
}: SwipeToDeleteProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsSwiping(true);
  }, [disabled, translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = startXRef.current - currentX;
    
    // Calculate new position (negative = swiped left)
    let newTranslate = currentXRef.current - diff;
    
    // Clamp: can't swipe right beyond 0, and limit left swipe
    newTranslate = Math.min(0, Math.max(-FULL_DELETE_WIDTH * 1.5, newTranslate));
    
    setTranslateX(newTranslate);
  }, [disabled, isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;
    
    setIsSwiping(false);
    
    // Determine final state based on threshold
    if (translateX < -DELETE_THRESHOLD) {
      // Reveal delete button
      setTranslateX(-FULL_DELETE_WIDTH);
      setIsRevealed(true);
    } else {
      // Snap back
      setTranslateX(0);
      setIsRevealed(false);
    }
  }, [disabled, translateX]);

  const handleDeleteClick = useCallback(() => {
    if (disabled) return;
    onDelete();
  }, [disabled, onDelete]);

  const handleContentClick = useCallback(() => {
    // If revealed, close on tap
    if (isRevealed) {
      setTranslateX(0);
      setIsRevealed(false);
    }
  }, [isRevealed]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Delete action (behind content) */}
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: FULL_DELETE_WIDTH }}
      >
        <button
          onClick={handleDeleteClick}
          disabled={disabled}
          className={cn(
            "flex-1 flex items-center justify-center bg-destructive text-destructive-foreground",
            "transition-opacity duration-150",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={deleteLabel}
        >
          <Trash2 className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
      
      {/* Main content (slides left on swipe) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
        className={cn(
          "relative bg-background",
          !isSwiping && "transition-transform duration-200 ease-out"
        )}
        style={{ 
          transform: `translateX(${translateX}px)`,
          touchAction: "pan-y"
        }}
      >
        {children}
      </div>
    </div>
  );
}
