'use client'

import { memo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Check } from 'lucide-react'
import type { TagType } from './types'

interface TagButtonProps {
  tag: TagType
  isSelected: boolean
  onToggle: (id: string) => void
}

const TagButton = memo(function TagButton({
  tag,
  isSelected,
  onToggle,
}: TagButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tag.id)}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
        isSelected
          ? 'bg-zinc-900 text-white'
          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
      }`}
    >
      {tag.name}
      {isSelected && <Check className="w-3 h-3" />}
    </button>
  )
})

interface TagSelectorProps {
  tags: Set<string>
  availableTags: TagType[]
  newTag: string
  onNewTagChange: (value: string) => void
  onTagToggle: (id: string) => void
  onAddTag: () => void
}

export function TagSelector({
  tags,
  availableTags,
  newTag,
  onNewTagChange,
  onTagToggle,
  onAddTag,
}: TagSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <TagButton
            key={tag.id}
            tag={tag}
            isSelected={tags.has(tag.id)}
            onToggle={onTagToggle}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add a tag..."
          value={newTag}
          onChange={(e) => onNewTagChange(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && (e.preventDefault(), onAddTag())
          }
        />
        <button
          type="button"
          onClick={onAddTag}
          className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
