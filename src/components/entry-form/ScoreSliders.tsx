'use client'

import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { DebouncedInput } from '@/components/ui/debounced-input'

interface ScoreSlidersProps {
  localPScore: number
  localLScore: number
  weight: string
  sliderHandlers: {
    pScore: {
      onChange: ([value]: number[]) => void
      onCommit: ([value]: number[]) => void
    }
    lScore: {
      onChange: ([value]: number[]) => void
      onCommit: ([value]: number[]) => void
    }
  }
  onWeightChange: (value: string) => void
}

export function ScoreSliders({
  localPScore,
  localLScore,
  weight,
  sliderHandlers,
  onWeightChange,
}: ScoreSlidersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>P Score</Label>
          <span className="text-sm font-medium text-zinc-600">
            {localPScore}/10
          </span>
        </div>
        <Slider
          value={[localPScore]}
          onValueChange={sliderHandlers.pScore.onChange}
          onValueCommit={sliderHandlers.pScore.onCommit}
          min={1}
          max={10}
          step={1}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>L Score</Label>
          <span className="text-sm font-medium text-zinc-600">
            {localLScore}/10
          </span>
        </div>
        <Slider
          value={[localLScore]}
          onValueChange={sliderHandlers.lScore.onChange}
          onValueCommit={sliderHandlers.lScore.onCommit}
          min={1}
          max={10}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="weight">Weight</Label>
        <DebouncedInput
          id="weight"
          type="number"
          step="0.1"
          placeholder="lbs"
          value={weight}
          onChange={onWeightChange}
        />
      </div>
    </div>
  )
}
