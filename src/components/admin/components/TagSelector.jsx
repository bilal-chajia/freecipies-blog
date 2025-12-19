import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/ui/popover"
import { Badge } from "@/ui/badge"

export default function TagSelector({ tags = [], selectedTags = [], onTagsChange }) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (tagId) => {
        if (selectedTags.includes(tagId)) {
            onTagsChange(selectedTags.filter((id) => id !== tagId))
        } else {
            onTagsChange([...selectedTags, tagId])
        }
    };

    const getTagLabel = (id) => {
        const tag = tags.find(t => t.id === id);
        return tag ? tag.label : id;
    };

    return (
        <div className="space-y-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {selectedTags.length > 0
                            ? `${selectedTags.length} tags selected`
                            : "Select tags..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search tags..." />
                        <CommandList>
                            <CommandEmpty>No tag found.</CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                {tags.map((tag) => (
                                    <CommandItem
                                        key={tag.id}
                                        value={tag.label}
                                        onSelect={() => handleSelect(tag.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedTags.includes(tag.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {tag.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected Tags Badges */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tagId => (
                        <Badge key={tagId} variant="secondary" className="px-2 py-1 gap-1">
                            {getTagLabel(tagId)}
                            <button
                                className="ml-1 hover:text-destructive focus:outline-none rounded-full p-0.5"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSelect(tagId);
                                }}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
