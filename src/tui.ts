type CheckboxChoice<T> = {
  value: T
  label: string
  checked?: boolean
  disabled?: boolean | string
}

export function requireTty(): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive install requires a TTY.')
  }
}

export async function checkboxPrompt<T>(options: {
  message: string
  choices: CheckboxChoice<T>[]
}): Promise<T[]> {
  const mod = (await import('@inquirer/prompts')) as unknown as {
    checkbox: (args: {
      message: string
      loop?: boolean
      choices: Array<{
        value: unknown
        name: string
        checked?: boolean
        disabled?: boolean | string
      }>
    }) => Promise<unknown[]>
  }

  const { checkbox } = mod
  const values = await checkbox({
    message: options.message,
    loop: false,
    choices: options.choices.map((choice) => ({
      value: choice.value as unknown,
      name: choice.label,
      checked: choice.checked,
      disabled: choice.disabled
    }))
  })

  return values as T[]
}
