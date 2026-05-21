#!/usr/bin/env python3
"""Convert all @ts-nocheck UI components to strict TypeScript."""

import os
import re
import glob

UI_DIR = "src/admin/ui"

# Map of Radix primitives to their import names and component types
RADIX_MAP = {
    "@radix-ui/react-accordion": ("AccordionPrimitive", "AccordionPrimitive"),
    "@radix-ui/react-alert-dialog": ("AlertDialogPrimitive", "AlertDialogPrimitive"),
    "@radix-ui/react-aspect-ratio": ("AspectRatioPrimitive", "AspectRatioPrimitive"),
    "@radix-ui/react-avatar": ("AvatarPrimitive", "AvatarPrimitive"),
    "@radix-ui/react-checkbox": ("CheckboxPrimitive", "CheckboxPrimitive"),
    "@radix-ui/react-collapsible": ("CollapsiblePrimitive", "CollapsiblePrimitive"),
    "@radix-ui/react-context-menu": ("ContextMenuPrimitive", "ContextMenuPrimitive"),
    "@radix-ui/react-dialog": ("DialogPrimitive", "DialogPrimitive"),
    "@radix-ui/react-dropdown-menu": ("DropdownMenuPrimitive", "DropdownMenuPrimitive"),
    "@radix-ui/react-hover-card": ("HoverCardPrimitive", "HoverCardPrimitive"),
    "@radix-ui/react-label": ("LabelPrimitive", "LabelPrimitive"),
    "@radix-ui/react-menubar": ("MenubarPrimitive", "MenubarPrimitive"),
    "@radix-ui/react-navigation-menu": ("NavigationMenuPrimitive", "NavigationMenuPrimitive"),
    "@radix-ui/react-popover": ("PopoverPrimitive", "PopoverPrimitive"),
    "@radix-ui/react-progress": ("ProgressPrimitive", "ProgressPrimitive"),
    "@radix-ui/react-radio-group": ("RadioGroupPrimitive", "RadioGroupPrimitive"),
    "@radix-ui/react-scroll-area": ("ScrollAreaPrimitive", "ScrollAreaPrimitive"),
    "@radix-ui/react-select": ("SelectPrimitive", "SelectPrimitive"),
    "@radix-ui/react-separator": ("SeparatorPrimitive", "SeparatorPrimitive"),
    "@radix-ui/react-slider": ("SliderPrimitive", "SliderPrimitive"),
    "@radix-ui/react-slot": ("Slot", None),
    "@radix-ui/react-switch": ("SwitchPrimitive", "SwitchPrimitive"),
    "@radix-ui/react-tabs": ("TabsPrimitive", "TabsPrimitive"),
    "@radix-ui/react-tooltip": ("TooltipPrimitive", "TooltipPrimitive"),
    "@radix-ui/react-toggle": ("TogglePrimitive", "TogglePrimitive"),
    "@radix-ui/react-toggle-group": ("ToggleGroupPrimitive", "ToggleGroupPrimitive"),
    "@radix-ui/react-resizable": ("ResizablePrimitive", "ResizablePrimitive"),
}

# Map HTML tag names to their ComponentPropsWithoutRef types
HTML_TAG_TYPES = {
    "div": "React.ComponentPropsWithoutRef<\"div\">",
    "span": "React.ComponentPropsWithoutRef<\"span\">",
    "button": "React.ComponentPropsWithoutRef<\"button\">",
    "input": "React.ComponentPropsWithoutRef<\"input\">",
    "textarea": "React.ComponentPropsWithoutRef<\"textarea\">",
    "table": "React.ComponentPropsWithoutRef<\"table\">",
    "thead": "React.ComponentPropsWithoutRef<\"thead\">",
    "tbody": "React.ComponentPropsWithoutRef<\"tbody\">",
    "tr": "React.ComponentPropsWithoutRef<\"tr\">",
    "th": "React.ComponentPropsWithoutRef<\"th\">",
    "td": "React.ComponentPropsWithoutRef<\"td\">",
    "caption": "React.ComponentPropsWithoutRef<\"caption\">",
    "h3": "React.ComponentPropsWithoutRef<\"h3\">",
    "h4": "React.ComponentPropsWithoutRef<\"h4\">",
    "p": "React.ComponentPropsWithoutRef<\"p\">",
    "nav": "React.ComponentPropsWithoutRef<\"nav\">",
    "li": "React.ComponentPropsWithoutRef<\"li\">",
    "a": "React.ComponentPropsWithoutRef<\"a\">",
}

def find_first_html_tag(content, func_name):
    """Find the first HTML tag returned by a function."""
    # Look for return JSX element
    pattern = r'function\s+' + re.escape(func_name) + r'\s*\([^)]*\)\s*\{[^}]*(?:return\s*\(?\s*<([a-zA-Z][a-zA-Z0-9]*)|<([a-zA-Z][a-zA-Z0-9]*)\b)'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        tag = match.group(1) or match.group(2)
        if tag and tag in HTML_TAG_TYPES:
            return tag
    return "div"  # default

