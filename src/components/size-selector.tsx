"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface SizeSelectorProps {
  sizes: string[]
  selectedSize: string
  onSelectSize: (size: string) => void
}

export function SizeSelector({ sizes, selectedSize, onSelectSize }: SizeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="block">Quick Size Selection</Label>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <Button
            key={size}
            variant={selectedSize === size ? "default" : "outline"}
            onClick={() => onSelectSize(size)}
            className="w-16"
          >
            {size}
          </Button>
        ))}
      </div>
    </div>
  )
}

