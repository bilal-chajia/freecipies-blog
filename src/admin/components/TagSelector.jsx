import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
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

export default function TagSelector({
    tags = [],
    selectedTags = [],
    onTagsChange,
    containerClassName,
    buttonClassName,
    popoverClassName,
    badgeClassName,
    useChips = false,
    searchPlaceholder = "Search tags..."
}) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("");

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

    const getTagColor = (tag) => {
        if (tag?.color) return tag.color;
        const style = tag?.style_json ?? tag?.styleJson ?? tag?.style;
        if (!style) return null;
        if (typeof style === 'string') {
            try {
                const parsed = JSON.parse(style);
                return parsed?.color || null;
            } catch {
                return null;
            }
        }
        return style?.color || null;
    };

    const chipSizeClass = badgeClassName || "px-2 py-1 text-xs";

    const filteredTags = useChips
        ? tags.filter((tag) =>
            tag.label?.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
        : tags;

    return (
        <div className={cn("space-y-3", containerClassName)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between", buttonClassName)}
                    >
                        {selectedTags.length > 0
                            ? `${selectedTags.length} tags selected`
                            : "Select tags..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={cn("w-[400px] p-0", popoverClassName)} align="start">
                    {useChips ? (
                        <div className="p-2">
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder={searchPlaceholder}
                                className="h-8 text-xs"
                            />
                            <div className="mt-2 max-h-[200px] overflow-y-auto flex flex-wrap gap-1">
                                {filteredTags.length === 0 ? (
                                    <div className="text-xs text-muted-foreground px-1 py-2">
                                        No tag found.
                                    </div>
                                ) : (
                                    filteredTags.map((tag) => {
                                        const isSelected = selectedTags.includes(tag.id);
                                        const tagColor = getTagColor(tag);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => handleSelect(tag.id)}
                                                className={cn(
                                                    "inline-flex items-center rounded-full border transition-colors",
                                                    chipSizeClass,
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-muted/60 text-foreground border-transparent hover:bg-muted"
                                                )}
                                                style={tagColor ? { borderColor: tagColor } : undefined}
                                            >
                                                {tag.label}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
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
                    )}
                </PopoverContent>
            </Popover>

            {/* Selected Tags Badges */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tagId => {
                        const tag = tags.find((item) => item.id === tagId);
                        const tagColor = getTagColor(tag);
                        return (
                            <Badge
                                key={tagId}
                                variant="secondary"
                                className={cn("px-2 py-1 gap-1", badgeClassName)}
                                style={tagColor ? { borderColor: tagColor } : undefined}
                            >
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
                        );
                    })}
                </div>
            )}
        </div>
    )
}