def get_radix_type(content, func_name):
    """Try to find the Radix primitive type for a component."""
    for import_path, (import_name, _) in RADIX_MAP.items():
        if import_name in content and import_name != "Slot":
            # Try to match function name to primitive component
            # e.g., Checkbox -> CheckboxPrimitive.Root or CheckboxPrimitive.Checkbox
            base = func_name.replace(import_name.replace("Primitive", ""), "").lower()
            # Common mappings
            primitive_name = None
            if "Root" in content.split(f"function {func_name}")[0].split(f"const {func_name}")[0][-200:]:
                primitive_name = f"{import_name}.Root"
            else:
                primitive_name = f"{import_name}.{func_name}"
            return f"React.ComponentPropsWithoutRef<typeof {primitive_name}>"
    return None

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "@ts-nocheck" not in content:
        return False  # already clean

    # Remove @ts-nocheck
    content = re.sub(r'\s*//\s*@ts-nocheck\s*\n', '\n', content)
    content = re.sub(r'//\s*@ts-nocheck\s*\n', '', content)

    # Find if it's a Radix-based component
    has_radix = any(k in content for k in RADIX_MAP.keys())

    # Replace function declarations with :any
    # Pattern: function Name({ ... }: any) {
    func_pattern = r'function\s+([A-Z][a-zA-Z0-9]*)\s*\(\s*\{([^}]*)\}\s*:\s*any\s*\)'

    def replace_func(match):
        func_name = match.group(1)
        params = match.group(2)

        if has_radix:
            # Try to find Radix primitive type
            for import_path, (import_name, _) in RADIX_MAP.items():
                if import_name in content:
                    # Map common component names to their Radix primitives
                    primitive_map = {
                        "Accordion": "AccordionPrimitive",
                        "AccordionItem": "AccordionPrimitive.Item",
                        "AccordionTrigger": "AccordionPrimitive.Trigger",
                        "AccordionContent": "AccordionPrimitive.Content",
                        "AlertDialog": "AlertDialogPrimitive.Root",
                        "AlertDialogTrigger": "AlertDialogPrimitive.Trigger",
                        "AlertDialogContent": "AlertDialogPrimitive.Content",
                        "AlertDialogTitle": "AlertDialogPrimitive.Title",
                        "AlertDialogDescription": "AlertDialogPrimitive.Description",
                        "AlertDialogAction": "AlertDialogPrimitive.Action",
                        "AlertDialogCancel": "AlertDialogPrimitive.Cancel",
                        "AlertDialogOverlay": "AlertDialogPrimitive.Overlay",
                        "AlertDialogHeader": None,  # custom div
                        "AlertDialogFooter": None,
                        "AspectRatio": "AspectRatioPrimitive.Root",
                        "Avatar": "AvatarPrimitive.Root",
                        "AvatarImage": "AvatarPrimitive.Image",
                        "AvatarFallback": "AvatarPrimitive.Fallback",
                        "Checkbox": "CheckboxPrimitive.Root",
                        "ContextMenu": "ContextMenuPrimitive.Root",
                        "ContextMenuTrigger": "ContextMenuPrimitive.Trigger",
                        "ContextMenuContent": "ContextMenuPrimitive.Content",
                        "ContextMenuItem": "ContextMenuPrimitive.Item",
                        "ContextMenuCheckboxItem": "ContextMenuPrimitive.CheckboxItem",
                        "ContextMenuRadioItem": "ContextMenuPrimitive.RadioItem",
                        "ContextMenuLabel": "ContextMenuPrimitive.Label",
                        "ContextMenuSeparator": "ContextMenuPrimitive.Separator",
                        "ContextMenuShortcut": None,
                        "ContextMenuGroup": "ContextMenuPrimitive.Group",
                        "ContextMenuPortal": "ContextMenuPrimitive.Portal",
                        "ContextMenuSub": "ContextMenuPrimitive.Sub",
                        "ContextMenuSubContent": "ContextMenuPrimitive.SubContent",
                        "ContextMenuSubTrigger": "ContextMenuPrimitive.SubTrigger",
                        "ContextMenuRadioGroup": "ContextMenuPrimitive.RadioGroup",
                        "HoverCard": "HoverCardPrimitive.Root",
                        "HoverCardTrigger": "HoverCardPrimitive.Trigger",
                        "HoverCardContent": "HoverCardPrimitive.Content",
                        "Label": "LabelPrimitive.Root",
                        "Menubar": "MenubarPrimitive.Root",
                        "MenubarMenu": "MenubarPrimitive.Menu",
                        "MenubarTrigger": "MenubarPrimitive.Trigger",
                        "MenubarContent": "MenubarPrimitive.Content",
                        "MenubarItem": "MenubarPrimitive.Item",
                        "MenubarCheckboxItem": "MenubarPrimitive.CheckboxItem",
                        "MenubarRadioItem": "MenubarPrimitive.RadioItem",
                        "MenubarLabel": "MenubarPrimitive.Label",
                        "MenubarSeparator": "MenubarPrimitive.Separator",
                        "MenubarShortcut": None,
                        "MenubarGroup": "MenubarPrimitive.Group",
                        "MenubarSub": "MenubarPrimitive.Sub",
                        "MenubarSubContent": "MenubarPrimitive.SubContent",
                        "MenubarSubTrigger": "MenubarPrimitive.SubTrigger",
                        "MenubarRadioGroup": "MenubarPrimitive.RadioGroup",
                        "NavigationMenu": "NavigationMenuPrimitive.Root",
                        "NavigationMenuList": "NavigationMenuPrimitive.List",
                        "NavigationMenuItem": "NavigationMenuPrimitive.Item",
                        "NavigationMenuTrigger": "NavigationMenuPrimitive.Trigger",
                        "NavigationMenuContent": "NavigationMenuPrimitive.Content",
                        "NavigationMenuLink": "NavigationMenuPrimitive.Link",
                        "NavigationMenuIndicator": "NavigationMenuPrimitive.Indicator",
                        "NavigationMenuViewport": "NavigationMenuPrimitive.Viewport",
                        "Progress": "ProgressPrimitive.Root",
                        "RadioGroup": "RadioGroupPrimitive.Root",
                        "RadioGroupItem": "RadioGroupPrimitive.Item",
                        "Separator": "SeparatorPrimitive.Root",
                        "Tabs": "TabsPrimitive.Root",
                        "TabsList": "TabsPrimitive.List",
                        "TabsTrigger": "TabsPrimitive.Trigger",
                        "TabsContent": "TabsPrimitive.Content",
                        "Toggle": "TogglePrimitive.Root",
                        "ToggleGroup": "ToggleGroupPrimitive.Root",
                        "ToggleGroupItem": "ToggleGroupPrimitive.Item",
                        "ResizablePanelGroup": "ResizablePrimitive.PanelGroup",
                        "ResizablePanel": "ResizablePrimitive.Panel",
                        "ResizableHandle": "ResizablePrimitive.Handle",
                    }

                    if func_name in primitive_map:
                        primitive = primitive_map[func_name]
                        if primitive is None:
                            # Custom component, use HTML type
                            tag = find_first_html_tag(content, func_name)
                            return f'function {func_name}({{"{params}"}}: {HTML_TAG_TYPES.get(tag, "React.ComponentPropsWithoutRef<\"div\">")})'
                        return f'function {func_name}({{"{params}"}}: React.ComponentPropsWithoutRef<typeof {primitive}>)'

        # Not Radix or custom wrapper - use HTML tag detection
        tag = find_first_html_tag(content, func_name)
        return f'function {func_name}({{"{params}"}}: {HTML_TAG_TYPES.get(tag, "React.ComponentPropsWithoutRef<\"div\">")})'

    new_content = re.sub(func_pattern, replace_func, content)

    # Handle the simpler pattern: function Name({ ...props }: any) {
    simple_pattern = r'function\s+([A-Z][a-zA-Z0-9]*)\s*\(\s*\{([^}]*)\}\s*:\s*any\s*\)'
    new_content = re.sub(simple_pattern, replace_func, new_content)

    # Handle empty params: function Name({ ...props }: any) -> already covered

    # Also handle: function Name({ ...props }: any)  with ...props
    props_pattern = r'function\s+([A-Z][a-zA-Z0-9]*)\s*\(\s*\{\s*\.\.\.props\s*\}\s*:\s*any\s*\)'
    def replace_props_only(match):
        func_name = match.group(1)
        if has_radix:
            for import_path, (import_name, _) in RADIX_MAP.items():
                if import_name in content:
                    primitive = f"{import_name}.Root"
                    return f'function {func_name}({{"...props"}}: React.ComponentPropsWithoutRef<typeof {primitive}>)'
        return f'function {func_name}({{"...props"}}: React.ComponentPropsWithoutRef<"div">)'

    new_content = re.sub(props_pattern, replace_props_only, new_content)

    # Clean up double newlines
    new_content = re.sub(r'\n{3,}', '\n\n', new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    files = sorted(glob.glob(f"{UI_DIR}/*.tsx"))
    converted = 0
    for filepath in files:
        if process_file(filepath):
            converted += 1
            print(f"Converted: {os.path.basename(filepath)}")
    print(f"\nTotal converted: {converted}")

if __name__ == "__main__":
    main()
