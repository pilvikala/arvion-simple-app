import type { ReactNode } from 'react'
import { useState } from 'react'

type SplitButtonOption = {
    label: string
    // Placeholder; can be wired up later
    value: string
}

type SplitButtonProps = {
    label: ReactNode
    defaultValue?: string
    disabled?: boolean
    onClick: (value: string | undefined) => void
    options: SplitButtonOption[]
}

function SplitButton({ label, disabled, onClick, options, defaultValue }: SplitButtonProps) {
    const [open, setOpen] = useState(false)

    const handleMainClick = () => {
        if (disabled) return
        onClick(defaultValue)
    }

    const handleOptionClick = (option: SplitButtonOption) => {
        setOpen(false)
        onClick(option.value)
    }

    return (
        <div className="split-button">
            <button
                type="button"
                className="split-button-main"
                onClick={handleMainClick}
                disabled={disabled}
            >
                {label}
            </button>
            <button
                type="button"
                className="split-button-toggle"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
                disabled={disabled}
            >
                ▾
            </button>
            {open && !disabled && (
                <div className="split-button-menu" role="menu">
                    {options.map((option) => (
                        <button
                            key={String(option.label)}
                            type="button"
                            className="split-button-menu-item"
                            role="menuitem"
                            onClick={() => handleOptionClick(option)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default SplitButton


