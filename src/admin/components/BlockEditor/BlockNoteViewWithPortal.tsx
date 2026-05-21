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

const PortalPopover = (props) => {
    const { open, onOpenChange, position, children, ...rest } = props;

    assertEmpty(rest);

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

const PreventBlurToolbarRoot = forwardRef((props, ref) => {
    return (
        <div
            onMouseDownCapture={(event) => {
                event.preventDefault();
            }}
            onPointerDownCapture={(event) => {
                event.preventDefault();
            }}
        >
            <components.FormattingToolbar.Root {...props} ref={ref} />
        </div>
    );
});

const FormTextInput = forwardRef((props, ref) => {
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
            onSubmit={onSubmit}
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

export const BlockNoteViewWithPortal = ({ className, theme, ...rest }) => {
    const existingContext = useBlockNoteContext();
    const systemColorScheme = usePrefersColorScheme();
    const defaultColorScheme =
        existingContext?.colorSchemePreference || systemColorScheme;

    const ref = useCallback(
        (node) => {
            if (!node) return;
            if (typeof theme === 'object') {
                if ('light' in theme && 'dark' in theme) {
                    applyBlockNoteCSSVariablesFromTheme(
                        theme[defaultColorScheme === 'dark' ? 'dark' : 'light'],
                        node,
                    );
                    return;
                }
                applyBlockNoteCSSVariablesFromTheme(theme, node);
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
        <ComponentsContext.Provider value={portalComponents}>
            <BlockNoteViewRaw
                data-mantine-color-scheme={finalTheme}
                className={`bn-mantine ${className || ''}`}
                theme={typeof theme === 'object' ? undefined : theme}
                {...rest}
                ref={ref}
            />
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
