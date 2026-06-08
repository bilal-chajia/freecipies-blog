import {
    BlockNoteViewRaw,
    ComponentsContext,
    useBlockNoteContext,
    usePrefersColorScheme,
} from '@blocknote/react';
import { applyBlockNoteCSSVariablesFromTheme, components } from '@blocknote/mantine';
import { MantineContext, MantineProvider, Popover as MantinePopover, TextInput as MantineTextInput } from '@mantine/core';
import { assertEmpty, mergeCSSClasses } from '@blocknote/core';
import { Check } from 'lucide-react';
import React, { useCallback, useContext, forwardRef } from 'react';
import type { ChangeEventHandler, ComponentProps, FormEvent, KeyboardEventHandler, MouseEvent, ReactNode } from 'react';

type PortalPopoverProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    position?: ComponentProps<typeof MantinePopover>['position'];
    children?: ReactNode;
};

type FormTextInputProps = {
    className?: string;
    name?: string;
    label?: ReactNode;
    variant?: string;
    icon?: ReactNode;
    value?: string;
    autoFocus?: boolean;
    placeholder?: string;
    disabled?: boolean;
    onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    onSubmit?: (event: MouseEvent<HTMLButtonElement> | FormEvent<HTMLInputElement>) => void;
    autoComplete?: string;
    rightSection?: ReactNode;
};

type BlockNoteViewRawProps = ComponentProps<typeof BlockNoteViewRaw>;
type BlockNoteTheme = Parameters<typeof applyBlockNoteCSSVariablesFromTheme>[0];
type BlockNoteViewWithPortalProps = BlockNoteViewRawProps & {
    className?: string;
    theme?: BlockNoteViewRawProps['theme'] | BlockNoteTheme | { light: BlockNoteTheme; dark: BlockNoteTheme };
    placeholder?: string;
};

const PortalPopover = (props: PortalPopoverProps) => {
    const { open, onOpenChange, position, children, ...rest } = props;

    assertEmpty(rest as Record<string, never>);

    return (
        <MantinePopover
            middlewares={{ size: { padding: 20 } }}
            withinPortal
            opened={open}
            onChange={onOpenChange}
            position={position}
            zIndex={10000}
        >
            {children}
        </MantinePopover>
    );
};

const PreventBlurToolbarRoot = forwardRef<HTMLDivElement, ComponentProps<typeof components.FormattingToolbar.Root>>((props, ref) => {
    return (
        <div
            onMouseDownCapture={(event) => {
                event.preventDefault();
            }}
            onPointerDownCapture={(event) => {
                event.preventDefault();
            }}
        >
            <components.FormattingToolbar.Root {...props} />
        </div>
    );
});

const FormTextInput = forwardRef<HTMLInputElement, FormTextInputProps>((props, ref) => {
    const {
        className,
        name,
        label,
        variant,
        icon,
        value,
        autoFocus,
        placeholder,
        disabled,
        onKeyDown,
        onChange,
        onSubmit,
        autoComplete,
        rightSection,
        ...rest
    } = props;

    assertEmpty(rest);

    const isUrlField = name === 'url';
    const resolvedRightSection = isUrlField ? (
        <button
            type="button"
            className="bn-link-submit"
            aria-label="Apply link"
            title="Apply link"
            onMouseDown={(event) => {
                event.preventDefault();
            }}
            onPointerDown={(event) => {
                event.preventDefault();
            }}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (onSubmit) {
                    onSubmit(event);
                }
            }}
        >
            <Check className="bn-link-submit-icon" />
        </button>
    ) : (
        rightSection
    );

    return (
        <MantineTextInput
            size="xs"
            className={mergeCSSClasses(
                className || '',
                variant === 'large' ? 'bn-mt-input-large' : ''
            )}
            ref={ref}
            name={name}
            label={label}
            leftSection={icon}
            value={value}
            autoFocus={autoFocus}
            data-autofocus={autoFocus ? 'true' : undefined}
            rightSection={resolvedRightSection}
            placeholder={placeholder}
            disabled={disabled}
            onKeyDown={onKeyDown}
            onChange={onChange}
            onSubmit={onSubmit as ComponentProps<typeof MantineTextInput>['onSubmit']}
            autoComplete={autoComplete}
        />
    );
});

const portalComponents = {
    ...components,
    Generic: {
        ...components.Generic,
        Form: {
            ...components.Generic.Form,
            TextInput: FormTextInput,
        },
        Popover: {
            ...components.Generic.Popover,
            Root: PortalPopover,
        },
    },
    FormattingToolbar: {
        ...components.FormattingToolbar,
        Root: PreventBlurToolbarRoot,
    },
};

export const BlockNoteViewWithPortal = ({ className, theme, placeholder, ...rest }: BlockNoteViewWithPortalProps) => {
    const existingContext = useBlockNoteContext();
    const systemColorScheme = usePrefersColorScheme();
    const defaultColorScheme =
        existingContext?.colorSchemePreference || systemColorScheme;

    const ref = useCallback(
        (node: HTMLDivElement | null) => {
            if (!node) return;
            if (typeof theme === 'object') {
                if ('light' in theme && 'dark' in theme) {
                    const colorTheme = theme as { light: BlockNoteTheme; dark: BlockNoteTheme };
                    applyBlockNoteCSSVariablesFromTheme(
                        colorTheme[defaultColorScheme === 'dark' ? 'dark' : 'light'],
                        node,
                    );
                    return;
                }
                applyBlockNoteCSSVariablesFromTheme(theme as BlockNoteTheme, node);
            }
        },
        [defaultColorScheme, theme],
    );

    const mantineContext = useContext(MantineContext);
    const finalTheme =
        typeof theme === 'string'
            ? theme
            : defaultColorScheme !== 'no-preference'
                ? defaultColorScheme
                : 'light';

    const view = (
        <ComponentsContext.Provider value={portalComponents as ComponentProps<typeof ComponentsContext.Provider>['value']}>
            <div ref={ref}>
                <BlockNoteViewRaw
                    data-mantine-color-scheme={finalTheme}
                    className={`bn-mantine ${className || ''}`}
                    theme={typeof theme === 'object' ? undefined : theme}
                    {...rest}
                />
            </div>
        </ComponentsContext.Provider>
    );

    if (mantineContext) {
        return view;
    }

    return (
        <MantineProvider
            withCssVariables={false}
            getRootElement={() => undefined}
        >
            {view}
        </MantineProvider>
    );
};
